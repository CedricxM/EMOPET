import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { devices } from './dogs.js';
import { deviceIdentityCredentials } from './device-identity.js';
import { devicePopChallenges } from './device-pop-challenges.js';

/**
 * Durable M4 proof receipt for the manufacturing credential-activation lane.
 *
 * The row is created only by the atomic challenge-consume authority after
 * cryptographic verification succeeds. It contains no signature, nonce,
 * public/private key or caller-supplied verdict boolean.
 */
export const deviceCredentialActivationPopReceipts = pgTable(
  'device_credential_activation_pop_receipts',
  {
    receiptId: uuid('receipt_id').primaryKey(),
    deviceId: uuid('device_id').notNull().references(() => devices.id),
    credentialId: uuid('credential_id')
      .notNull()
      .references(() => deviceIdentityCredentials.id),
    credentialVersion: bigint('credential_version', { mode: 'number' }).notNull(),
    challengeId: uuid('challenge_id')
      .notNull()
      .references(() => devicePopChallenges.challengeId),
    authority: varchar('authority', { length: 64 }).notNull(),
    purpose: varchar('purpose', { length: 48 }).notNull(),
    verificationResult: varchar('verification_result', { length: 32 }).notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_device_credential_activation_pop_receipts_challenge').on(
      table.challengeId,
    ),
    index('idx_device_credential_activation_pop_receipts_device_version').on(
      table.deviceId,
      table.credentialVersion,
    ),
    check(
      'chk_device_credential_activation_pop_receipts_version',
      sql`${table.credentialVersion} BETWEEN 1 AND 4294967295`,
    ),
    check(
      'chk_device_credential_activation_pop_receipts_authority',
      sql`${table.authority} = 'SERVER_SIDE_POP_VERIFICATION_AUTHORITY'`,
    ),
    check(
      'chk_device_credential_activation_pop_receipts_purpose',
      sql`${table.purpose} = 'DEVICE_CREDENTIAL_ACTIVATION'`,
    ),
    check(
      'chk_device_credential_activation_pop_receipts_result',
      sql`${table.verificationResult} = 'VERIFIED_AND_CONSUMED'`,
    ),
    check(
      'chk_device_credential_activation_pop_receipts_time',
      sql`${table.consumedAt} >= ${table.verifiedAt}`,
    ),
  ],
);
