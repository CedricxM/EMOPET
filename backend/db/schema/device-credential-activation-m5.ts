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
 * Durable M5 manufacturing/debug evidence consumed by the #771 resolver.
 *
 * This is a read authority only from backend runtime perspective. The row
 * records an already-established manufacturing fact; it does not create or
 * prove APPROTECT by itself.
 */
export const deviceCredentialActivationDebugReceipts = pgTable(
  'device_credential_activation_debug_receipts',
  {
    receiptId: uuid('receipt_id').primaryKey(),
    deviceId: uuid('device_id').notNull().references(() => devices.id),
    credentialVersion: bigint('credential_version', { mode: 'number' }).notNull(),
    authority: varchar('authority', { length: 64 }).notNull(),
    debugStateResult: varchar('debug_state_result', { length: 64 }).notNull(),
    firmwareVersion: varchar('firmware_version', { length: 128 }).notNull(),
    hardwareRevision: varchar('hardware_revision', { length: 128 }).notNull(),
    bootstrapRevision: varchar('bootstrap_revision', { length: 128 }).notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_device_credential_activation_debug_receipts_device_version')
      .on(table.deviceId, table.credentialVersion),
    check(
      'chk_device_credential_activation_debug_receipts_version',
      sql`${table.credentialVersion} BETWEEN 1 AND 4294967295`,
    ),
    check(
      'chk_device_credential_activation_debug_receipts_authority',
      sql`${table.authority} = 'SERVER_SIDE_PRODUCTION_DEBUG_AUTHORITY'`,
    ),
    check(
      'chk_device_credential_activation_debug_receipts_result',
      sql`${table.debugStateResult} = 'APPROTECT_PRODUCTION_POLICY_VERIFIED'`,
    ),
  ],
);

/**
 * Durable representative-target evidence consumed by the #771 resolver.
 *
 * The backend does not generate this verdict. A controlled manufacturing /
 * hardware authority must create the evidence outside this runtime path.
 */
export const deviceCredentialActivationTargetReceipts = pgTable(
  'device_credential_activation_target_receipts',
  {
    receiptId: uuid('receipt_id').primaryKey(),
    deviceId: uuid('device_id').notNull().references(() => devices.id),
    credentialVersion: bigint('credential_version', { mode: 'number' }).notNull(),
    authority: varchar('authority', { length: 64 }).notNull(),
    targetResult: varchar('target_result', { length: 64 }).notNull(),
    firmwareVersion: varchar('firmware_version', { length: 128 }).notNull(),
    hardwareRevision: varchar('hardware_revision', { length: 128 }).notNull(),
    bootstrapRevision: varchar('bootstrap_revision', { length: 128 }).notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_device_credential_activation_target_receipts_device_version')
      .on(table.deviceId, table.credentialVersion),
    check(
      'chk_device_credential_activation_target_receipts_version',
      sql`${table.credentialVersion} BETWEEN 1 AND 4294967295`,
    ),
    check(
      'chk_device_credential_activation_target_receipts_authority',
      sql`${table.authority} = 'SERVER_SIDE_TARGET_EVIDENCE_AUTHORITY'`,
    ),
    check(
      'chk_device_credential_activation_target_receipts_result',
      sql`${table.targetResult} = 'REPRESENTATIVE_MS88SF3_NRF52840_VERIFIED'`,
    ),
  ],
);
