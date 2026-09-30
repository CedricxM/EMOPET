import {
  and,
  eq,
  gt,
  isNull,
  lte,
} from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
  deviceCredentialActivationPopReceipts,
  deviceIdentityCredentials,
  devicePopChallenges,
} from '../../db/schema/index.js';
import type { PopVerificationEvidenceRecordV1 } from './device-credential-activation-evidence-resolver.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface CommitVerifiedActivationPopEvidenceInput {
  receiptId: string;
  deviceId: string;
  credentialVersion: number;
  challengeId: string;
  verifiedAt: string;
  consumedAt: string;
}

export interface DeviceCredentialActivationPopEvidenceAuthority {
  consumeAndPersistVerifiedEvidence(
    input: CommitVerifiedActivationPopEvidenceInput,
  ): Promise<PopVerificationEvidenceRecordV1 | null>;

  findByReceiptId(
    receiptId: string,
  ): Promise<PopVerificationEvidenceRecordV1 | null>;
}

function parseCanonicalIso(value: string): Date | null {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  const date = new Date(ms);
  return date.toISOString() === value ? date : null;
}

function rowToEvidence(
  row: typeof deviceCredentialActivationPopReceipts.$inferSelect,
): PopVerificationEvidenceRecordV1 {
  return {
    receiptId: row.receiptId,
    authority: 'SERVER_SIDE_POP_VERIFICATION_AUTHORITY',
    deviceId: row.deviceId,
    credentialVersion: row.credentialVersion,
    challengeId: row.challengeId,
    verificationResult: 'VERIFIED_AND_CONSUMED',
    verifiedAt: row.verifiedAt.toISOString(),
    consumedAt: row.consumedAt.toISOString(),
  };
}

/**
 * Durable manufacturing M4 evidence authority.
 *
 * CRITICAL: this service does not verify ECDSA itself. The manufacturing
 * verifier calls it only after signature verification succeeds. Its authority
 * is to atomically bind that successful verification to:
 * - an exact still-PENDING credential;
 * - the exact unconsumed activation-purpose challenge;
 * - one durable M4 receipt.
 *
 * No HTTP route or default runtime wiring is created here.
 */
export const durableDeviceCredentialActivationPopEvidenceRepository:
  DeviceCredentialActivationPopEvidenceAuthority = {
    async consumeAndPersistVerifiedEvidence(
      input: CommitVerifiedActivationPopEvidenceInput,
    ): Promise<PopVerificationEvidenceRecordV1 | null> {
      if (
        !UUID_RE.test(input.receiptId)
        || !UUID_RE.test(input.deviceId)
        || !UUID_RE.test(input.challengeId)
        || !Number.isSafeInteger(input.credentialVersion)
        || input.credentialVersion <= 0
        || input.credentialVersion > 0xffffffff
      ) {
        return null;
      }

      const verifiedAt = parseCanonicalIso(input.verifiedAt);
      const consumedAt = parseCanonicalIso(input.consumedAt);
      if (
        verifiedAt == null
        || consumedAt == null
        || consumedAt.getTime() < verifiedAt.getTime()
      ) {
        return null;
      }

      return db.transaction(async (tx) => {
        const [credential] = await tx
          .select({
            id: deviceIdentityCredentials.id,
            deviceId: deviceIdentityCredentials.deviceId,
            credentialVersion: deviceIdentityCredentials.credentialVersion,
            state: deviceIdentityCredentials.state,
          })
          .from(deviceIdentityCredentials)
          .where(and(
            eq(deviceIdentityCredentials.deviceId, input.deviceId),
            eq(
              deviceIdentityCredentials.credentialVersion,
              input.credentialVersion,
            ),
            eq(deviceIdentityCredentials.state, 'PENDING_PROOF'),
          ))
          .for('update')
          .limit(1);

        if (!credential || credential.state !== 'PENDING_PROOF') {
          return null;
        }

        const [consumed] = await tx
          .update(devicePopChallenges)
          .set({ consumedAt })
          .where(and(
            eq(devicePopChallenges.challengeId, input.challengeId),
            eq(devicePopChallenges.deviceId, input.deviceId),
            eq(
              devicePopChallenges.credentialVersion,
              input.credentialVersion,
            ),
            eq(
              devicePopChallenges.purpose,
              'DEVICE_CREDENTIAL_ACTIVATION',
            ),
            isNull(devicePopChallenges.consumedAt),
            lte(devicePopChallenges.issuedAt, verifiedAt),
            gt(devicePopChallenges.expiresAt, verifiedAt),
            lte(devicePopChallenges.issuedAt, consumedAt),
            gt(devicePopChallenges.expiresAt, consumedAt),
          ))
          .returning({
            challengeId: devicePopChallenges.challengeId,
          });

        if (!consumed) {
          return null;
        }

        const [stored] = await tx
          .insert(deviceCredentialActivationPopReceipts)
          .values({
            receiptId: input.receiptId,
            deviceId: input.deviceId,
            credentialId: credential.id,
            credentialVersion: input.credentialVersion,
            challengeId: input.challengeId,
            authority: 'SERVER_SIDE_POP_VERIFICATION_AUTHORITY',
            purpose: 'DEVICE_CREDENTIAL_ACTIVATION',
            verificationResult: 'VERIFIED_AND_CONSUMED',
            verifiedAt,
            consumedAt,
          })
          .returning();

        if (!stored) {
          throw new Error('M4 PoP receipt was not persisted');
        }

        return rowToEvidence(stored);
      });
    },

    async findByReceiptId(
      receiptId: string,
    ): Promise<PopVerificationEvidenceRecordV1 | null> {
      if (!UUID_RE.test(receiptId)) return null;

      const [row] = await db
        .select()
        .from(deviceCredentialActivationPopReceipts)
        .where(eq(deviceCredentialActivationPopReceipts.receiptId, receiptId))
        .limit(1);

      if (
        !row
        || row.authority !== 'SERVER_SIDE_POP_VERIFICATION_AUTHORITY'
        || row.purpose !== 'DEVICE_CREDENTIAL_ACTIVATION'
        || row.verificationResult !== 'VERIFIED_AND_CONSUMED'
      ) {
        return null;
      }

      return rowToEvidence(row);
    },
  };
