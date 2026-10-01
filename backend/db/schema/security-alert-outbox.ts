import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { securityDetectionHistory } from './security-detection-history.js';
import { securityAuditEvents } from './security-audit.js';

export const securityAlertOutbox = pgTable(
  'security_alert_outbox',
  {
    alertId: uuid('alert_id').primaryKey().defaultRandom(),
    sourceDetectionHistoryId: uuid('source_detection_history_id')
      .notNull()
      .references(() => securityDetectionHistory.detectionId),
    routingPolicyRevision: varchar('routing_policy_revision', { length: 64 }).notNull(),
    schemaVersion: varchar('schema_version', { length: 64 }).notNull(),
    sourceDetectionType: varchar('source_detection_type', { length: 64 }).notNull(),
    severity: varchar('severity', { length: 16 }).notNull(),
    primaryOwner: varchar('primary_owner', { length: 32 }).notNull(),
    detectedAt: timestamp('detected_at', { withTimezone: true }).notNull(),
    acknowledgeBy: timestamp('acknowledge_by', { withTimezone: true }).notNull(),
    escalationOwner: varchar('escalation_owner', { length: 32 }).notNull(),
    escalateAt: timestamp('escalate_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_security_alert_outbox_source_policy')
      .on(table.sourceDetectionHistoryId, table.routingPolicyRevision),
    index('idx_security_alert_outbox_created_at').on(table.createdAt),
    check(
      'chk_security_alert_outbox_policy_revision',
      sql`${table.routingPolicyRevision} ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'`,
    ),
    check(
      'chk_security_alert_outbox_schema',
      sql`${table.schemaVersion} = 'security-alert-delivery-v1'`,
    ),
    check(
      'chk_security_alert_outbox_detection_type',
      sql`${table.sourceDetectionType} IN (
        'repeated_privileged_denials',
        'rapid_multi_target_access',
        'machine_privileged_authority_attempt'
      )`,
    ),
    check(
      'chk_security_alert_outbox_severity',
      sql`${table.severity} IN ('medium', 'high', 'critical')`,
    ),
    check(
      'chk_security_alert_outbox_primary_owner',
      sql`${table.primaryOwner} IN ('security_duty', 'incident_commander')`,
    ),
    check(
      'chk_security_alert_outbox_escalation_owner',
      sql`${table.escalationOwner} IN ('security_duty', 'incident_commander')`,
    ),
    check(
      'chk_security_alert_outbox_chronology',
      sql`${table.acknowledgeBy} >= ${table.detectedAt}
        AND ${table.escalateAt} >= ${table.acknowledgeBy}`,
    ),
  ],
);

export const securityAlertDeliveryAttempts = pgTable(
  'security_alert_delivery_attempts',
  {
    attemptId: uuid('attempt_id').primaryKey(),
    alertId: uuid('alert_id')
      .notNull()
      .references(() => securityAlertOutbox.alertId, { onDelete: 'cascade' }),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull(),
    state: varchar('state', { length: 32 }).notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    providerReceiptRef: varchar('provider_receipt_ref', { length: 128 }),
    failureCode: varchar('failure_code', { length: 32 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_security_alert_delivery_attempts_one_pending')
      .on(table.alertId)
      .where(sql`${table.state} = 'PENDING'`),
    index('idx_security_alert_delivery_attempts_alert')
      .on(table.alertId, table.attemptedAt),
    check(
      'chk_security_alert_delivery_attempt_state',
      sql`${table.state} IN ('PENDING', 'DELIVERED', 'ATTEMPT_FAILED')`,
    ),
    check(
      'chk_security_alert_delivery_attempt_shape',
      sql`(
        ${table.state} = 'PENDING'
        AND ${table.resolvedAt} IS NULL
        AND ${table.providerReceiptRef} IS NULL
        AND ${table.failureCode} IS NULL
      ) OR (
        ${table.state} = 'DELIVERED'
        AND ${table.resolvedAt} IS NOT NULL
        AND ${table.resolvedAt} >= ${table.attemptedAt}
        AND ${table.providerReceiptRef} ~ '^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$'
        AND ${table.failureCode} IS NULL
      ) OR (
        ${table.state} = 'ATTEMPT_FAILED'
        AND ${table.resolvedAt} IS NOT NULL
        AND ${table.resolvedAt} >= ${table.attemptedAt}
        AND ${table.providerReceiptRef} IS NULL
        AND ${table.failureCode} IN (
          'PROVIDER_UNAVAILABLE',
          'PROVIDER_REJECTED',
          'DELIVERY_TIMEOUT',
          'ADAPTER_FAILURE'
        )
      )`,
    ),
  ],
);


export const securityAlertAcknowledgements = pgTable(
  'security_alert_acknowledgements',
  {
    alertId: uuid('alert_id')
      .primaryKey()
      .references(() => securityAlertOutbox.alertId, { onDelete: 'cascade' }),
    requestId: uuid('request_id').notNull(),
    actorSubject: uuid('actor_subject').notNull(),
    actorRole: varchar('actor_role', { length: 16 }).notNull(),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }).notNull(),
    auditEventId: uuid('audit_event_id')
      .notNull()
      .references(() => securityAuditEvents.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_security_alert_acknowledgements_request_id')
      .on(table.requestId),
    uniqueIndex('uq_security_alert_acknowledgements_audit_event_id')
      .on(table.auditEventId),
    index('idx_security_alert_acknowledgements_actor_time')
      .on(table.actorSubject, table.acknowledgedAt),
    check(
      'chk_security_alert_acknowledgements_actor_role',
      sql`${table.actorRole} IN ('admin', 'operator')`,
    ),
  ],
);
