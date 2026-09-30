import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Shared fixed-window state for the public AUTH-01 abuse-control boundary.
 *
 * bucket_hash is an HMAC-SHA256 pseudonym of the request identity key. Raw IP
 * or forwarding-header values must never be persisted here.
 */
export const authRateLimitWindows = pgTable(
  'auth_rate_limit_windows',
  {
    bucketHash: varchar('bucket_hash', { length: 64 }).primaryKey(),
    count: integer('count').notNull(),
    windowStartedAt: timestamp('window_started_at', { withTimezone: true }).notNull(),
    resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('idx_auth_rate_limit_windows_reset_at').on(table.resetAt),
    check(
      'chk_auth_rate_limit_windows_bucket_hash',
      sql`${table.bucketHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'chk_auth_rate_limit_windows_count',
      sql`${table.count} BETWEEN 1 AND 1000000`,
    ),
    check(
      'chk_auth_rate_limit_windows_time_order',
      sql`${table.resetAt} > ${table.windowStartedAt}`,
    ),
    check(
      'chk_auth_rate_limit_windows_updated_at',
      sql`${table.updatedAt} >= ${table.windowStartedAt}
          AND ${table.updatedAt} < ${table.resetAt}`,
    ),
  ],
);
