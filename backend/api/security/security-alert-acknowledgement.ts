import { eq } from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
  securityAlertAcknowledgements,
  securityAlertOutbox,
  securityAuditEvents,
} from '../../db/schema/index.js';
import {
  parseSecurityAuditEvent,
  type SecurityAuditEvent,
} from './security-audit-event.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACK_ROLES = ['admin', 'operator'] as const;
type AckRole = (typeof ACK_ROLES)[number];

export type SecurityAlertAcknowledgementResult =
  | {
      status: 'ACKNOWLEDGED' | 'DUPLICATE';
      alertId: string;
      acknowledgedAt: string;
      acknowledgedBySubject: string;
      acknowledgedByRole: AckRole;
      auditEventId: string;
    }
  | {
      status:
        | 'INVALID_INPUT'
        | 'INVALID_TIMESTAMP'
        | 'UNKNOWN_ALERT'
        | 'CONFLICT'
        | 'AUDIT_CONFLICT'
        | 'DATABASE_UNAVAILABLE';
      alertId: null;
      acknowledgedAt: null;
      acknowledgedBySubject: null;
      acknowledgedByRole: null;
      auditEventId: null;
    };

function failure(
  status: Extract<SecurityAlertAcknowledgementResult, { alertId: null }>['status'],
): Extract<SecurityAlertAcknowledgementResult, { alertId: null }> {
  return {
    status,
    alertId: null,
    acknowledgedAt: null,
    acknowledgedBySubject: null,
    acknowledgedByRole: null,
    auditEventId: null,
  };
}

function canonicalUtcTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value.endsWith('Z')) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  try {
    return new Date(timestamp).toISOString();
  } catch {
    return null;
  }
}

function isAckRole(value: unknown): value is AckRole {
  return typeof value === 'string' && ACK_ROLES.includes(value as AckRole);
}

function auditRow(event: SecurityAuditEvent) {
  return {
    schemaVersion: event.schemaVersion,
    eventType: event.eventType,
    occurredAt: new Date(event.occurredAt),
    actorKind: event.actor.kind,
    actorSubject: event.actor.subject,
    actorRole: event.actor.role,
    action: event.action,
    targetScope: event.target.scope,
    targetRef: event.target.ref,
    outcome: event.outcome,
    reason: event.reason,
  };
}

export async function acknowledgeSecurityAlert(input: {
  requestId: unknown;
  alertId: unknown;
  acknowledgedAt: unknown;
  subject: unknown;
  role: unknown;
}): Promise<SecurityAlertAcknowledgementResult> {
  if (
    typeof input.requestId !== 'string'
    || !UUID_RE.test(input.requestId)
    || typeof input.alertId !== 'string'
    || !UUID_RE.test(input.alertId)
    || typeof input.subject !== 'string'
    || !UUID_RE.test(input.subject)
    || !isAckRole(input.role)
  ) {
    return failure('INVALID_INPUT');
  }

  const requestId = input.requestId.toLowerCase();
  const alertId = input.alertId.toLowerCase();
  const subject = input.subject.toLowerCase();
  const role = input.role;
  const acknowledgedAt = canonicalUtcTimestamp(input.acknowledgedAt);
  if (!acknowledgedAt) return failure('INVALID_TIMESTAMP');

  try {
    return await db.transaction(async (tx) => {
      const [alert] = await tx
        .select({
          alertId: securityAlertOutbox.alertId,
          detectedAt: securityAlertOutbox.detectedAt,
        })
        .from(securityAlertOutbox)
        .where(eq(securityAlertOutbox.alertId, alertId))
        .limit(1)
        .for('update');

      if (!alert) return failure('UNKNOWN_ALERT');
      if (Date.parse(acknowledgedAt) < alert.detectedAt.getTime()) {
        return failure('INVALID_TIMESTAMP');
      }

      const [existing] = await tx
        .select({
          alertId: securityAlertAcknowledgements.alertId,
          acknowledgedAt: securityAlertAcknowledgements.acknowledgedAt,
          acknowledgedBySubject: securityAlertAcknowledgements.acknowledgedBySubject,
          acknowledgedByRole: securityAlertAcknowledgements.acknowledgedByRole,
          auditEventId: securityAlertAcknowledgements.auditEventId,
        })
        .from(securityAlertAcknowledgements)
        .where(eq(securityAlertAcknowledgements.alertId, alertId))
        .limit(1);

      if (existing) {
        const same =
          existing.acknowledgedAt.toISOString() === acknowledgedAt
          && existing.acknowledgedBySubject === subject
          && existing.acknowledgedByRole === role;
        if (!same) return failure('CONFLICT');

        return {
          status: 'DUPLICATE',
          alertId,
          acknowledgedAt,
          acknowledgedBySubject: subject,
          acknowledgedByRole: role,
          auditEventId: existing.auditEventId,
        };
      }

      const auditEvent = parseSecurityAuditEvent({
        eventType: 'security_incident_access',
        occurredAt: acknowledgedAt,
        actor: {
          kind: 'privileged_human',
          subject,
          role,
        },
        action: 'security.incident.coordinate',
        target: {
          scope: 'security_incident',
          ref: alertId,
        },
        outcome: 'allowed',
        reason: 'allowed',
      });
      if (!auditEvent) return failure('INVALID_INPUT');

      const [auditCreated] = await tx
        .insert(securityAuditEvents)
        .values({ id: requestId, ...auditRow(auditEvent) })
        .onConflictDoNothing({ target: securityAuditEvents.id })
        .returning({ id: securityAuditEvents.id });

      if (!auditCreated) return failure('AUDIT_CONFLICT');

      await tx
        .insert(securityAlertAcknowledgements)
        .values({
          alertId,
          acknowledgedAt: new Date(acknowledgedAt),
          acknowledgedBySubject: subject,
          acknowledgedByRole: role,
          auditEventId: requestId,
        });

      return {
        status: 'ACKNOWLEDGED',
        alertId,
        acknowledgedAt,
        acknowledgedBySubject: subject,
        acknowledgedByRole: role,
        auditEventId: requestId,
      };
    });
  } catch {
    return failure('DATABASE_UNAVAILABLE');
  }
}
