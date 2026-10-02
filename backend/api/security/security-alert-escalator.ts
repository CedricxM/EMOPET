import { randomUUID } from 'node:crypto';

import {
  and,
  asc,
  eq,
  lte,
  notExists,
  sql,
} from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
  securityAlertAcknowledgements,
  securityAlertEscalationAttempts,
  securityAlertOutbox,
} from '../../db/schema/index.js';
import {
  parseSecurityAlertDeliveryEnvelope,
  type SecurityAlertDeliveryEnvelope,
} from './security-alert-delivery.js';
import {
  createSecurityAlertDeliveryAttempt,
  resolveSecurityAlertDeliveryAttempt,
  type SecurityAlertDeliveryFailureCode,
} from './security-alert-delivery-attempt.js';
import type { SecurityAlertOwnerRole } from './security-alert-response.js';

export type SecurityAlertEscalationAdapterResult =
  | {
      status: 'DELIVERED';
      providerReceiptRef: string;
    }
  | {
      status: 'ATTEMPT_FAILED';
      failureCode: SecurityAlertDeliveryFailureCode;
    };

export interface SecurityAlertEscalationAdapterInput {
  envelope: SecurityAlertDeliveryEnvelope;
  escalationOwner: SecurityAlertOwnerRole;
}

export type SecurityAlertEscalationAdapter = (
  input: SecurityAlertEscalationAdapterInput,
) => Promise<SecurityAlertEscalationAdapterResult>;

export interface SecurityAlertEscalatorDeps {
  escalate: SecurityAlertEscalationAdapter;
  clock?: () => Date;
  attemptIdFactory?: () => string;
}

export type SecurityAlertEscalationResult =
  | {
      status: 'NO_WORK';
      attemptId: null;
    }
  | {
      status: 'DELIVERED' | 'ATTEMPT_FAILED';
      attemptId: string;
    }
  | {
      status: 'PENDING_PRESERVED';
      attemptId: string;
    };

export type SecurityAlertEscalationHealth =
  | {
      status: 'INVALID_INPUT';
      stalePendingCount: null;
      failedEscalationCount: null;
    }
  | {
      status: 'HEALTHY' | 'ATTENTION_REQUIRED';
      stalePendingCount: number;
      failedEscalationCount: number;
    };

function validDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value > 0;
}

const candidateSelection = {
  alertId: securityAlertOutbox.alertId,
  sourceDetectionHistoryId: securityAlertOutbox.sourceDetectionHistoryId,
  sourceDetectionType: securityAlertOutbox.sourceDetectionType,
  severity: securityAlertOutbox.severity,
  primaryOwner: securityAlertOutbox.primaryOwner,
  detectedAt: securityAlertOutbox.detectedAt,
  acknowledgeBy: securityAlertOutbox.acknowledgeBy,
  escalationOwner: securityAlertOutbox.escalationOwner,
  escalateAt: securityAlertOutbox.escalateAt,
} as const;

