import { eq, sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
  deviceCredentialActivationPopReceipts,
  devicePopChallenges,
} from '../../db/schema/index.js';
import type {
  DeviceCredentialActivationPopEvidenceCommitV1,
  DeviceCredentialActivationPopEvidenceStore,
} from './device-credential-activation-pop-verifier.js';
import type {
  PopVerificationEvidenceRecordV1,
} from './device-credential-activation-evidence-resolver.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseCanonicalIso(value: string): Date | null {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value
    ? date
    : null;
}

function validCommit(
  input: DeviceCredentialActivationPopEvidenceCommitV1,
): { verifiedAt: Date } | null {
  if (
    !UUID_RE.test(input.receiptId)
    || !UUID_RE.test(input.deviceId)
    || !UUID_RE.test(input.challengeId)
    || !Number.isSafeInteger(input.credentialVersion)
    || input.credentialVersion < 1
    || input.credentialVersion > 4294967295
  ) {
    return null;
  }

  const verifiedAt = parseCanonicalIso(input.verifiedAt);
  return verifiedAt ? { verifiedAt } : null;
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
 * #803 durable M4 evidence authority.
 *
 * The caller may invoke commitVerifiedProof only after ECDSA verification.
 * This repository does not trust that assertion blindly: it re-locks and
 * revalidates the exact server-side challenge, consumes it and stores the
 * bounded receipt in one PostgreSQL transaction.
 */
export const durableDeviceCredentialActivationPopEvidenceRepository:
  DeviceCredentialActivationPopEvidenceStore = {
    async commitVerifiedProof(input) {
      const parsed = validCommit(input);
      if (!parsed) return null;

      return db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
        await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);

        const [challenge] = await tx
          .select()
          .from(devicePopChallenges)
          .where(eq(devicePopChallenges.challengeId, input.challengeId))
          .for('update')
          .limit(1);

        if (
          !challenge
          || challenge.consumedAt !== null
          || challenge.purpose !== 'DEVICE_CREDENTIAL_ACTIVATION'
          || challenge.deviceId !== input.deviceId
          || challenge.credentialVersion !== input.credentialVersion
          || parsed.verifiedAt < challenge.issuedAt
          || parsed.verifiedAt >= challenge.expiresAt
        ) {
          return null;
        }

        const [consumed] = await tx
          .update(devicePopChallenges)
          .set({ consumedAt: parsed.verifiedAt })
          .where(eq(devicePopChallenges.challengeId, challenge.challengeId))
          .returning({ challengeId: devicePopChallenges.challengeId });

        if (!consumed) {
          return null;
        }

        const [receipt] = await tx
          .insert(deviceCredentialActivationPopReceipts)
          .values({
            receiptId: input.receiptId,
            deviceId: challenge.deviceId,
            credentialVersion: challenge.credentialVersion,
            challengeId: challenge.challengeId,
            authority: 'SERVER_SIDE_POP_VERIFICATION_AUTHORITY',
            verificationResult: 'VERIFIED_AND_CONSUMED',
            verifiedAt: parsed.verifiedAt,
            consumedAt: parsed.verifiedAt,
          })
          .returning();

        if (!receipt) {
          throw new Error('M4 PoP receipt was not persisted');
        }

        return rowToEvidence(receipt);
      });
    },

    async findByReceiptId(receiptId) {
      if (!UUID_RE.test(receiptId)) return null;

      const [row] = await db
        .select()
        .from(deviceCredentialActivationPopReceipts)
        .where(eq(deviceCredentialActivationPopReceipts.receiptId, receiptId))
        .limit(1);

      return row ? rowToEvidence(row) : null;
    },
  };
