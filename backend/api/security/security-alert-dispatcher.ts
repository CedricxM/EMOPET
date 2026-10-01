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
  securityAlertDeliveryAttempts,
  securityAlertOutbox,
} from '../../db/schema/index.js';
import {
  parseSecurityAlertDeliveryEnvelope,
  type SecurityAlertDeliveryEnvelope,
} from './security-alert-delivery.js';
import {
  createSecurityAlertDeliveryAttempt,
  type SecurityAlertDeliveryFailureCode,
} from './security-alert-delivery-attempt.js';
import {
  resolveSecurityAlertOutboxAttempt,
} from './security-alert-outbox.js';

export type SecurityAlertDeliveryAdapterResult =
  | {
      status: 'DELIVERED';
      providerReceiptRef: string;
    }
  | {
      status: 'ATTEMPT_FAILED';
      failureCode: SecurityAlertDeliveryFailureCode;
    };

export type SecurityAlertDeliveryAdapter = (
  envelope: SecurityAlertDeliveryEnvelope,
) => Promise<SecurityAlertDeliveryAdapterResult>;

export interface SecurityAlertDispatcherDeps {
  deliver: SecurityAlertDeliveryAdapter;
  clock?: () => Date;
  attemptIdFactory?: () => string;
}

export type SecurityAlertDispatchResult =
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

export type SecurityAlertDispatchHealth =
  | {
      status: 'INVALID_INPUT';
      stalePendingCount: null;
      undeliveredFailedAlertCount: null;
    }
  | {
      status: 'HEALTHY' | 'ATTENTION_REQUIRED';
      stalePendingCount: number;
      undeliveredFailedAlertCount: number;
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

async function claimFirstUnattemptedAlert(input: {
  attemptedAt: Date;
  attemptId: string;
}): Promise<{
  attemptId: string;
  envelope: SecurityAlertDeliveryEnvelope;
} | null> {
  return db.transaction(async (tx) => {
    const priorAttempt = tx
      .select({ attemptId: securityAlertDeliveryAttempts.attemptId })
      .from(securityAlertDeliveryAttempts)
      .where(eq(
        securityAlertDeliveryAttempts.alertId,
        securityAlertOutbox.alertId,
      ));

    const [candidate] = await tx
      .select(candidateSelection)
      .from(securityAlertOutbox)
      .where(notExists(priorAttempt))
      .orderBy(
        asc(securityAlertOutbox.createdAt),
        asc(securityAlertOutbox.alertId),
      )
      .limit(1)
      .for('update', { skipLocked: true });

    if (!candidate) return null;

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
      throw new Error('Unable to build security alert delivery attempt');
    }

    const inserted = await tx
      .insert(securityAlertDeliveryAttempts)
      .values({
        attemptId: built.attempt.attemptId,
        alertId: candidate.alertId,
        attemptedAt: input.attemptedAt,
        state: 'PENDING',
        resolvedAt: null,
        providerReceiptRef: null,
        failureCode: null,
      })
      .onConflictDoNothing()
      .returning({ attemptId: securityAlertDeliveryAttempts.attemptId });

    if (!inserted[0]) return null;

    return {
      attemptId: built.attempt.attemptId,
      envelope,
    };
  });
}

async function failAttempt(
  attemptId: string,
  resolvedAt: Date,
  failureCode: SecurityAlertDeliveryFailureCode,
): Promise<SecurityAlertDispatchResult> {
  const resolution = await resolveSecurityAlertOutboxAttempt(attemptId, {
    status: 'ATTEMPT_FAILED',
    resolvedAt: resolvedAt.toISOString(),
    failureCode,
  });

  if (resolution.status !== 'RESOLVED') {
    return { status: 'PENDING_PRESERVED', attemptId };
  }
  return { status: 'ATTEMPT_FAILED', attemptId };
}

/**
 * Process at most one previously-unattempted durable security alert.
 *
 * The PENDING attempt is committed before adapter I/O. This slice deliberately
 * does not retry: once any attempt exists, the alert is outside this worker's
 * candidate set until an explicit retry policy is authorized elsewhere.
 */