function envelopeFromRow(row: {
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

async function claimFirstDueUnacknowledgedAlert(input: {
  attemptedAt: Date;
  attemptId: string;
}): Promise<{
  alertId: string;
  attemptId: string;
  envelope: SecurityAlertDeliveryEnvelope;
  escalationOwner: SecurityAlertOwnerRole;
} | null> {
  return db.transaction(async (tx) => {
    const priorEscalation = tx
      .select({ attemptId: securityAlertEscalationAttempts.attemptId })
      .from(securityAlertEscalationAttempts)
      .where(eq(
        securityAlertEscalationAttempts.alertId,
        securityAlertOutbox.alertId,
      ));

    const priorAck = tx
      .select({ alertId: securityAlertAcknowledgements.alertId })
      .from(securityAlertAcknowledgements)
      .where(eq(
        securityAlertAcknowledgements.alertId,
        securityAlertOutbox.alertId,
      ));

    const [candidate] = await tx
      .select(candidateSelection)
      .from(securityAlertOutbox)
      .where(and(
        lte(securityAlertOutbox.escalateAt, input.attemptedAt),
        notExists(priorEscalation),
        notExists(priorAck),
      ))
      .orderBy(
        asc(securityAlertOutbox.escalateAt),
        asc(securityAlertOutbox.alertId),
      )
      .limit(1)
      .for('update', { skipLocked: true });

    if (!candidate) return null;

    // Acknowledgement ingestion locks this same outbox row before writing its
    // receipt. Re-check after acquiring the row lock so an ACK that won the
    // race before this claim suppresses escalation deterministically.
    const [acknowledged] = await tx
      .select({ alertId: securityAlertAcknowledgements.alertId })
      .from(securityAlertAcknowledgements)
      .where(eq(
        securityAlertAcknowledgements.alertId,
        candidate.alertId,
      ))
      .limit(1);

    if (acknowledged) return null;

    const envelope = envelopeFromRow(candidate);
    if (!envelope) {
      throw new Error('Invalid durable security alert envelope');
    }

    const built = createSecurityAlertDeliveryAttempt(
      envelope,
      input.attemptId,
      input.attemptedAt.toISOString(),
    );
    if (built.status !== 'BUILT') {
      throw new Error('Unable to build security alert escalation attempt');
    }

    const inserted = await tx
      .insert(securityAlertEscalationAttempts)
      .values({
        attemptId: built.attempt.attemptId,
        alertId: candidate.alertId,
        escalationOwner: envelope.escalationOwner,
        attemptedAt: input.attemptedAt,
        state: 'PENDING',
        resolvedAt: null,
        providerReceiptRef: null,
        failureCode: null,
      })
      .onConflictDoNothing()
      .returning({ attemptId: securityAlertEscalationAttempts.attemptId });

    if (!inserted[0]) return null;

    return {
      alertId: candidate.alertId,
      attemptId: built.attempt.attemptId,
      envelope,
      escalationOwner: envelope.escalationOwner,
    };
  });
}

async function resolveEscalationAttempt(input: {
  claimed: {
    attemptId: string;
    envelope: SecurityAlertDeliveryEnvelope;
  };
  attemptedAt: Date;
  resolvedAt: Date;
  result: SecurityAlertEscalationAdapterResult;
}): Promise<SecurityAlertEscalationResult> {
  const pending = createSecurityAlertDeliveryAttempt(
    input.claimed.envelope,
    input.claimed.attemptId,
    input.attemptedAt.toISOString(),
  );
  if (pending.status !== 'BUILT' || pending.attempt.state !== 'PENDING') {
    return { status: 'PENDING_PRESERVED', attemptId: input.claimed.attemptId };
  }

  let resolved = resolveSecurityAlertDeliveryAttempt(
    pending.attempt,
    input.result.status === 'DELIVERED'
      ? {
          status: 'DELIVERED',
          resolvedAt: input.resolvedAt.toISOString(),
          providerReceiptRef: input.result.providerReceiptRef,
        }
      : {
          status: 'ATTEMPT_FAILED',
          resolvedAt: input.resolvedAt.toISOString(),
          failureCode: input.result.failureCode,
        },
  );

  // Treat an adapter result that violates the bounded delivery contract as an
  // adapter failure. Do not preserve malformed provider output or leave a
  // permanently PENDING row merely because the adapter returned bad data.
  if (resolved.status !== 'RESOLVED') {
    resolved = resolveSecurityAlertDeliveryAttempt(
      pending.attempt,
      {
        status: 'ATTEMPT_FAILED',
        resolvedAt: input.resolvedAt.toISOString(),
        failureCode: 'ADAPTER_FAILURE',
      },
    );
  }

  if (resolved.status !== 'RESOLVED') {
    return { status: 'PENDING_PRESERVED', attemptId: input.claimed.attemptId };
  }

  const updated = await db
    .update(securityAlertEscalationAttempts)
    .set({
      state: resolved.attempt.state,
      resolvedAt: resolved.attempt.resolvedAt
        ? new Date(resolved.attempt.resolvedAt)
        : null,
      providerReceiptRef: resolved.attempt.providerReceiptRef,
      failureCode: resolved.attempt.failureCode,
    })
    .where(and(
      eq(
        securityAlertEscalationAttempts.attemptId,
        input.claimed.attemptId,
      ),
      eq(securityAlertEscalationAttempts.state, 'PENDING'),
    ))
    .returning({ attemptId: securityAlertEscalationAttempts.attemptId });

  if (!updated[0]) {
    return { status: 'PENDING_PRESERVED', attemptId: input.claimed.attemptId };
  }

  if (resolved.attempt.state === 'DELIVERED') {
    return { status: 'DELIVERED', attemptId: input.claimed.attemptId };
  }
  if (resolved.attempt.state === 'ATTEMPT_FAILED') {
    return { status: 'ATTEMPT_FAILED', attemptId: input.claimed.attemptId };
  }

  return { status: 'PENDING_PRESERVED', attemptId: input.claimed.attemptId };
}

/**
 * Process at most one due, unacknowledged alert through the symbolic escalation
 * owner already frozen in the canonical alert envelope.
 *
 * This worker selects no provider, roster, contact destination, retry policy or
 * timing value. It executes only the pre-existing escalateAt decision.
 */
export async function escalateNextSecurityAlert(
  deps: SecurityAlertEscalatorDeps,
): Promise<SecurityAlertEscalationResult> {
  const clock = deps.clock ?? (() => new Date());
  const attemptedAt = clock();
  if (!validDate(attemptedAt)) {
    throw new Error('Invalid security alert escalation timestamp');
  }

  const attemptId = (deps.attemptIdFactory ?? randomUUID)();
  const claimed = await claimFirstDueUnacknowledgedAlert({
    attemptedAt,
    attemptId,
  });
  if (!claimed) return { status: 'NO_WORK', attemptId: null };

  let adapterResult: SecurityAlertEscalationAdapterResult;
  try {
    adapterResult = await deps.escalate({
      envelope: claimed.envelope,
      escalationOwner: claimed.escalationOwner,
    });
  } catch {
    adapterResult = {
      status: 'ATTEMPT_FAILED',
      failureCode: 'ADAPTER_FAILURE',
    };
  }

  const resolvedAt = clock();
  if (!validDate(resolvedAt)) {
    return { status: 'PENDING_PRESERVED', attemptId: claimed.attemptId };
  }

  return resolveEscalationAttempt({
    claimed,
    attemptedAt,
    resolvedAt,
    result: adapterResult,
  });
}

/**
 * Aggregate repository-side visibility only. The caller supplies the stale
 * bound; this function selects no operational SLA.
 */
export async function probeSecurityAlertEscalationHealth(input: {
  now: Date;
  staleAfterSeconds: number;
}): Promise<SecurityAlertEscalationHealth> {
  if (
    !validDate(input.now)
    || !isPositiveSafeInteger(input.staleAfterSeconds)
    || input.staleAfterSeconds > Math.floor(Number.MAX_SAFE_INTEGER / 1000)
  ) {
    return {
      status: 'INVALID_INPUT',
      stalePendingCount: null,
      failedEscalationCount: null,
    };
  }

  const cutoff = new Date(
    input.now.getTime() - input.staleAfterSeconds * 1000,
  );

  const [stalePending] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(securityAlertEscalationAttempts)
    .where(and(
      eq(securityAlertEscalationAttempts.state, 'PENDING'),
      lte(securityAlertEscalationAttempts.attemptedAt, cutoff),
    ));

  const [failed] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(securityAlertEscalationAttempts)
    .where(eq(securityAlertEscalationAttempts.state, 'ATTEMPT_FAILED'));

  const stalePendingCount = stalePending?.count ?? 0;
  const failedEscalationCount = failed?.count ?? 0;

  return {
    status:
      stalePendingCount > 0 || failedEscalationCount > 0
        ? 'ATTENTION_REQUIRED'
        : 'HEALTHY',
    stalePendingCount,
    failedEscalationCount,
  };
}
