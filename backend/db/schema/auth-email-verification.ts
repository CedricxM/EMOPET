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

import { users } from './users.js';

export const authEmailVerificationTokens = pgTable('auth_email_verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokeReason: varchar('revoke_reason', { length: 32 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uq_auth_email_verification_tokens_token_hash').on(table.tokenHash),
  uniqueIndex('uq_auth_email_verification_tokens_live_per_user')
    .on(table.userId)
    .where(sql`${table.consumedAt} IS NULL AND ${table.revokedAt} IS NULL`),
  index('idx_auth_email_verification_tokens_user').on(table.userId),
  index('idx_auth_email_verification_tokens_expiry').on(table.expiresAt),
  check(
    'chk_auth_email_verification_tokens_hash',
    sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`,
  ),
  check(
    'chk_auth_email_verification_tokens_expiry',
    sql`${table.expiresAt} > ${table.createdAt}`,
  ),
  check(
    'chk_auth_email_verification_tokens_consumed_time',
    sql`${table.consumedAt} IS NULL OR (
      ${table.consumedAt} >= ${table.createdAt}
      AND ${table.consumedAt} < ${table.expiresAt}
    )`,
  ),
  check(
    'chk_auth_email_verification_tokens_revoked_time',
    sql`${table.revokedAt} IS NULL OR ${table.revokedAt} >= ${table.createdAt}`,
  ),
  check(
    'chk_auth_email_verification_tokens_terminal_state',
    sql`NOT (${table.consumedAt} IS NOT NULL AND ${table.revokedAt} IS NOT NULL)`,
  ),
  check(
    'chk_auth_email_verification_tokens_revoke_reason',
    sql`(
      ${table.revokedAt} IS NULL AND ${table.revokeReason} IS NULL
    ) OR (
      ${table.revokedAt} IS NOT NULL
      AND ${table.revokeReason} IN ('superseded', 'manual_revoke')
    )`,
  ),
]);
