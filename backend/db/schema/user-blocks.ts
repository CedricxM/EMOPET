import { sql } from 'drizzle-orm';
import { check, index, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

/**
 * Canonical user-to-user block (WORLD-SOCIAL-01 / #594, decision #48 L5).
 *
 * One-sided and silent to the blocked person. Realtime transports (Nakama) and
 * surfaces enforce it from here; they never own it. No free-text reason is kept.
 * Erasure: deleted with either account by the ordered erasure executor (founder
 * decision #594), never by a database cascade, hence no onDelete behaviour.
 */
export const userBlocks = pgTable('user_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  blockerUserId: uuid('blocker_user_id').notNull().references(() => users.id),
  blockedUserId: uuid('blocked_user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('uq_user_blocks_pair').on(table.blockerUserId, table.blockedUserId),
  index('idx_user_blocks_blocked').on(table.blockedUserId),
  check('chk_user_blocks_not_self', sql`${table.blockerUserId} <> ${table.blockedUserId}`),
]);
