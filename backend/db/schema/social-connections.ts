import { sql } from 'drizzle-orm';
import { boolean, check, index, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

/**
 * Canonical social connections (WORLD-SOCIAL-02 / #595, #46 trust ladder, decision #48 L3).
 *
 * One row per unordered pair (low id < high id). States gate actions only: no score,
 * no automatic upgrade. PENDING -> CONNECTED on acceptance; a decline is kept as
 * DECLINED so the declined person cannot ask again (only the decliner can reopen).
 * TRUSTED is a directional, user-granted flag that requires CONNECTED. A block
 * dissolves PENDING/CONNECTED rows. Realtime transports (Nakama) never own this.
 */
export const socialConnections = pgTable('social_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userLowId: uuid('user_low_id').notNull().references(() => users.id),
  userHighId: uuid('user_high_id').notNull().references(() => users.id),
  status: varchar('status', { length: 20 }).notNull(),
  requestedByLow: boolean('requested_by_low').notNull(),
  lowTrustsHigh: boolean('low_trusts_high').default(false).notNull(),
  highTrustsLow: boolean('high_trusts_low').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  connectedAt: timestamp('connected_at', { withTimezone: true }),
}, (table) => [
  unique('uq_social_connections_pair').on(table.userLowId, table.userHighId),
  index('idx_social_connections_high').on(table.userHighId),
  check('chk_social_connections_ordered_pair', sql`${table.userLowId} < ${table.userHighId}`),
  check('chk_social_connections_status', sql`${table.status} IN ('PENDING', 'CONNECTED', 'DECLINED')`),
  check('chk_social_connections_connected_at', sql`(${table.status} = 'CONNECTED') = (${table.connectedAt} IS NOT NULL)`),
  check('chk_social_connections_trust_requires_connection',
    sql`${table.status} = 'CONNECTED' OR (NOT ${table.lowTrustsHigh} AND NOT ${table.highTrustsLow})`),
]);

/**
 * World presence visibility consent (decision #48 L2): invisible by default, opt-in per
 * World session (`expires_at`), withdrawal recorded. Purpose is World presence only.
 */
export const worldPresenceConsents = pgTable('world_presence_consents', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
}, (table) => [
  check('chk_world_presence_consents_window', sql`${table.expiresAt} > ${table.grantedAt}`),
  check('chk_world_presence_consents_withdrawn_after_grant',
    sql`${table.withdrawnAt} IS NULL OR ${table.withdrawnAt} >= ${table.grantedAt}`),
]);
