import { db } from '../../db/index.js';
import { securityAuditEvents } from '../../db/schema/index.js';
import {
  parseSecurityAuditEvent,
  type SecurityAuditEvent,
} from './security-audit-event.js';

export type SecurityAuditPersistenceError =
  | 'INVALID_AUDIT_EVENT'
  | 'DATABASE_UNAVAILABLE';

export type SecurityAuditPersistenceResult =
  | {
      ok: true;
      id: string;
      storedAt: string;
    }
  | {
      ok: false;
      error: 'INVALID_AUDIT_EVENT';
      retryable: false;
    }
  | {
      ok: false;
      error: 'DATABASE_UNAVAILABLE';
      retryable: true;
    };

/**
 * Persist one canonical security-audit-v1 event.
 *
 * Fail-closed contract: callers that require durable audit evidence must not
 * treat an error result as an auditable successful privileged operation.
 *
 * This repository intentionally exposes INSERT only. That is application-level
 * behavior, not proof that the database principal/provider cannot mutate rows.
 */
export async function persistSecurityAuditEvent(
  input: unknown,
): Promise<SecurityAuditPersistenceResult> {
  const event = parseSecurityAuditEvent(input);
  if (!event) {
    return {
      ok: false,
      error: 'INVALID_AUDIT_EVENT',
      retryable: false,
    };
  }

  try {
    const [created] = await db
      .insert(securityAuditEvents)
      .values(toRow(event))
      .returning({
        id: securityAuditEvents.id,
        storedAt: securityAuditEvents.storedAt,
      });

    if (!created) {
      return {
        ok: false,
        error: 'DATABASE_UNAVAILABLE',
        retryable: true,
      };
    }

    return {
      ok: true,
      id: created.id,
      storedAt: created.storedAt.toISOString(),
    };
  } catch {
    return {
      ok: false,
      error: 'DATABASE_UNAVAILABLE',
      retryable: true,
    };
  }
}

function toRow(event: SecurityAuditEvent): typeof securityAuditEvents.$inferInsert {
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
