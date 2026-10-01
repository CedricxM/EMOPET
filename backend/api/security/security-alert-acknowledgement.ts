import { eq, sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
  securityAlertAcknowledgements,
  securityAlertOutbox,
  securityAuditEvents,
} from '../../db/schema/index.js';
import { parseSecurityAuditEvent } from './security-audit-event.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SecurityAlertAcknowledgementRole = 'admin' | 'operator';

export interface SecurityAlertAcknowledgementInput {
  requestId: string;
  alertId: string;
  actorSubject: string;
  actorRole: SecurityAlertAcknowledgementRole;
  acknowledgedAt: string;
}

export type SecurityAlertAcknowledgementResult =
  | {
      status: 'ACKNOWLEDGED' | 'DEDUPED';
      alertId: string;
      requestId: string;
      acknowledgedAt: string;
    }
  | {
      status:
        | 'INVALID_INPUT'
        | 'INVALID_TIMESTAMP'
        | 'UNKNOWN_ALERT'
        | 'ACK_CONFLICT'
        | 'DATABASE_UNAVAILABLE';
      alertId: string | null;
      requestId: string | null;
    };

function canonicalUuid(value: unknown): string | null {
  return typeof value === 'string' && UUID_RE.test(value)
    ? value.toLowerCase()
    : null;
}

function canonicalUtc(value: unknown): string | null {
  if (typeof value !== 'string' || !value.endsWith('Z')) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  const normalized = new Date(timestamp).toISOString();
  return normalized === value ? normalized : null;
}

function validRole(value: unknown): value is SecurityAlertAcknowledgementRole {
  return value === 'admin' || value === 'operator';
}

function sameAcknowledgement(
  row: {
    alertId: string;
    requestId: string;
    actorSubject: string;
    actorRole: string;
    acknowledgedAt: Date;
  },
  input: SecurityAlertAcknowledgementInput,
): boolean {
  return (
    row.alertId === input.alertId
    && row.requestId === input.requestId
    && row.actorSubject === input.actorSubject
    && row.actorRole === input.actorRole
    && row.acknowledgedAt.toISOString() === input.acknowledgedAt
  );
}

/**
 * Persist one privileged-human acknowledgement and its canonical security audit
 * event in the same PostgreSQL transaction.
 *
 * Authority boundary:
 * - this function does not verify browser/user credentials;
 * - callers must supply only identity already resolved by canonical privileged
 *   authorization;
 * - support is intentionally not a valid acknowledgement role.
 */
