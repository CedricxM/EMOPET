import { sql } from 'drizzle-orm';
import {
  check,
  pgTable,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Minimal durable scheduler cursor for #769.
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
  },
  (table) => [
    check(
      'chk_security_detection_scheduler_state_stream_id',
      sql`${table.streamId} = 'security-audit-v1'`,
    ),
    check(
      'chk_security_detection_scheduler_state_time_order',
      sql`${table.updatedAt} >= ${table.lastSuccessfulWindowEnd}`,
    ),
  ],
);