export async function dispatchNextSecurityAlert(
  deps: SecurityAlertDispatcherDeps,
): Promise<SecurityAlertDispatchResult> {
  const clock = deps.clock ?? (() => new Date());
  const attemptedAt = clock();
  if (!validDate(attemptedAt)) {
    throw new Error('Invalid security alert dispatch timestamp');
  }

  const attemptId = (deps.attemptIdFactory ?? randomUUID)();
  const claimed = await claimFirstUnattemptedAlert({
    attemptedAt,
    attemptId,
  });
  if (!claimed) return { status: 'NO_WORK', attemptId: null };

  let adapterResult: SecurityAlertDeliveryAdapterResult;
  try {
    adapterResult = await deps.deliver(claimed.envelope);
  } catch {
    const resolvedAt = clock();
    if (!validDate(resolvedAt)) {
      return { status: 'PENDING_PRESERVED', attemptId: claimed.attemptId };
    }
    return failAttempt(
      claimed.attemptId,
      resolvedAt,
      'ADAPTER_FAILURE',
    );
  }

  const resolvedAt = clock();
  if (!validDate(resolvedAt)) {
    return { status: 'PENDING_PRESERVED', attemptId: claimed.attemptId };
  }

  const resolution = await resolveSecurityAlertOutboxAttempt(
    claimed.attemptId,
    adapterResult.status === 'DELIVERED'
      ? {
          status: 'DELIVERED',
          resolvedAt: resolvedAt.toISOString(),
          providerReceiptRef: adapterResult.providerReceiptRef,
        }
      : {
          status: 'ATTEMPT_FAILED',
          resolvedAt: resolvedAt.toISOString(),
          failureCode: adapterResult.failureCode,
        },
  );

  if (resolution.status === 'RESOLVED') {
    if (resolution.attempt.state === 'DELIVERED') {
      return {
        status: 'DELIVERED',
        attemptId: claimed.attemptId,
      };
    }
    if (resolution.attempt.state === 'ATTEMPT_FAILED') {
      return {
        status: 'ATTEMPT_FAILED',
        attemptId: claimed.attemptId,
      };
    }
    return {
      status: 'PENDING_PRESERVED',
      attemptId: claimed.attemptId,
    };
  }

  return failAttempt(
    claimed.attemptId,
    resolvedAt,
    'ADAPTER_FAILURE',
  );
}

/**
 * Read-only dispatch visibility probe.
 *
 * The caller supplies the staleness bound. This function chooses no production
 * cadence/SLA and exposes only aggregate counts.
 */
export async function probeSecurityAlertDispatchHealth(input: {
  now: Date;
  staleAfterSeconds: number;
}): Promise<SecurityAlertDispatchHealth> {
  if (
    !validDate(input.now)
    || !isPositiveSafeInteger(input.staleAfterSeconds)
    || input.staleAfterSeconds > Math.floor(Number.MAX_SAFE_INTEGER / 1000)
  ) {
    return {
      status: 'INVALID_INPUT',
      stalePendingCount: null,
      undeliveredFailedAlertCount: null,
    };
  }

  const cutoff = new Date(
    input.now.getTime() - input.staleAfterSeconds * 1000,
  );

  const [stalePending] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(securityAlertDeliveryAttempts)
    .where(and(
      eq(securityAlertDeliveryAttempts.state, 'PENDING'),
      lte(securityAlertDeliveryAttempts.attemptedAt, cutoff),
    ));

  const failedAlertRows = await db.execute(sql`
    SELECT count(DISTINCT failed.alert_id)::int AS count
    FROM security_alert_delivery_attempts AS failed
    WHERE failed.state = 'ATTEMPT_FAILED'
      AND NOT EXISTS (
        SELECT 1
        FROM security_alert_delivery_attempts AS delivered
        WHERE delivered.alert_id = failed.alert_id
          AND delivered.state = 'DELIVERED'
      )
  `);

  const stalePendingCount = stalePending?.count ?? 0;
  const rawFailedCount = (
    failedAlertRows[0] as { count?: unknown } | undefined
  )?.count;
  const undeliveredFailedAlertCount =
    typeof rawFailedCount === 'number' && Number.isSafeInteger(rawFailedCount)
      ? rawFailedCount
      : typeof rawFailedCount === 'string' && /^\\d+$/.test(rawFailedCount)
        ? Number(rawFailedCount)
        : 0;

  return {
    status:
      stalePendingCount > 0 || undeliveredFailedAlertCount > 0
        ? 'ATTENTION_REQUIRED'
        : 'HEALTHY',
    stalePendingCount,
    undeliveredFailedAlertCount,
  };
}
