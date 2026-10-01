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
import { devicePopChallenges } from './device-pop-challenges.js';

/**
 * Durable M4 proof-of-possession evidence for credential activation.
 *
 * Bounded server-side evidence only. No signature, public/private key, nonce,
 * response body, M5 debug evidence or activation authority is stored here.
 */
export const deviceCredentialActivationPopReceipts = pgTable(
  'device_credential_activation_pop_receipts',
  {
    receiptId: uuid('receipt_id').primaryKey(),
    deviceId: uuid('device_id').notNull().references(() => devices.id),
    credentialVersion: bigint('credential_version', { mode: 'number' }).notNull(),
    challengeId: uuid('challenge_id')
      .notNull()
      .references(() => devicePopChallenges.challengeId),
    authority: varchar('authority', { length: 64 }).notNull(),
    verificationResult: varchar('verification_result', { length: 32 }).notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_device_credential_activation_pop_receipts_challenge_id')
      .on(table.challengeId),
    index('idx_device_credential_activation_pop_receipts_device_version')
      .on(table.deviceId, table.credentialVersion),
    check(
      'chk_device_credential_activation_pop_receipts_version',
      sql`${table.credentialVersion} BETWEEN 1 AND 4294967295`,
    ),
    check(
      'chk_device_credential_activation_pop_receipts_authority',
      sql`${table.authority} = 'SERVER_SIDE_POP_VERIFICATION_AUTHORITY'`,
    ),
    check(
      'chk_device_credential_activation_pop_receipts_result',
      sql`${table.verificationResult} = 'VERIFIED_AND_CONSUMED'`,
    ),
    check(
      'chk_device_credential_activation_pop_receipts_time',
      sql`${table.consumedAt} = ${table.verifiedAt}`,
    ),
  ],
);
