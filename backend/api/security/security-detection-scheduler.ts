import { and, asc, eq, gte, isNull, lt, sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
  securityAuditEvents,
  securityDetectionEvaluatedEvents,
  securityDetectionHistory,
  securityDetectionHistoryEvents,
  securityDetectionSchedulerState,
} from '../../db/schema/index.js';
import { securityDetectionContextWindowSeconds } from './security-anomaly-detection.js';
import {
  buildSecurityDetectionHistoryRecords,
  type SecurityDetectionHistoryRecord,
} from './security-detection-history.js';
import {
  SECURITY_DETECTION_SCAN_HARD_CAP,
  runSecurityDetectionScan,
  summarizeSecurityDetectionRuntimeResult,
  type SecurityDetectionRuntimeSummary,
} from './security-detection-runtime.js';

export const SECURITY_DETECTION_SCHEDULER_SCHEMA_VERSION =
  'security-detection-scheduler-v1' as const;
export const SECURITY_DETECTION_STREAM_ID = 'security-audit-v1' as const;

const REQUEST_KEYS = Object.freeze([
  'schemaVersion',
  'policyRevision',
  'initialWindowStart',
  'maxEvents',
  'policy',
]);

const POLICY_REVISION_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

interface SchedulerRequest {
  schemaVersion: typeof SECURITY_DETECTION_SCHEDULER_SCHEMA_VERSION;
  policyRevision: string;
  initialWindowStart: string | null;
  maxEvents: number;
  policy: unknown;
}

export type SecurityDetectionSchedulerTickResult =
  | { status: 'INVALID_REQUEST'; cursorAdvanced: false }
  | { status: 'INITIAL_CURSOR_REQUIRED'; cursorAdvanced: false }
  | { status: 'BUSY'; cursorAdvanced: false }
  | { status: 'WINDOW_NOT_READY'; cursorAdvanced: false; windowStart: string; windowEnd: string }
  | {
      status: 'SCAN_FAILED';
      cursorAdvanced: false;
      windowStart: string;
      windowEnd: string;
      scan: SecurityDetectionRuntimeSummary;
    }
  | {
      status: 'LATE_EVENT_LIMIT_EXCEEDED';
      cursorAdvanced: false;
      windowStart: string;
      windowEnd: string;
      maxEvents: number;
    }
  | {
      status: 'LATE_SCAN_FAILED';
      cursorAdvanced: false;
      windowStart: string;
      windowEnd: string;
      scan: SecurityDetectionRuntimeSummary;
    }
  | {
      status: 'EVALUATED';
      cursorAdvanced: true;
      windowStart: string;
      windowEnd: string;
      eventCount: number;
      detectionCount: number;
      detectionTypes: SecurityDetectionRuntimeSummary['detectionTypes'];
      lateEventCount: number;
      lateReevaluationDetectionCount: number;
      policyRevision: string;
    }
  | { status: 'SCHEDULER_UNAVAILABLE'; cursorAdvanced: false; retryable: true };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function canonicalUtcTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || !value.endsWith('Z')) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function parseRequest(input: unknown): SchedulerRequest | null {
  if (!isRecord(input) || !hasOnlyKeys(input, REQUEST_KEYS)) return null;
  if (input.schemaVersion !== SECURITY_DETECTION_SCHEDULER_SCHEMA_VERSION) return null;
  if (
    typeof input.policyRevision !== 'string'
    || !POLICY_REVISION_RE.test(input.policyRevision)
  ) {
    return null;
  }

  const initialWindowStart = input.initialWindowStart == null
    ? null
    : canonicalUtcTimestamp(input.initialWindowStart);
  if (input.initialWindowStart != null && !initialWindowStart) return null;

  if (
    typeof input.maxEvents !== 'number'
    || !Number.isSafeInteger(input.maxEvents)
    || input.maxEvents < 1
    || input.maxEvents > SECURITY_DETECTION_SCAN_HARD_CAP
  ) {
    return null;
  }

  if (!Object.prototype.hasOwnProperty.call(input, 'policy')) return null;

  return {
    schemaVersion: SECURITY_DETECTION_SCHEDULER_SCHEMA_VERSION,
    policyRevision: input.policyRevision,
    initialWindowStart,
    maxEvents: input.maxEvents,
    policy: input.policy,
  };
}

