import { and, eq } from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
  securityAlertDeliveryAttempts,
  securityAlertOutbox,
  securityDetectionHistory,
} from '../../db/schema/index.js';
import {
  parseSecurityAlertDeliveryEnvelope,
  type SecurityAlertDeliveryEnvelope,
} from './security-alert-delivery.js';
import {
  createSecurityAlertDeliveryAttempt,
  resolveSecurityAlertDeliveryAttempt,
  SECURITY_ALERT_DELIVERY_ATTEMPT_SCHEMA_VERSION,
  type SecurityAlertDeliveryAttempt,
} from './security-alert-delivery-attempt.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POLICY_REVISION_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

export interface SecurityAlertOutboxRecord {
  alertId: string;
  routingPolicyRevision: string;
  envelope: SecurityAlertDeliveryEnvelope;
  createdAt: string;
}

export type SecurityAlertOutboxPersistResult =
  | { status: 'ENQUEUED' | 'DEDUPED'; record: SecurityAlertOutboxRecord }
  | {
      status:
        | 'INVALID_ENVELOPE'
        | 'INVALID_POLICY_REVISION'
        | 'UNKNOWN_SOURCE'
        | 'SOURCE_MISMATCH'
        | 'CONFLICTING_CANDIDATE';
      record: null;
    };

export type SecurityAlertAttemptBeginResult =
  | { status: 'CREATED'; attempt: SecurityAlertDeliveryAttempt }
  | {
      status:
        | 'UNKNOWN_ALERT'
        | 'INVALID_ATTEMPT'
        | 'ATTEMPT_EXISTS'
        | 'PENDING_EXISTS';
      attempt: null;
    };

export type SecurityAlertAttemptResolveResult =
  | { status: 'RESOLVED'; attempt: SecurityAlertDeliveryAttempt }
  | {
      status:
        | 'UNKNOWN_ATTEMPT'
        | 'ALREADY_RESOLVED'
        | 'INVALID_ATTEMPT'
        | 'INVALID_RESULT'
        | 'INVALID_TIMESTAMP';
      attempt: null;
    };

function rowEnvelope(row: {
  sourceDetectionHistoryId: string;
  sourceDetectionType: string;
  severity: string;
  primaryOwner: string;
  detectedAt: Date;
  acknowledgeBy: Date;
  escalationOwner: string;
  escalateAt: Date;
}): SecurityAlertDeliveryEnvelope | null {
  return parseSecurityAlertDeliveryEnvelope({
    schemaVersion: 'security-alert-delivery-v1',
    sourceDetectionHistoryId: row.sourceDetectionHistoryId,
    sourceDetectionType: row.sourceDetectionType,
    severity: row.severity,
    primaryOwner: row.primaryOwner,
    detectedAt: row.detectedAt.toISOString(),
    acknowledgeBy: row.acknowledgeBy.toISOString(),
    escalationOwner: row.escalationOwner,
    escalateAt: row.escalateAt.toISOString(),
  });
}