export async function acknowledgeSecurityAlert(
  raw: unknown,
): Promise<SecurityAlertAcknowledgementResult> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { status: 'INVALID_INPUT', alertId: null, requestId: null };
  }

  const value = raw as Record<string, unknown>;
  const keys = Object.keys(value);
  const expected = [
    'requestId',
    'alertId',
    'actorSubject',
    'actorRole',
    'acknowledgedAt',
  ];
  if (keys.length !== expected.length || !keys.every((key) => expected.includes(key))) {
    return { status: 'INVALID_INPUT', alertId: null, requestId: null };
  }

  const requestId = canonicalUuid(value.requestId);
  const alertId = canonicalUuid(value.alertId);
  const actorSubject = canonicalUuid(value.actorSubject);
  const acknowledgedAt = canonicalUtc(value.acknowledgedAt);
  if (!requestId || !alertId || !actorSubject || !validRole(value.actorRole)) {
    return { status: 'INVALID_INPUT', alertId, requestId };
  }
  if (!acknowledgedAt) {
    return { status: 'INVALID_TIMESTAMP', alertId, requestId };
  }

  const input: SecurityAlertAcknowledgementInput = {
    requestId,
    alertId,
    actorSubject,
    actorRole: value.actorRole,
    acknowledgedAt,
  };

  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
      await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);

      // Serialize idempotency across alerts as well as within one alert.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${requestId}, 0))`,
      );

      const [alert] = await tx
        .select({
          alertId: securityAlertOutbox.alertId,
          detectedAt: securityAlertOutbox.detectedAt,
        })
        .from(securityAlertOutbox)
        .where(eq(securityAlertOutbox.alertId, alertId))
        .for('update')
        .limit(1);

      if (!alert) {
        return { status: 'UNKNOWN_ALERT', alertId, requestId } as const;
      }

      if (Date.parse(acknowledgedAt) < alert.detectedAt.getTime()) {
        return { status: 'INVALID_TIMESTAMP', alertId, requestId } as const;
      }

      const [existingByRequest] = await tx
        .select({
          alertId: securityAlertAcknowledgements.alertId,
          requestId: securityAlertAcknowledgements.requestId,
          actorSubject: securityAlertAcknowledgements.actorSubject,
          actorRole: securityAlertAcknowledgements.actorRole,
          acknowledgedAt: securityAlertAcknowledgements.acknowledgedAt,
        })
        .from(securityAlertAcknowledgements)
        .where(eq(securityAlertAcknowledgements.requestId, requestId))
        .limit(1);

      if (existingByRequest) {
        return sameAcknowledgement(existingByRequest, input)
          ? {
              status: 'DEDUPED',
              alertId,
              requestId,
              acknowledgedAt,
            } as const
          : { status: 'ACK_CONFLICT', alertId, requestId } as const;
      }

      const [existingByAlert] = await tx
        .select({
          alertId: securityAlertAcknowledgements.alertId,
          requestId: securityAlertAcknowledgements.requestId,
          actorSubject: securityAlertAcknowledgements.actorSubject,
          actorRole: securityAlertAcknowledgements.actorRole,
          acknowledgedAt: securityAlertAcknowledgements.acknowledgedAt,
        })
        .from(securityAlertAcknowledgements)
        .where(eq(securityAlertAcknowledgements.alertId, alertId))
        .limit(1);

      if (existingByAlert) {
        return sameAcknowledgement(existingByAlert, input)
          ? {
              status: 'DEDUPED',
              alertId,
              requestId,
              acknowledgedAt,
            } as const
          : { status: 'ACK_CONFLICT', alertId, requestId } as const;
      }

      const [auditIdCollision] = await tx
        .select({ id: securityAuditEvents.id })
        .from(securityAuditEvents)
        .where(eq(securityAuditEvents.id, requestId))
        .limit(1);

      if (auditIdCollision) {
        return { status: 'ACK_CONFLICT', alertId, requestId } as const;
      }

      const auditEvent = parseSecurityAuditEvent({
        eventType: 'security_incident_access',
        occurredAt: acknowledgedAt,
        actor: {
          kind: 'privileged_human',
          subject: actorSubject,
          role: input.actorRole,
        },
        action: 'security.incident.coordinate',
        target: {
          scope: 'security_incident',
          ref: alertId,
        },
        outcome: 'allowed',
        reason: 'allowed',
      });

      if (!auditEvent) {
        return { status: 'INVALID_INPUT', alertId, requestId } as const;
      }

      const [storedAudit] = await tx
        .insert(securityAuditEvents)
        .values({
          id: requestId,
          schemaVersion: auditEvent.schemaVersion,
          eventType: auditEvent.eventType,
          occurredAt: new Date(auditEvent.occurredAt),
          actorKind: auditEvent.actor.kind,
          actorSubject: auditEvent.actor.subject,
          actorRole: auditEvent.actor.role,
          action: auditEvent.action,
          targetScope: auditEvent.target.scope,
          targetRef: auditEvent.target.ref,
          outcome: auditEvent.outcome,
          reason: auditEvent.reason,
        })
        .returning({ id: securityAuditEvents.id });

      if (!storedAudit) throw new Error('security acknowledgement audit not stored');

      const [storedAck] = await tx
        .insert(securityAlertAcknowledgements)
        .values({
          alertId,
          requestId,
          actorSubject,
          actorRole: input.actorRole,
          acknowledgedAt: new Date(acknowledgedAt),
          auditEventId: requestId,
        })
        .returning({ alertId: securityAlertAcknowledgements.alertId });

      if (!storedAck) throw new Error('security acknowledgement not stored');

      return {
        status: 'ACKNOWLEDGED',
        alertId,
        requestId,
        acknowledgedAt,
      } as const;
    });
  } catch {
    return {
      status: 'DATABASE_UNAVAILABLE',
      alertId,
      requestId,
    };
  }
}
