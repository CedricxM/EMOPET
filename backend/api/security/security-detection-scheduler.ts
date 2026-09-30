import { eq, sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { securityDetectionSchedulerState } from '../../db/schema/index.js';
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
      status: 'EVALUATED';
      cursorAdvanced: true;
      windowStart: string;
      windowEnd: string;
      eventCount: number;
      detectionCount: number;
      detectionTypes: SecurityDetectionRuntimeSummary['detectionTypes'];
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

      await tx
        .insert(securityDetectionSchedulerState)
        .values({
          streamId: SECURITY_DETECTION_STREAM_ID,
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
