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

import { securityAlertOutbox } from './security-alert-outbox.js';
import { securityAuditEvents } from './security-audit.js';

export const securityAlertAcknowledgements = pgTable(
  'security_alert_acknowledgements',
  {
    alertId: uuid('alert_id')
      .primaryKey()
      .references(() => securityAlertOutbox.alertId, { onDelete: 'cascade' }),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }).notNull(),
    acknowledgedBySubject: uuid('acknowledged_by_subject').notNull(),
    acknowledgedByRole: varchar('acknowledged_by_role', { length: 16 }).notNull(),
    auditEventId: uuid('audit_event_id')
      .notNull()
      .references(() => securityAuditEvents.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_security_alert_acknowledgements_audit_event_id')
      .on(table.auditEventId),
    index('idx_security_alert_acknowledgements_acknowledged_at')
      .on(table.acknowledgedAt),
    check(
      'chk_security_alert_acknowledgements_role',
      sql`${table.acknowledgedByRole} IN ('admin', 'operator')`,
    ),
  ],
);
