import { eq } from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
  deviceCredentialActivationDebugReceipts,
  deviceCredentialActivationTargetReceipts,
} from '../../db/schema/index.js';
import type {
  DebugStateEvidenceRecordV1,
  DebugStateEvidenceStore,
  TargetEvidenceRecordV1,
  TargetEvidenceStore,
} from './device-credential-activation-evidence-resolver.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function debugRowToEvidence(
  row: typeof deviceCredentialActivationDebugReceipts.$inferSelect,
): DebugStateEvidenceRecordV1 {
  return {
    receiptId: row.receiptId,
    authority: 'SERVER_SIDE_PRODUCTION_DEBUG_AUTHORITY',
    deviceId: row.deviceId,
    credentialVersion: row.credentialVersion,
    debugStateResult: 'APPROTECT_PRODUCTION_POLICY_VERIFIED',
    firmwareVersion: row.firmwareVersion,
    hardwareRevision: row.hardwareRevision,
    bootstrapRevision: row.bootstrapRevision,
    recordedAt: row.recordedAt.toISOString(),
  };
}

function targetRowToEvidence(
  row: typeof deviceCredentialActivationTargetReceipts.$inferSelect,
): TargetEvidenceRecordV1 {
  return {
    receiptId: row.receiptId,
    authority: 'SERVER_SIDE_TARGET_EVIDENCE_AUTHORITY',
    deviceId: row.deviceId,
    credentialVersion: row.credentialVersion,
    targetResult: 'REPRESENTATIVE_MS88SF3_NRF52840_VERIFIED',
    firmwareVersion: row.firmwareVersion,
    hardwareRevision: row.hardwareRevision,
    bootstrapRevision: row.bootstrapRevision,
    recordedAt: row.recordedAt.toISOString(),
  };
}

/**
 * Read-only backend authority for already-established M5 manufacturing
 * evidence. No method in this module can create a debug/APPROTECT verdict.
 */
export const durableDeviceCredentialActivationDebugEvidenceRepository:
  DebugStateEvidenceStore = {
    async findByReceiptId(receiptId) {
      if (!UUID_RE.test(receiptId)) return null;

      const [row] = await db
        .select()
        .from(deviceCredentialActivationDebugReceipts)
        .where(eq(deviceCredentialActivationDebugReceipts.receiptId, receiptId))
        .limit(1);

      return row ? debugRowToEvidence(row) : null;
    },
  };

/**
 * Read-only backend authority for representative MS88SF3/nRF52840 evidence.
 * Receipt generation remains outside the runtime backend.
 */
export const durableDeviceCredentialActivationTargetEvidenceRepository:
  TargetEvidenceStore = {
    async findByReceiptId(receiptId) {
      if (!UUID_RE.test(receiptId)) return null;

      const [row] = await db
        .select()
        .from(deviceCredentialActivationTargetReceipts)
        .where(eq(deviceCredentialActivationTargetReceipts.receiptId, receiptId))
        .limit(1);

      return row ? targetRowToEvidence(row) : null;
    },
  };