function sameEnvelope(
  left: SecurityAlertDeliveryEnvelope,
  right: SecurityAlertDeliveryEnvelope,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function toRecord(row: {
  alertId: string;
  routingPolicyRevision: string;
  sourceDetectionHistoryId: string;
  sourceDetectionType: string;
  severity: string;
  primaryOwner: string;
  detectedAt: Date;
  acknowledgeBy: Date;
  escalationOwner: string;
  escalateAt: Date;
  createdAt: Date;
}): SecurityAlertOutboxRecord | null {
  const envelope = rowEnvelope(row);
  if (!envelope) return null;
  return {
    alertId: row.alertId,
    routingPolicyRevision: row.routingPolicyRevision,
    envelope,
    createdAt: row.createdAt.toISOString(),
  };
}

const outboxSelection = {
  alertId: securityAlertOutbox.alertId,
  routingPolicyRevision: securityAlertOutbox.routingPolicyRevision,
  sourceDetectionHistoryId: securityAlertOutbox.sourceDetectionHistoryId,
  sourceDetectionType: securityAlertOutbox.sourceDetectionType,
  severity: securityAlertOutbox.severity,
  primaryOwner: securityAlertOutbox.primaryOwner,
  detectedAt: securityAlertOutbox.detectedAt,
  acknowledgeBy: securityAlertOutbox.acknowledgeBy,
  escalationOwner: securityAlertOutbox.escalationOwner,
  escalateAt: securityAlertOutbox.escalateAt,
  createdAt: securityAlertOutbox.createdAt,
} as const;

export async function persistSecurityAlertOutboxCandidate(
  envelopeInput: unknown,
  routingPolicyRevisionInput: unknown,
): Promise<SecurityAlertOutboxPersistResult> {
  const envelope = parseSecurityAlertDeliveryEnvelope(envelopeInput);
  if (!envelope) return { status: 'INVALID_ENVELOPE', record: null };
  if (
    typeof routingPolicyRevisionInput !== 'string'
    || !POLICY_REVISION_RE.test(routingPolicyRevisionInput)
  ) {
    return { status: 'INVALID_POLICY_REVISION', record: null };
  }

  const [source] = await db
    .select({ detectorType: securityDetectionHistory.detectorType })
    .from(securityDetectionHistory)
    .where(eq(securityDetectionHistory.detectionId, envelope.sourceDetectionHistoryId))
    .limit(1);

  if (!source) return { status: 'UNKNOWN_SOURCE', record: null };
  if (source.detectorType !== envelope.sourceDetectionType) {
    return { status: 'SOURCE_MISMATCH', record: null };
  }

  const inserted = await db
    .insert(securityAlertOutbox)
    .values({
      sourceDetectionHistoryId: envelope.sourceDetectionHistoryId,
      routingPolicyRevision: routingPolicyRevisionInput,
      schemaVersion: envelope.schemaVersion,
      sourceDetectionType: envelope.sourceDetectionType,
      severity: envelope.severity,
      primaryOwner: envelope.primaryOwner,
      detectedAt: new Date(envelope.detectedAt),
      acknowledgeBy: new Date(envelope.acknowledgeBy),
      escalationOwner: envelope.escalationOwner,
      escalateAt: new Date(envelope.escalateAt),
    })
    .onConflictDoNothing({
      target: [
        securityAlertOutbox.sourceDetectionHistoryId,
        securityAlertOutbox.routingPolicyRevision,
      ],
    })
    .returning(outboxSelection);

  if (inserted[0]) {
    const record = toRecord(inserted[0]);
    if (!record) return { status: 'CONFLICTING_CANDIDATE', record: null };
    return { status: 'ENQUEUED', record };
  }

  const [existing] = await db
    .select(outboxSelection)
    .from(securityAlertOutbox)
    .where(and(
      eq(securityAlertOutbox.sourceDetectionHistoryId, envelope.sourceDetectionHistoryId),
      eq(securityAlertOutbox.routingPolicyRevision, routingPolicyRevisionInput),
    ))
    .limit(1);

  const record = existing ? toRecord(existing) : null;
  if (!record || !sameEnvelope(record.envelope, envelope)) {
    return { status: 'CONFLICTING_CANDIDATE', record: null };
  }

  return { status: 'DEDUPED', record };
}

async function readOutboxEnvelope(alertId: string) {
  const [row] = await db
    .select(outboxSelection)
    .from(securityAlertOutbox)
    .where(eq(securityAlertOutbox.alertId, alertId))
    .limit(1);
  if (!row) return null;
  const record = toRecord(row);
  return record?.envelope ?? null;
}

export async function beginSecurityAlertDeliveryAttempt(
  alertIdInput: unknown,
  attemptIdInput: unknown,
  attemptedAtInput: unknown,
): Promise<SecurityAlertAttemptBeginResult> {
  if (typeof alertIdInput !== 'string' || !UUID_RE.test(alertIdInput)) {
    return { status: 'UNKNOWN_ALERT', attempt: null };
  }

  const envelope = await readOutboxEnvelope(alertIdInput.toLowerCase());
  if (!envelope) return { status: 'UNKNOWN_ALERT', attempt: null };

  const built = createSecurityAlertDeliveryAttempt(
    envelope,
    attemptIdInput,
    attemptedAtInput,
  );
  if (built.status !== 'BUILT') {
    return { status: 'INVALID_ATTEMPT', attempt: null };
  }

  const inserted = await db
    .insert(securityAlertDeliveryAttempts)
    .values({
      attemptId: built.attempt.attemptId,
      alertId: alertIdInput.toLowerCase(),
      attemptedAt: new Date(built.attempt.attemptedAt),
      state: 'PENDING',
      resolvedAt: null,
      providerReceiptRef: null,
      failureCode: null,
    })
    .onConflictDoNothing()
    .returning({ attemptId: securityAlertDeliveryAttempts.attemptId });

  if (inserted[0]) return { status: 'CREATED', attempt: built.attempt };

  const [sameId] = await db
    .select({ attemptId: securityAlertDeliveryAttempts.attemptId })
    .from(securityAlertDeliveryAttempts)
    .where(eq(securityAlertDeliveryAttempts.attemptId, built.attempt.attemptId))
    .limit(1);

  return sameId
    ? { status: 'ATTEMPT_EXISTS', attempt: null }
    : { status: 'PENDING_EXISTS', attempt: null };
}

export async function resolveSecurityAlertOutboxAttempt(
  attemptIdInput: unknown,
  resultInput: unknown,
): Promise<SecurityAlertAttemptResolveResult> {
  if (typeof attemptIdInput !== 'string' || !UUID_RE.test(attemptIdInput)) {
    return { status: 'UNKNOWN_ATTEMPT', attempt: null };
  }

  const attemptId = attemptIdInput.toLowerCase();
  const [row] = await db
    .select({
      attemptId: securityAlertDeliveryAttempts.attemptId,
      attemptedAt: securityAlertDeliveryAttempts.attemptedAt,
      state: securityAlertDeliveryAttempts.state,
      resolvedAt: securityAlertDeliveryAttempts.resolvedAt,
      providerReceiptRef: securityAlertDeliveryAttempts.providerReceiptRef,
      failureCode: securityAlertDeliveryAttempts.failureCode,
      ...outboxSelection,
    })
    .from(securityAlertDeliveryAttempts)
    .innerJoin(
      securityAlertOutbox,
      eq(securityAlertDeliveryAttempts.alertId, securityAlertOutbox.alertId),
    )
    .where(eq(securityAlertDeliveryAttempts.attemptId, attemptId))
    .limit(1);

  if (!row) return { status: 'UNKNOWN_ATTEMPT', attempt: null };
  if (row.state !== 'PENDING') {
    return { status: 'ALREADY_RESOLVED', attempt: null };
  }

  const envelope = rowEnvelope(row);
  if (!envelope) return { status: 'INVALID_ATTEMPT', attempt: null };

  const pendingAttempt: SecurityAlertDeliveryAttempt = {
    schemaVersion: SECURITY_ALERT_DELIVERY_ATTEMPT_SCHEMA_VERSION,
    attemptId: row.attemptId,
    envelope,
    attemptedAt: row.attemptedAt.toISOString(),
    state: 'PENDING',
    resolvedAt: null,
    providerReceiptRef: null,
    failureCode: null,
  };

  const resolved = resolveSecurityAlertDeliveryAttempt(
    pendingAttempt,
    resultInput,
  );
  if (resolved.status !== 'RESOLVED') {
    return { status: resolved.status, attempt: null };
  }

  const updated = await db
    .update(securityAlertDeliveryAttempts)
    .set({
      state: resolved.attempt.state,
      resolvedAt: resolved.attempt.resolvedAt
        ? new Date(resolved.attempt.resolvedAt)
        : null,
      providerReceiptRef: resolved.attempt.providerReceiptRef,
      failureCode: resolved.attempt.failureCode,
    })
    .where(and(
      eq(securityAlertDeliveryAttempts.attemptId, attemptId),
      eq(securityAlertDeliveryAttempts.state, 'PENDING'),
    ))
    .returning({ attemptId: securityAlertDeliveryAttempts.attemptId });

  if (!updated[0]) return { status: 'ALREADY_RESOLVED', attempt: null };
  return { status: 'RESOLVED', attempt: resolved.attempt };
}
