import { and, eq } from 'drizzle-orm';

import {
  DeviceCredentialActivationReceiptV1Schema,
  type DeviceCredentialActivationReceiptV1,
} from '@emopet/shared';

import { db } from '../../db/index.js';
import {
  deviceCredentialActivationReceipts,
  deviceIdentityCredentials,
  devices,
} from '../../db/schema/index.js';

export type DeviceCredentialActivationCommitError =
  | 'INVALID_ACTIVATION_RECEIPT'
  | 'DEVICE_NOT_FOUND_OR_NOT_TAG'
  | 'PENDING_CREDENTIAL_NOT_FOUND'
  | 'ACTIVE_CREDENTIAL_EXISTS'
  | 'PREDECESSOR_NOT_ACTIVE'
  | 'CREDENTIAL_PROVENANCE_MISMATCH'
  | 'ACTIVATION_RECEIPT_EXISTS'
  | 'STATE_CHANGED'
  | 'DATABASE_UNAVAILABLE';

export type DeviceCredentialActivationCommitResult =
  | {
      ok: true;
      receipt: DeviceCredentialActivationReceiptV1;
      credential: typeof deviceIdentityCredentials.$inferSelect;
      predecessor: typeof deviceIdentityCredentials.$inferSelect | null;
    }
  | {
      ok: false;
      error: DeviceCredentialActivationCommitError;
      issues?: string[];
      retryable?: boolean;
    };

/**
 * Internal database primitive for #720.
 *
 * CRITICAL AUTHORITY BOUNDARY:
 * This function does NOT resolve or verify M4/M5 evidence. It may only receive
 * a receipt produced by the future server-side manufacturing-evidence
 * authority after all referenced proof/debug/target evidence has been resolved
 * and validated. No HTTP route or default evidence authority is wired here.
 *
 * Its responsibility is narrower: serialize on the canonical device, enforce
 * the PENDING/ACTIVE lifecycle, persist the receipt and make rotation atomic.
 */