function dateFromUnknown(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  return null;
}

/**
 * Execute one serialized, restart-safe scheduler tick.
 *
 * The PostgreSQL transaction holds a transaction-scoped advisory lock while
 * the existing canonical detector scans the half-open interval. The durable
 * cursor advances only after an EVALUATED result. Failed scans are retried by
 * a later invocation from the same cursor boundary.
 *
 * Deployment cadence and production detector thresholds remain external/open.
 */
export async function runSecurityDetectionSchedulerTick(
  input: unknown,
): Promise<SecurityDetectionSchedulerTickResult> {
  const request = parseRequest(input);
  if (!request) {
    return { status: 'INVALID_REQUEST', cursorAdvanced: false };
  }

  try {
    return await db.transaction(async (tx): Promise<SecurityDetectionSchedulerTickResult> => {
      const lockRows = await tx.execute(sql`
        SELECT pg_try_advisory_xact_lock(
          hashtextextended(${SECURITY_DETECTION_STREAM_ID}, 0)
        ) AS acquired
      `);
      const acquired = (lockRows[0] as { acquired?: unknown } | undefined)?.acquired === true;
      if (!acquired) {
        return { status: 'BUSY', cursorAdvanced: false };
      }

      const nowRows = await tx.execute(sql`SELECT CURRENT_TIMESTAMP AS now`);
      const databaseNow = dateFromUnknown(
        (nowRows[0] as { now?: unknown } | undefined)?.now,
      );
      if (!databaseNow) {
        return {
          status: 'SCHEDULER_UNAVAILABLE',
          cursorAdvanced: false,
          retryable: true,
        };
      }

      const [cursor] = await tx
        .select({
          monitoringStartedAt:
            securityDetectionSchedulerState.monitoringStartedAt,
          lastSuccessfulWindowEnd:
            securityDetectionSchedulerState.lastSuccessfulWindowEnd,
        })
        .from(securityDetectionSchedulerState)
        .where(eq(
          securityDetectionSchedulerState.streamId,
          SECURITY_DETECTION_STREAM_ID,
        ))
        .limit(1);

      const windowStart = cursor?.lastSuccessfulWindowEnd.toISOString()
        ?? request.initialWindowStart;
      if (!windowStart) {
        return { status: 'INITIAL_CURSOR_REQUIRED', cursorAdvanced: false };
      }

      const monitoringStartedAt = cursor?.monitoringStartedAt
        ?? new Date(windowStart);

      const windowEnd = databaseNow.toISOString();
      if (Date.parse(windowEnd) <= Date.parse(windowStart)) {
        return {
          status: 'WINDOW_NOT_READY',
          cursorAdvanced: false,
          windowStart,
          windowEnd,
        };
      }

      const scan = await runSecurityDetectionScan({
        schemaVersion: 'security-detection-runtime-v1',
        policyRevision: request.policyRevision,
        windowStart,
        windowEnd,
        maxEvents: request.maxEvents,
        policy: request.policy,
      });
      const summary = summarizeSecurityDetectionRuntimeResult(scan);

      if (scan.status !== 'EVALUATED') {
        return {
          status: 'SCAN_FAILED',
          cursorAdvanced: false,
          windowStart,
          windowEnd,
          scan: summary,
        };
      }

      let historyRecords: SecurityDetectionHistoryRecord[] = [
        ...buildSecurityDetectionHistoryRecords({
          policyRevision: scan.policyRevision,
          evaluationWindowStart: scan.windowStart,
          evaluationWindowEnd: scan.windowEnd,
          evidence: scan.detectionEvidence,
        }),
      ];

      const lateRows = await tx
        .select({
          id: securityAuditEvents.id,
          occurredAt: securityAuditEvents.occurredAt,
        })
        .from(securityAuditEvents)
        .leftJoin(
          securityDetectionEvaluatedEvents,
          eq(
            securityDetectionEvaluatedEvents.auditEventId,
            securityAuditEvents.id,
          ),
        )
        .where(and(
          isNull(securityDetectionEvaluatedEvents.auditEventId),
          gte(securityAuditEvents.occurredAt, monitoringStartedAt),
          lt(securityAuditEvents.occurredAt, new Date(windowStart)),
        ))
        .orderBy(
          asc(securityAuditEvents.occurredAt),
          asc(securityAuditEvents.id),
        )
        .limit(request.maxEvents + 1);

      if (lateRows.length > request.maxEvents) {
        return {
          status: 'LATE_EVENT_LIMIT_EXCEEDED',
          cursorAdvanced: false,
          windowStart,
          windowEnd,
          maxEvents: request.maxEvents,
        };
      }

      let lateReevaluationDetectionCount = 0;

      if (lateRows.length > 0) {
        const contextWindowSeconds =
          securityDetectionContextWindowSeconds(request.policy);
        if (contextWindowSeconds === null) {
          return {
            status: 'LATE_SCAN_FAILED',
            cursorAdvanced: false,
            windowStart,
            windowEnd,
            scan: {
              status: 'INVALID_POLICY',
              detectionCount: 0,
              detectionTypes: {
                repeated_privileged_denials: 0,
                rapid_multi_target_access: 0,
                machine_privileged_authority_attempt: 0,
              },
            },
          };
        }

        const firstLate = lateRows[0];
        const lastLate = lateRows[lateRows.length - 1];
        if (!firstLate || !lastLate) {
          return {
            status: 'SCHEDULER_UNAVAILABLE',
            cursorAdvanced: false,
            retryable: true,
          };
        }

        const contextWindowMs = contextWindowSeconds * 1000;
        const contextStartMs = Math.max(
          monitoringStartedAt.getTime(),
          firstLate.occurredAt.getTime() - contextWindowMs,
        );
        const contextEndMs = Math.min(
          databaseNow.getTime(),
          lastLate.occurredAt.getTime() + contextWindowMs + 1,
        );

        const lateScan = await runSecurityDetectionScan({
          schemaVersion: 'security-detection-runtime-v1',
          policyRevision: request.policyRevision,
          windowStart: new Date(contextStartMs).toISOString(),
          windowEnd: new Date(contextEndMs).toISOString(),
          maxEvents: request.maxEvents,
          policy: request.policy,
        });
        const lateSummary = summarizeSecurityDetectionRuntimeResult(lateScan);

        if (lateScan.status !== 'EVALUATED') {
          return {
            status: 'LATE_SCAN_FAILED',
            cursorAdvanced: false,
            windowStart,
            windowEnd,
            scan: lateSummary,
          };
        }

        lateReevaluationDetectionCount = lateSummary.detectionCount;
        historyRecords.push(
          ...buildSecurityDetectionHistoryRecords({
            policyRevision: lateScan.policyRevision,
            evaluationWindowStart: lateScan.windowStart,
            evaluationWindowEnd: lateScan.windowEnd,
            evidence: lateScan.detectionEvidence,
          }),
        );
      }

      const uniqueHistoryRecords = [
        ...new Map(
          historyRecords.map((record) => [record.dedupeKey, record] as const),
        ).values(),
      ];

      for (const record of uniqueHistoryRecords) {
        const [created] = await tx
          .insert(securityDetectionHistory)
          .values({
            dedupeKey: record.dedupeKey,
            detectorType: record.detectorType,
            policyRevision: record.policyRevision,
            evaluationWindowStart: new Date(record.evaluationWindowStart),
            evaluationWindowEnd: new Date(record.evaluationWindowEnd),
            recordedAt: databaseNow,
            eventCount: record.eventCount,
            uniqueTargetCount: record.uniqueTargetCount,
          })
          .onConflictDoNothing({
            target: securityDetectionHistory.dedupeKey,
          })
          .returning({
            detectionId: securityDetectionHistory.detectionId,
          });

        let detectionId = created?.detectionId;

        if (!detectionId) {
          const [existing] = await tx
            .select({
              detectionId: securityDetectionHistory.detectionId,
              detectorType: securityDetectionHistory.detectorType,
              policyRevision: securityDetectionHistory.policyRevision,
              eventCount: securityDetectionHistory.eventCount,
              uniqueTargetCount: securityDetectionHistory.uniqueTargetCount,
            })
            .from(securityDetectionHistory)
            .where(eq(securityDetectionHistory.dedupeKey, record.dedupeKey))
            .limit(1);

          if (
            !existing
            || existing.detectorType !== record.detectorType
            || existing.policyRevision !== record.policyRevision
            || existing.eventCount !== record.eventCount
            || existing.uniqueTargetCount !== record.uniqueTargetCount
          ) {
            throw new Error('security detection history idempotency conflict');
          }

          detectionId = existing.detectionId;
        }

        if (record.sourceEventIds.length === 0) {
          throw new Error('security detection history requires source evidence');
        }

        await tx
          .insert(securityDetectionHistoryEvents)
          .values(record.sourceEventIds.map((auditEventId) => ({
            detectionId,
            auditEventId,
          })))
          .onConflictDoNothing({
            target: [
              securityDetectionHistoryEvents.detectionId,
              securityDetectionHistoryEvents.auditEventId,
            ],
          });

        const persistedEvidence = await tx
          .select({
            auditEventId: securityDetectionHistoryEvents.auditEventId,
          })
          .from(securityDetectionHistoryEvents)
          .where(eq(
            securityDetectionHistoryEvents.detectionId,
            detectionId,
          ));

        const persistedIds = persistedEvidence
          .map((row) => row.auditEventId)
          .sort();

        if (
          persistedIds.length !== record.sourceEventIds.length
          || persistedIds.some(
            (id, index) => id !== record.sourceEventIds[index],
          )
        ) {
          throw new Error('security detection history evidence conflict');
        }
      }

      const evaluatedIds = [
        ...scan.evaluatedEventIds,
        ...lateRows.map((row) => row.id),
      ];
      const uniqueEvaluatedIds = [...new Set(evaluatedIds)];

      if (uniqueEvaluatedIds.length > 0) {
        await tx
          .insert(securityDetectionEvaluatedEvents)
          .values(uniqueEvaluatedIds.map((auditEventId) => ({
            auditEventId,
            evaluatedAt: databaseNow,
          })))
          .onConflictDoNothing({
            target: securityDetectionEvaluatedEvents.auditEventId,
          });
      }

      await tx
        .insert(securityDetectionSchedulerState)
        .values({
          streamId: SECURITY_DETECTION_STREAM_ID,
          monitoringStartedAt,
          lastSuccessfulWindowEnd: databaseNow,
          updatedAt: databaseNow,
        })
        .onConflictDoUpdate({
          target: securityDetectionSchedulerState.streamId,
          set: {
            lastSuccessfulWindowEnd: databaseNow,
            updatedAt: databaseNow,
          },
        });

      return {
        status: 'EVALUATED',
        cursorAdvanced: true,
        windowStart,
        windowEnd,
        eventCount: scan.eventCount,
        detectionCount: summary.detectionCount,
        detectionTypes: summary.detectionTypes,
        lateEventCount: lateRows.length,
        lateReevaluationDetectionCount,
        policyRevision: scan.policyRevision,
      };
    });
  } catch {
    return {
      status: 'SCHEDULER_UNAVAILABLE',
      cursorAdvanced: false,
      retryable: true,
    };
  }
}
