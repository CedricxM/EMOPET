import { and, asc, gte, lt } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { securityAuditEvents } from '../../db/schema/index.js';
import {
  evaluateSecurityAnomalies,
  type SecurityDetection,
} from './security-anomaly-detection.js';
import {
  parseSecurityAuditEvent,
  type SecurityAuditEvent,
} from './security-audit-event.js';
import {
  mapSecurityDetectionEvidence,
  type SecurityDetectionEvidence,
} from './security-detection-history.js';

export const SECURITY_DETECTION_RUNTIME_SCHEMA_VERSION =
  'security-detection-runtime-v1' as const;

/**
 * Technical resource ceiling only.
 *
 * This is not a security detection threshold or production risk-policy value.
 * Every scan must still supply a lower/equal explicit maxEvents value.
 */
export const SECURITY_DETECTION_SCAN_HARD_CAP = 10_000;

const REQUEST_KEYS = Object.freeze([
  'schemaVersion',
  'policyRevision',
  'windowStart',
  'windowEnd',
  'maxEvents',
  'policy',
]);

const POLICY_REVISION_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

interface ParsedRuntimeRequest {
  schemaVersion: typeof SECURITY_DETECTION_RUNTIME_SCHEMA_VERSION;
  policyRevision: string;
  windowStart: string;
  windowEnd: string;
  maxEvents: number;
  policy: unknown;
}

export type SecurityDetectionRuntimeResult =
  | {
      status: 'INVALID_REQUEST';
      detections: readonly [];
    }
  | {
      status: 'INVALID_POLICY';
      detections: readonly [];
    }
  | {
      status: 'SOURCE_UNAVAILABLE';
      retryable: true;
      detections: readonly [];
    }
  | {
      status: 'SOURCE_INVALID';
      retryable: false;
      detections: readonly [];
    }
  | {
      status: 'EVENT_LIMIT_EXCEEDED';
      retryable: false;
      policyRevision: string;
      windowStart: string;
      windowEnd: string;
      maxEvents: number;
      detections: readonly [];
    }
  | {
      status: 'EVALUATED';
      policyRevision: string;
      windowStart: string;
      windowEnd: string;
      eventCount: number;
      evaluatedEventIds: readonly string[];
      detections: readonly SecurityDetection[];
      detectionEvidence: readonly SecurityDetectionEvidence[];
    };