export async function commitVerifiedDeviceCredentialActivationReceipt(
  rawReceipt: unknown,
): Promise<DeviceCredentialActivationCommitResult> {
  const parsed = DeviceCredentialActivationReceiptV1Schema.safeParse(rawReceipt);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'INVALID_ACTIVATION_RECEIPT',
      issues: parsed.error.issues.map((issue) =>
        `${issue.path.join('.') || '<root>'}: ${issue.message}`
      ),
    };
  }

  const receipt = parsed.data;
  const activatedAt = new Date(receipt.activatedAt);
  const evidenceRecordedAt = new Date(receipt.evidenceRefs.recordedAt);

  try {
    return await db.transaction(async (tx) => {
      const [device] = await tx
        .select({ id: devices.id, type: devices.type })
        .from(devices)
        .where(eq(devices.id, receipt.deviceId))
        .for('update')
        .limit(1);

      if (!device || device.type !== 'TAG') {
        return {
          ok: false,
          error: 'DEVICE_NOT_FOUND_OR_NOT_TAG',
        } as const;
      }

      const credentials = await tx
        .select()
        .from(deviceIdentityCredentials)
        .where(eq(deviceIdentityCredentials.deviceId, receipt.deviceId))
        .for('update');

      const pending = credentials.find(
        (row) =>
          row.credentialVersion === receipt.credentialVersion
          && row.state === 'PENDING_PROOF',
      );

      if (!pending) {
        return {
          ok: false,
          error: 'PENDING_CREDENTIAL_NOT_FOUND',
        } as const;
      }

      if (
        pending.firmwareVersion !== receipt.evidenceRefs.firmwareVersion
        || pending.hardwareRevision !== receipt.evidenceRefs.hardwareRevision
        || pending.bootstrapRevision !== receipt.evidenceRefs.bootstrapRevision
      ) {
        return {
          ok: false,
          error: 'CREDENTIAL_PROVENANCE_MISMATCH',
        } as const;
      }

      const [existingReceipt] = await tx
        .select({ activationId: deviceCredentialActivationReceipts.activationId })
        .from(deviceCredentialActivationReceipts)
        .where(and(
          eq(deviceCredentialActivationReceipts.deviceId, receipt.deviceId),
          eq(
            deviceCredentialActivationReceipts.credentialVersion,
            receipt.credentialVersion,
          ),
        ))
        .limit(1);

      if (existingReceipt) {
        return {
          ok: false,
          error: 'ACTIVATION_RECEIPT_EXISTS',
        } as const;
      }

      const active = credentials.find((row) => row.state === 'ACTIVE') ?? null;
      let predecessor: typeof deviceIdentityCredentials.$inferSelect | null = null;

      if (receipt.cutoverType === 'INITIAL') {
        if (active) {
          return {
            ok: false,
            error: 'ACTIVE_CREDENTIAL_EXISTS',
          } as const;
        }
      } else {
        if (
          !active
          || active.credentialVersion !== receipt.predecessorCredentialVersion
        ) {
          return {
            ok: false,
            error: 'PREDECESSOR_NOT_ACTIVE',
          } as const;
        }

        const [retired] = await tx
          .update(deviceIdentityCredentials)
          .set({
            state: 'REVOKED_PENDING_ERASE',
            revokedAt: activatedAt,
            updatedAt: activatedAt,
          })
          .where(and(
            eq(deviceIdentityCredentials.id, active.id),
            eq(deviceIdentityCredentials.state, 'ACTIVE'),
          ))
          .returning();

        if (!retired) {
          return {
            ok: false,
            error: 'STATE_CHANGED',
            retryable: true,
          } as const;
        }

        predecessor = retired;
      }

      const [activated] = await tx
        .update(deviceIdentityCredentials)
        .set({
          state: 'ACTIVE',
          activatedAt,
          revokedAt: null,
          updatedAt: activatedAt,
        })
        .where(and(
          eq(deviceIdentityCredentials.id, pending.id),
          eq(deviceIdentityCredentials.state, 'PENDING_PROOF'),
        ))
        .returning();

      if (!activated) {
        return {
          ok: false,
          error: 'STATE_CHANGED',
          retryable: true,
        } as const;
      }

      const [storedReceipt] = await tx
        .insert(deviceCredentialActivationReceipts)
        .values({
          activationId: receipt.activationId,
          schemaVersion: receipt.schemaVersion,
          protocolVersion: receipt.protocolVersion,
          deviceId: receipt.deviceId,
          credentialId: activated.id,
          credentialVersion: receipt.credentialVersion,
          predecessorCredentialId: predecessor?.id ?? null,
          predecessorCredentialVersion:
            receipt.predecessorCredentialVersion,
          cutoverType: receipt.cutoverType,
          evidenceSchemaVersion: receipt.evidenceRefs.schemaVersion,
          evidenceProtocolVersion: receipt.evidenceRefs.protocolVersion,
          popVerificationReceiptId:
            receipt.evidenceRefs.popVerificationReceiptId,
          popChallengeId: receipt.evidenceRefs.popChallengeId,
          debugStateReceiptId: receipt.evidenceRefs.debugStateReceiptId,
          targetEvidenceReceiptId: receipt.evidenceRefs.targetEvidenceReceiptId,
          evidenceAuthority: receipt.evidenceRefs.authority,
          evidenceRecordedAt,
          firmwareVersion: receipt.evidenceRefs.firmwareVersion,
          hardwareRevision: receipt.evidenceRefs.hardwareRevision,
          bootstrapRevision: receipt.evidenceRefs.bootstrapRevision,
          resultingCredentialState: receipt.resultingCredentialState,
          predecessorResultingState: receipt.predecessorResultingState,
          activatedAt,
          deviceDataTrustAuthorized: receipt.deviceDataTrustAuthorized,
          networkTelemetryPersistenceAuthorized:
            receipt.networkTelemetryPersistenceAuthorized,
        })
        .returning({ activationId: deviceCredentialActivationReceipts.activationId });

      if (!storedReceipt) {
        throw new Error('activation receipt was not persisted');
      }

      return {
        ok: true,
        receipt,
        credential: activated,
        predecessor,
      } as const;
    });
  } catch {
    return {
      ok: false,
      error: 'DATABASE_UNAVAILABLE',
      retryable: true,
    };
  }
}
