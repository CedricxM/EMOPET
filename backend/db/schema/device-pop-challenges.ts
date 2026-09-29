import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { devices } from './dogs.js';

/**
 * Durable server-side replay authority for Device Trust PoP challenges.
 *
 * Challenge state only: no signatures, public/private keys, credential state
 * transitions or Device Data Trust authorization live in this table.
 */
export const devicePopChallenges = pgTable('device_pop_challenges', {
  challengeId: uuid('challenge_id').primaryKey(),
  deviceId: uuid('device_id').notNull().references(() => devices.id),
  credentialVersion: bigint('credential_version', { mode: 'number' }).notNull(),
  purpose: varchar('purpose', { length: 48 }).notNull(),
  nonce: varchar('nonce', { length: 43 }).notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  signingContract: varchar('signing_contract', { length: 48 }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_device_pop_challenges_device_credential')
    .on(table.deviceId, table.credentialVersion),
  index('idx_device_pop_challenges_expires_at')
    .on(table.expiresAt),
  check(
    'chk_device_pop_challenges_credential_version',
    sql`${table.credentialVersion} BETWEEN 1 AND 4294967295`,
  ),
  check(
    'chk_device_pop_challenges_purpose',
    sql`${table.purpose} = 'DEVICE_DATA_TELEMETRY_INGRESS'`,
  ),
  check(
    'chk_device_pop_challenges_signing_contract',
    sql`${table.signingContract} = 'EMOPET_DEVICE_POP_FIXED_BINARY_V1'`,
  ),
  check(
    'chk_device_pop_challenges_nonce',
    sql`${table.nonce} ~ '^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$'`,
  ),
  check(
    'chk_device_pop_challenges_expiry',
    sql`${table.expiresAt} > ${table.issuedAt}`,
  ),
  check(
    'chk_device_pop_challenges_consumed_time',
    sql`${table.consumedAt} IS NULL OR (
      ${table.consumedAt} >= ${table.issuedAt}
      AND ${table.consumedAt} < ${table.expiresAt}
    )`,
  ),
]);
