import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { devices } from './dogs.js';
import { deviceIdentityCredentials } from './device-identity.js';

/**
 * Durable audit receipt for an already-authorized credential activation.
 *
 * This table is not M4/M5 evidence authority. It records the exact references
 * consumed by the future activation service and the atomic database result.
 */
export const deviceCredentialActivationReceipts = pgTable(
  'device_credential_activation_receipts',
  {
    activationId: uuid('activation_id').primaryKey(),
    schemaVersion: varchar('schema_version', { length: 64 }).notNull(),
    protocolVersion: integer('protocol_version').notNull(),

    deviceId: uuid('device_id').notNull().references(() => devices.id),
    credentialId: uuid('credential_id')
      .notNull()
      .references(() => deviceIdentityCredentials.id),
    credentialVersion: bigint('credential_version', { mode: 'number' }).notNull(),

    predecessorCredentialId: uuid('predecessor_credential_id')
      .references(() => deviceIdentityCredentials.id),
    predecessorCredentialVersion: bigint('predecessor_credential_version', {
      mode: 'number',
    }),

    cutoverType: varchar('cutover_type', { length: 16 }).notNull(),

    evidenceSchemaVersion: varchar('evidence_schema_version', {
      length: 72,
    }).notNull(),
    evidenceProtocolVersion: integer('evidence_protocol_version').notNull(),
    popVerificationReceiptId: uuid('pop_verification_receipt_id').notNull(),
    popChallengeId: uuid('pop_challenge_id').notNull(),
    debugStateReceiptId: uuid('debug_state_receipt_id').notNull(),
    targetEvidenceReceiptId: uuid('target_evidence_receipt_id').notNull(),
    evidenceAuthority: varchar('evidence_authority', { length: 64 }).notNull(),
    evidenceRecordedAt: timestamp('evidence_recorded_at', {
      withTimezone: true,
    }).notNull(),

    firmwareVersion: varchar('firmware_version', { length: 128 }).notNull(),
    hardwareRevision: varchar('hardware_revision', { length: 128 }).notNull(),
    bootstrapRevision: varchar('bootstrap_revision', { length: 128 }).notNull(),

    resultingCredentialState: varchar('resulting_credential_state', {
      length: 32,
    }).notNull(),
    predecessorResultingState: varchar('predecessor_resulting_state', {
      length: 32,
    }).notNull(),

    activatedAt: timestamp('activated_at', { withTimezone: true }).notNull(),
    deviceDataTrustAuthorized: boolean('device_data_trust_authorized').notNull(),
    networkTelemetryPersistenceAuthorized: boolean(
      'network_telemetry_persistence_authorized',
    ).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_device_credential_activation_receipts_device_version').on(
      table.deviceId,
      table.credentialVersion,
    ),
    uniqueIndex('uq_device_credential_activation_receipts_credential_id').on(
      table.credentialId,
    ),
    index('idx_device_credential_activation_receipts_device_activated_at').on(
      table.deviceId,
      table.activatedAt,
    ),
    check(
      'chk_device_credential_activation_receipts_schema',
      sql`${table.schemaVersion} = 'device-credential-activation-receipt-v1'
        AND ${table.protocolVersion} = 1
        AND ${table.evidenceSchemaVersion} = 'device-credential-activation-evidence-refs-v1'
        AND ${table.evidenceProtocolVersion} = 1`,
    ),
    check(
      'chk_device_credential_activation_receipts_version',
      sql`${table.credentialVersion} BETWEEN 1 AND 4294967295
        AND (
          ${table.predecessorCredentialVersion} IS NULL
          OR ${table.predecessorCredentialVersion} BETWEEN 1 AND 4294967295
        )`,
    ),
    check(
      'chk_device_credential_activation_receipts_cutover_type',
      sql`${table.cutoverType} IN ('INITIAL', 'ROTATION')`,
    ),
    check(
      'chk_device_credential_activation_receipts_authority',
      sql`${table.evidenceAuthority} = 'SERVER_SIDE_MANUFACTURING_EVIDENCE_AUTHORITY'`,
    ),
    check(
      'chk_device_credential_activation_receipts_result_states',
      sql`${table.resultingCredentialState} = 'ACTIVE'
        AND ${table.predecessorResultingState} IN ('NONE', 'REVOKED_PENDING_ERASE')`,
    ),
    check(
      'chk_device_credential_activation_receipts_non_authority',
      sql`${table.deviceDataTrustAuthorized} = false
        AND ${table.networkTelemetryPersistenceAuthorized} = false`,
    ),
    check(
      'chk_device_credential_activation_receipts_time',
      sql`${table.activatedAt} >= ${table.evidenceRecordedAt}`,
    ),
    check(
      'chk_device_credential_activation_receipts_predecessor_shape',
      sql`(
          ${table.cutoverType} = 'INITIAL'
          AND ${table.predecessorCredentialId} IS NULL
          AND ${table.predecessorCredentialVersion} IS NULL
          AND ${table.predecessorResultingState} = 'NONE'
        ) OR (
          ${table.cutoverType} = 'ROTATION'
          AND ${table.predecessorCredentialId} IS NOT NULL
          AND ${table.predecessorCredentialVersion} IS NOT NULL
          AND ${table.predecessorResultingState} = 'REVOKED_PENDING_ERASE'
        )`,
    ),
    check(
      'chk_device_credential_activation_receipts_versions_differ',
      sql`${table.predecessorCredentialVersion} IS NULL
        OR ${table.predecessorCredentialVersion} <> ${table.credentialVersion}`,
    ),
  ],
);
