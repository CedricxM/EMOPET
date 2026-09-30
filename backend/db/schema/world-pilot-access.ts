import { sql } from 'drizzle-orm';
import { check, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

/**
 * Canonical World pilot access (WORLD-SOCIAL-03 / #596, decision #48 L1).
 *
 * Invited adult testers only: no grant without the tester's self-declared
 * adulthood. EMOPET owns the flag; Nakama keeps only a derived projection.
 * Revocation keeps the row (`revoked_at`). Erasure disposition is TO_CONFIRM,
 * hence no onDelete behaviour.
 */
export const worldPilotAccess = pgTable('world_pilot_access', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  adultSelfDeclaredAt: timestamp('adult_self_declared_at', { withTimezone: true }).notNull(),
  grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (table) => [
  check('chk_world_pilot_access_declared_before_grant', sql`${table.adultSelfDeclaredAt} <= ${table.grantedAt}`),
  check('chk_world_pilot_access_revoked_after_grant', sql`${table.revokedAt} IS NULL OR ${table.revokedAt} >= ${table.grantedAt}`),
]);
