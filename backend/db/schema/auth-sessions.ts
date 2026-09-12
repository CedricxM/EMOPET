import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const authRefreshSessions = pgTable('auth_refresh_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  familyId: uuid('family_id').notNull(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokeReason: varchar('revoke_reason', { length: 50 }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_auth_refresh_sessions_user').on(table.userId),
  index('idx_auth_refresh_sessions_family').on(table.familyId),
  index('idx_auth_refresh_sessions_expiry').on(table.expiresAt),
]);
