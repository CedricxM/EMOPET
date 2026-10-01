import { sql } from 'drizzle-orm';
import {
  check,
  integer,
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
    lastSuccessfulWindowEnd: timestamp('last_successful_window_end', {
      withTimezone: true,
    }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    monitoringStartedAt: timestamp('monitoring_started_at', {
      withTimezone: true,
    }).notNull(),
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
 * Minimal operational health receipt for the scheduler.
 *
 * This is deliberately separate from the progress cursor. It contains no
 * actor, target, policy payload, audit-event copy, detection body or alert.
 */
export const securityDetectionSchedulerHealth = pgTable(
  'security_detection_scheduler_health',
  {
    streamId: varchar('stream_id', { length: 64 }).primaryKey(),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
    lastStatus: varchar('last_status', { length: 64 }).notNull(),
    consecutiveFailures: integer('consecutive_failures').default(0).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'chk_security_detection_scheduler_health_stream_id',
      sql`${table.streamId} = 'security-audit-v1'`,
    ),
    check(
      'chk_security_detection_scheduler_health_status',
      sql`${table.lastStatus} IN (
        'INITIAL_CURSOR_REQUIRED',
        'BUSY',
        'WINDOW_NOT_READY',
        'SCAN_FAILED',
        'LATE_EVENT_LIMIT_EXCEEDED',
        'LATE_SCAN_FAILED',
        'EVALUATED',
        'SCHEDULER_UNAVAILABLE'
      )`,
    ),
    check(
      'chk_security_detection_scheduler_health_failure_count',
      sql`${table.consecutiveFailures} >= 0`,
    ),
    check(
      'chk_security_detection_scheduler_health_success_shape',
      sql`(
        ${table.lastStatus} <> 'EVALUATED'
        OR (
          ${table.lastSuccessAt} IS NOT NULL
          AND ${table.consecutiveFailures} = 0
        )
      )`,
    ),
    check(
      'chk_security_detection_scheduler_health_failure_shape',
      sql`(
        ${table.lastStatus} NOT IN (
          'INITIAL_CURSOR_REQUIRED',
          'SCAN_FAILED',
          'LATE_EVENT_LIMIT_EXCEEDED',
          'LATE_SCAN_FAILED',
          'SCHEDULER_UNAVAILABLE'
        )
        OR ${table.consecutiveFailures} >= 1
      )`,
    ),
    check(
      'chk_security_detection_scheduler_health_time_order',
      sql`(
        (${table.lastSuccessAt} IS NULL OR ${table.lastSuccessAt} <= ${table.lastAttemptAt})
        AND ${table.updatedAt} >= ${table.lastAttemptAt}
      )`,
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
