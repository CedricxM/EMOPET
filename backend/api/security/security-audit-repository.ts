import { eq } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { securityAuditEvents } from '../../db/schema/index.js';
import {
  parseSecurityAuditEvent,
  type SecurityAuditEvent,
} from './security-audit-event.js';

export type SecurityAuditPersistenceError =
  | 'INVALID_AUDIT_EVENT'
  | 'DATABASE_UNAVAILABLE';

export type IdempotentSecurityAuditPersistenceError =
  | SecurityAuditPersistenceError
  | 'INVALID_EVENT_ID'
  | 'IDEMPOTENCY_CONFLICT';

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

export type IdempotentSecurityAuditPersistenceResult =
  | {
      ok: true;
      id: string;
      storedAt: string;
      duplicate: boolean;
    }
  | {
      ok: false;
      error: 'INVALID_AUDIT_EVENT' | 'INVALID_EVENT_ID' | 'IDEMPOTENCY_CONFLICT';
      retryable: false;
    }
  | {
      ok: false;
      error: 'DATABASE_UNAVAILABLE';
      retryable: true;
    };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function rowMatchesEvent(
  row: {
    schemaVersion: string;
    eventType: string;
    occurredAt: Date;
    actorKind: string;
    actorSubject: string | null;
    actorRole: string | null;
    action: string;
    targetScope: string;
    targetRef: string | null;
    outcome: string;
    reason: string;
  },
  event: SecurityAuditEvent,
): boolean {
  return (
    row.schemaVersion === event.schemaVersion
    && row.eventType === event.eventType
    && row.occurredAt.toISOString() === event.occurredAt
    && row.actorKind === event.actor.kind
    && row.actorSubject === event.actor.subject
    && row.actorRole === event.actor.role
    && row.action === event.action
    && row.targetScope === event.target.scope
    && row.targetRef === event.target.ref
    && row.outcome === event.outcome
    && row.reason === event.reason
  );
}

/**
 * Persist one canonical audit event under a caller-supplied transport UUID.
 *
 * The UUID becomes the durable row primary key. A retry with the same UUID and
 * identical canonical event is acknowledged as a duplicate. Reusing the UUID
 * for different audit material fails closed as an idempotency conflict.
 */
export async function persistSecurityAuditEventIdempotent(
  input: unknown,
  eventId: string,
): Promise<IdempotentSecurityAuditPersistenceResult> {
  if (!UUID_RE.test(eventId)) {
    return {
      ok: false,
      error: 'INVALID_EVENT_ID',
      retryable: false,
    };
  }

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
      .values({ id: eventId, ...toRow(event) })
      .onConflictDoNothing({ target: securityAuditEvents.id })
      .returning({
        id: securityAuditEvents.id,
        storedAt: securityAuditEvents.storedAt,
      });

    if (created) {
      return {
        ok: true,
        id: created.id,
        storedAt: created.storedAt.toISOString(),
        duplicate: false,
      };
    }

    const [existing] = await db
      .select({
        id: securityAuditEvents.id,
        schemaVersion: securityAuditEvents.schemaVersion,
        eventType: securityAuditEvents.eventType,
        occurredAt: securityAuditEvents.occurredAt,
        actorKind: securityAuditEvents.actorKind,
        actorSubject: securityAuditEvents.actorSubject,
        actorRole: securityAuditEvents.actorRole,
        action: securityAuditEvents.action,
        targetScope: securityAuditEvents.targetScope,
        targetRef: securityAuditEvents.targetRef,
        outcome: securityAuditEvents.outcome,
        reason: securityAuditEvents.reason,
        storedAt: securityAuditEvents.storedAt,
      })
      .from(securityAuditEvents)
      .where(eq(securityAuditEvents.id, eventId))
      .limit(1);

    if (!existing) {
      return {
        ok: false,
        error: 'DATABASE_UNAVAILABLE',
        retryable: true,
      };
    }

    if (!rowMatchesEvent(existing, event)) {
      return {
        ok: false,
        error: 'IDEMPOTENCY_CONFLICT',
        retryable: false,
      };
    }

    return {
      ok: true,
      id: existing.id,
      storedAt: existing.storedAt.toISOString(),
      duplicate: true,
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
