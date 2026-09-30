import { sql } from 'drizzle-orm';
import {
  check,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { securityAuditEvents } from './security-audit.js';

/**
 * Minimal durable scheduler cursor for #769/#776.
 *
 * This is operational state only. It stores no actor, target, detection body,
 * policy payload or alert history.
 */
export const securityDetectionSchedulerState = pgTable(
  'security_detection_scheduler_state',
  {
    streamId: varchar('stream_id', { length: 64 }).primaryKey(),
    monitoringStartedAt: timestamp('monitoring_started_at', {
      withTimezone: true,
    }).notNull(),
    lastSuccessfulWindowEnd: timestamp('last_successful_window_end', {
      withTimezone: true,
    }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'chk_security_detection_scheduler_state_stream_id',
      sql`${table.streamId} = 'security-audit-v1'`,
    ),
    check(
      'chk_security_detection_scheduler_state_monitoring_scope',
      sql`${table.monitoringStartedAt} <= ${table.lastSuccessfulWindowEnd}`,
    ),
    check(
      'chk_security_detection_scheduler_state_time_order',
      sql`${table.updatedAt} >= ${table.lastSuccessfulWindowEnd}`,
    ),
  ],
);

/**
 * Minimal at-least-once evaluation receipt for canonical audit rows.
 *
 * The primary key is the canonical durable audit-event id. This table contains
 * no actor/target data and does not represent an alert or detection result.
 */
export const securityDetectionEvaluatedEvents = pgTable(
  'security_detection_evaluated_events',
  {
    auditEventId: uuid('audit_event_id')
      .primaryKey()
      .references(() => securityAuditEvents.id, { onDelete: 'cascade' }),
    evaluatedAt: timestamp('evaluated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
);
