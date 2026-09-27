import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { devices } from './dogs.js';

/**
 * Durable public-key credential authority for Device Trust.
 *
 * EMPTY is represented by absence of a row for a slot. Enrollment may create
 * PENDING_PROOF only; ACTIVE/REVOKED_PENDING_ERASE are reserved for later,
 * separately-authorized lifecycle services.
 */
export const deviceIdentityCredentials = pgTable('device_identity_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').notNull().references(() => devices.id),
  credentialVersion: bigint('credential_version', { mode: 'number' }).notNull(),
  state: varchar('state', { length: 32 }).notNull(),
  keySlot: varchar('key_slot', { length: 1 }).notNull(),
  psaKeyId: integerCompat('psa_key_id').notNull(),
  algorithm: varchar('algorithm', { length: 32 }).notNull(),
  publicKeyFormat: varchar('public_key_format', { length: 40 }).notNull(),
  publicKeyBase64Url: varchar('public_key_base64url', { length: 87 }).notNull(),
  firmwareVersion: varchar('firmware_version', { length: 128 }).notNull(),
  hardwareRevision: varchar('hardware_revision', { length: 128 }).notNull(),
  bootstrapRevision: varchar('bootstrap_revision', { length: 128 }).notNull(),
  privateKeyExported: boolean('private_key_exported').notNull(),
  devicePrincipalBinding: varchar('device_principal_binding', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('uq_device_identity_credentials_device_version')
    .on(table.deviceId, table.credentialVersion),
  uniqueIndex('uq_device_identity_credentials_device_slot')
    .on(table.deviceId, table.keySlot),
  uniqueIndex('uq_device_identity_credentials_one_active_per_device')
    .on(table.deviceId)
    .where(sql`${table.state} = 'ACTIVE'`),
  uniqueIndex('uq_device_identity_credentials_one_pending_per_device')
    .on(table.deviceId)
    .where(sql`${table.state} = 'PENDING_PROOF'`),
  index('idx_device_identity_credentials_device_state')
    .on(table.deviceId, table.state),
  check(
    'chk_device_identity_credentials_version',
    sql`${table.credentialVersion} BETWEEN 1 AND 4294967295`,
  ),
  check(
    'chk_device_identity_credentials_state',
    sql`${table.state} IN ('PENDING_PROOF', 'ACTIVE', 'REVOKED_PENDING_ERASE')`,
  ),
  check(
    'chk_device_identity_credentials_slot_key',
    sql`(
      (${table.keySlot} = 'A' AND ${table.psaKeyId} = 65536)
      OR
      (${table.keySlot} = 'B' AND ${table.psaKeyId} = 65537)
    )`,
  ),
  check(
    'chk_device_identity_credentials_algorithm',
    sql`${table.algorithm} = 'ECDSA_P256_SHA256'`,
  ),
  check(
    'chk_device_identity_credentials_public_key_format',
    sql`${table.publicKeyFormat} = 'SEC1_UNCOMPRESSED_P256_65'`,
  ),
  check(
    'chk_device_identity_credentials_public_key',
    sql`${table.publicKeyBase64Url} ~ '^B[A-P][A-Za-z0-9_-]{85}$'`,
  ),
  check(
    'chk_device_identity_credentials_private_key_absent',
    sql`${table.privateKeyExported} = false`,
  ),
  check(
    'chk_device_identity_credentials_binding_authority',
    sql`${table.devicePrincipalBinding} = 'BACKEND_MANUFACTURING_AUTHORITY_REQUIRED'`,
  ),
  check(
    'chk_device_identity_credentials_state_timestamps',
    sql`(
      ${table.state} = 'PENDING_PROOF'
      AND ${table.activatedAt} IS NULL
      AND ${table.revokedAt} IS NULL
    ) OR (
      ${table.state} = 'ACTIVE'
      AND ${table.activatedAt} IS NOT NULL
      AND ${table.revokedAt} IS NULL
    ) OR (
      ${table.state} = 'REVOKED_PENDING_ERASE'
      AND ${table.activatedAt} IS NOT NULL
      AND ${table.revokedAt} IS NOT NULL
    )`,
  ),
]);

/**
 * pg-core's integer() is sufficient for PSA ids A/B and keeps this schema
 * intentionally ordinary. The helper is local so the table declaration stays
 * visually explicit.
 */
function integerCompat(name: string) {
  return bigint(name, { mode: 'number' });
}
