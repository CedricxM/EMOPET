import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Durable repository-owned persistence for canonical security-audit-v1 events.
 *
 * This table does not establish DB-principal append-only authority, WORM
 * storage, tamper resistance, retention policy or a read surface.
 */
export const securityAuditEvents = pgTable(
  'security_audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schemaVersion: varchar('schema_version', { length: 32 }).notNull(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),

    actorKind: varchar('actor_kind', { length: 32 }).notNull(),
    actorSubject: varchar('actor_subject', { length: 128 }),
    actorRole: varchar('actor_role', { length: 16 }),

    action: varchar('action', { length: 64 }).notNull(),

    targetScope: varchar('target_scope', { length: 32 }).notNull(),
    targetRef: varchar('target_ref', { length: 128 }),

    outcome: varchar('outcome', { length: 16 }).notNull(),
    reason: varchar('reason', { length: 64 }).notNull(),

    storedAt: timestamp('stored_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_security_audit_events_occurred_at').on(table.occurredAt),
    index('idx_security_audit_events_actor_subject_occurred_at').on(
      table.actorSubject,
      table.occurredAt,
    ),
    index('idx_security_audit_events_target_occurred_at').on(
      table.targetScope,
      table.targetRef,
      table.occurredAt,
    ),
    check(
      'chk_security_audit_events_schema',
      sql`${table.schemaVersion} = 'security-audit-v1'`,
    ),
    check(
      'chk_security_audit_events_event_type',
      sql`${table.eventType} IN (
        'privileged_authority_decision',
        'privileged_sensitive_access',
        'security_incident_access'
      )`,
    ),
    check(
      'chk_security_audit_events_actor_shape',
      sql`(
        ${table.actorKind} = 'privileged_human'
        AND ${table.actorSubject} ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND ${table.actorRole} IN ('admin', 'support', 'operator')
      ) OR (
        ${table.actorKind} = 'owner'
        AND ${table.actorSubject} ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND ${table.actorRole} IS NULL
      ) OR (
        ${table.actorKind} = 'machine'
        AND ${table.actorSubject} ~ '^service:[a-zA-Z0-9._-]{1,96}$'
        AND ${table.actorRole} IS NULL
      ) OR (
        ${table.actorKind} = 'anonymous'
        AND ${table.actorSubject} IS NULL
        AND ${table.actorRole} IS NULL
      )`,
    ),
    check(
      'chk_security_audit_events_action',
      sql`${table.action} IN (
        'account.read_limited',
        'account.security_lock',
        'support.case.read_limited',
        'security.incident.read',
        'security.incident.coordinate',
        'moderation.queue.read',
        'moderation.post.manage',
        'contact.request.read',
        'contact.request.manage',
        'admin.data.read'
      )`,
    ),
    check(
      'chk_security_audit_events_target_shape',
      sql`(
        ${table.targetScope} = 'system'
        AND ${table.targetRef} IS NULL
      ) OR (
        ${table.targetScope} IN ('account', 'dog', 'support_case', 'security_incident')
        AND ${table.targetRef} ~ '^[a-zA-Z0-9:._-]{1,128}$'
      )`,
    ),
    check(
      'chk_security_audit_events_outcome_reason',
      sql`(
        ${table.outcome} = 'allowed'
        AND ${table.reason} = 'allowed'
      ) OR (
        ${table.outcome} = 'error'
        AND ${table.reason} = 'internal_error'
      ) OR (
        ${table.outcome} = 'denied'
        AND ${table.reason} IN (
          'invalid_principal',
          'mfa_required',
          'action_not_allowed',
          'machine_principal_not_supported',
          'not_found'
        )
      )`,
    ),
  ],
);