export interface SecurityDetectionRuntimeSummary {
  status: SecurityDetectionRuntimeResult['status'];
  policyRevision?: string;
  windowStart?: string;
  windowEnd?: string;
  eventCount?: number;
  maxEvents?: number;
  detectionCount: number;
  detectionTypes: Readonly<{
    repeated_privileged_denials: number;
    rapid_multi_target_access: number;
    machine_privileged_authority_attempt: number;
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function canonicalUtcTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value.endsWith('Z')) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function parseRuntimeRequest(input: unknown):
  | { ok: true; value: ParsedRuntimeRequest }
  | { ok: false; error: 'INVALID_REQUEST' | 'INVALID_POLICY' } {
  if (!isRecord(input) || !hasOnlyKeys(input, REQUEST_KEYS)) {
    return { ok: false, error: 'INVALID_REQUEST' };
  }

  if (input.schemaVersion !== SECURITY_DETECTION_RUNTIME_SCHEMA_VERSION) {
    return { ok: false, error: 'INVALID_REQUEST' };
  }

  if (
    typeof input.policyRevision !== 'string'
    || !POLICY_REVISION_RE.test(input.policyRevision)
  ) {
    return { ok: false, error: 'INVALID_REQUEST' };
  }

  const windowStart = canonicalUtcTimestamp(input.windowStart);
  const windowEnd = canonicalUtcTimestamp(input.windowEnd);
  if (!windowStart || !windowEnd || Date.parse(windowEnd) <= Date.parse(windowStart)) {
    return { ok: false, error: 'INVALID_REQUEST' };
  }

  if (
    typeof input.maxEvents !== 'number'
    || !Number.isSafeInteger(input.maxEvents)
    || input.maxEvents < 1
    || input.maxEvents > SECURITY_DETECTION_SCAN_HARD_CAP
  ) {
    return { ok: false, error: 'INVALID_REQUEST' };
  }

  const policyCheck = evaluateSecurityAnomalies([], input.policy);
  if (policyCheck.status !== 'EVALUATED') {
    return { ok: false, error: 'INVALID_POLICY' };
  }

  return {
    ok: true,
    value: {
      schemaVersion: SECURITY_DETECTION_RUNTIME_SCHEMA_VERSION,
      policyRevision: input.policyRevision,
      windowStart,
      windowEnd,
      maxEvents: input.maxEvents,
      policy: input.policy,
    },
  };
}

function rowToCanonicalEvent(
  row: typeof securityAuditEvents.$inferSelect,
): SecurityAuditEvent | null {
  return parseSecurityAuditEvent({
    eventType: row.eventType,
    occurredAt: row.occurredAt.toISOString(),
    actor: {
      kind: row.actorKind,
      subject: row.actorSubject,
      role: row.actorRole,
    },
    action: row.action,
    target: {
      scope: row.targetScope,
      ref: row.targetRef,
    },
    outcome: row.outcome,
    reason: row.reason,
  });
}

/**
 * Execute one bounded anomaly-evaluation scan over the canonical durable audit
 * table. This is an internal service, not an HTTP/read-history API.
 *
 * No production schedule, threshold/window defaults or delivery channel are
 * selected here. The caller must provide the complete detector policy and scan
 * window for every invocation. Scan windows are half-open [start, end) so
 * adjacent scheduled runs cannot double-count an event exactly on a boundary.
 */
export async function runSecurityDetectionScan(
  input: unknown,
): Promise<SecurityDetectionRuntimeResult> {
  const parsed = parseRuntimeRequest(input);
  if (!parsed.ok) {
    return {
      status: parsed.error,
      detections: [],
    };
  }

  const request = parsed.value;
  let rows: Array<typeof securityAuditEvents.$inferSelect>;

  try {
    rows = await db
      .select()
      .from(securityAuditEvents)
      .where(and(
        gte(securityAuditEvents.occurredAt, new Date(request.windowStart)),
        lt(securityAuditEvents.occurredAt, new Date(request.windowEnd)),
      ))
      .orderBy(
        asc(securityAuditEvents.occurredAt),
        asc(securityAuditEvents.id),
      )
      .limit(request.maxEvents + 1);
  } catch {
    return {
      status: 'SOURCE_UNAVAILABLE',
      retryable: true,
      detections: [],
    };
  }

  if (rows.length > request.maxEvents) {
    return {
      status: 'EVENT_LIMIT_EXCEEDED',
      retryable: false,
      policyRevision: request.policyRevision,
      windowStart: request.windowStart,
      windowEnd: request.windowEnd,
      maxEvents: request.maxEvents,
      detections: [],
    };
  }

  const events: SecurityAuditEvent[] = [];
  const evaluatedEventIds: string[] = [];
  const detectorInputs: unknown[] = [];

  for (const row of rows) {
    const event = rowToCanonicalEvent(row);
    if (!event) {
      return {
        status: 'SOURCE_INVALID',
        retryable: false,
        detections: [],
      };
    }

    events.push(event);
    evaluatedEventIds.push(row.id);

    // parseSecurityAuditEvent() returns the canonical stored/domain object with
    // schemaVersion attached. The existing anomaly evaluator deliberately owns
    // its own input parsing and accepts the wire/input shape without that
    // derived field. Strip only the derived schemaVersion before handing the
    // already source-validated event to the unchanged canonical detector.
    const {
      schemaVersion: _schemaVersion,
      ...detectorInput
    } = event;
    detectorInputs.push(detectorInput);
  }

  const evaluated = evaluateSecurityAnomalies(detectorInputs, request.policy);
  if (evaluated.status !== 'EVALUATED') {
    // Defensive parity with pre-query validation. Never reinterpret a policy
    // failure as a successful empty evaluation.
    return {
      status: 'INVALID_POLICY',
      detections: [],
    };
  }

  const detectionEvidence = mapSecurityDetectionEvidence(
    rows.map((row, index) => ({
      id: row.id,
      event: events[index]!,
    })),
    evaluated.detections,
  );

  if (detectionEvidence === null) {
    return {
      status: 'SOURCE_INVALID',
      retryable: false,
      detections: [],
    };
  }

  return {
    status: 'EVALUATED',
    policyRevision: request.policyRevision,
    windowStart: request.windowStart,
    windowEnd: request.windowEnd,
    eventCount: events.length,
    evaluatedEventIds,
    detections: evaluated.detections,
    detectionEvidence,
  };
}

/**
 * Worker-safe summary. Actor keys and target references never leave this
 * boundary through stdout merely because the one-shot worker was executed.
 */
export function summarizeSecurityDetectionRuntimeResult(
  result: SecurityDetectionRuntimeResult,
): SecurityDetectionRuntimeSummary {
  const detectionTypes = {
    repeated_privileged_denials: 0,
    rapid_multi_target_access: 0,
    machine_privileged_authority_attempt: 0,
  };

  if (result.status === 'EVALUATED') {
    for (const detection of result.detections) {
      detectionTypes[detection.type] += 1;
    }

    return {
      status: result.status,
      policyRevision: result.policyRevision,
      windowStart: result.windowStart,
      windowEnd: result.windowEnd,
      eventCount: result.eventCount,
      detectionCount: result.detections.length,
      detectionTypes,
    };
  }

  if (result.status === 'EVENT_LIMIT_EXCEEDED') {
    return {
      status: result.status,
      policyRevision: result.policyRevision,
      windowStart: result.windowStart,
      windowEnd: result.windowEnd,
      maxEvents: result.maxEvents,
      detectionCount: 0,
      detectionTypes,
    };
  }

  return {
    status: result.status,
    detectionCount: 0,
    detectionTypes,
  };
}
