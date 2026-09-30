import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
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


/**
 * Durable delivery-intent outbox for email verification.
 *
 * Public routes persist only normalized email + SHA-256 email fingerprint.
 * The raw verification token and verification URL never enter this table.
 * Raw email is scrubbed when an intent reaches a terminal state; the retained
 * hash is pseudonymous rate-limit/deduplication evidence, not anonymous data.
 */
export const authEmailVerificationDeliveryRequests = pgTable(
  'auth_email_verification_delivery_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }),
    emailHash: varchar('email_hash', { length: 64 }).notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    availableAt: timestamp('available_at', { withTimezone: true }).defaultNow().notNull(),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    claimExpiresAt: timestamp('claim_expires_at', { withTimezone: true }),
    attemptCount: integer('attempt_count').default(0).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    outcome: varchar('outcome', { length: 32 }),
    lastError: varchar('last_error', { length: 32 }),
    providerMessageId: varchar('provider_message_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_auth_email_verification_delivery_active_email')
      .on(table.emailHash)
      .where(sql`${table.completedAt} IS NULL`),
    index('idx_auth_email_verification_delivery_ready')
      .on(table.availableAt, table.requestedAt)
      .where(sql`${table.completedAt} IS NULL`),
    index('idx_auth_email_verification_delivery_cooldown')
      .on(table.emailHash, table.requestedAt),
    check(
      'chk_auth_email_verification_delivery_email_hash',
      sql`${table.emailHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'chk_auth_email_verification_delivery_attempt_count',
      sql`${table.attemptCount} BETWEEN 0 AND 5`,
    ),
    check(
      'chk_auth_email_verification_delivery_availability',
      sql`${table.availableAt} >= ${table.requestedAt}`,
    ),
    check(
      'chk_auth_email_verification_delivery_claim',
      sql`(
        (${table.claimedAt} IS NULL AND ${table.claimExpiresAt} IS NULL)
        OR (
          ${table.claimedAt} IS NOT NULL
          AND ${table.claimExpiresAt} IS NOT NULL
          AND ${table.claimExpiresAt} > ${table.claimedAt}
        )
      )`,
    ),
    check(
      'chk_auth_email_verification_delivery_terminal',
      sql`(
        ${table.completedAt} IS NULL
        AND ${table.email} IS NOT NULL
        AND ${table.outcome} IS NULL
      ) OR (
        ${table.completedAt} IS NOT NULL
        AND ${table.completedAt} >= ${table.requestedAt}
        AND ${table.email} IS NULL
        AND ${table.claimedAt} IS NULL
        AND ${table.claimExpiresAt} IS NULL
        AND ${table.outcome} IN ('delivered', 'not_eligible', 'failed')
      )`,
    ),
    check(
      'chk_auth_email_verification_delivery_last_error',
      sql`${table.lastError} IS NULL OR ${table.lastError} IN (
        'provider_not_configured',
        'provider_rejected',
        'provider_unavailable',
        'invalid_input'
      )`,
    ),
  ],
);
