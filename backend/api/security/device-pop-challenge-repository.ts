import {
  and,
  eq,
  gt,
  isNull,
  lte,
} from 'drizzle-orm';

import {
  DevicePopChallengeV1Schema,
  type DevicePopChallengeV1,
} from '@emopet/shared';

import { db } from '../../db/index.js';
import { devicePopChallenges } from '../../db/schema/index.js';
import type {
  DevicePopChallengeStateV1,
  DevicePopChallengeStore,
} from './device-pop-challenge-issuer.js';
import type {
  DevicePopStoredChallengeStateV1,
  DevicePopVerificationChallengeStore,
} from './device-pop-verifier.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isCanonicalNonce(value: string): boolean {
  try {
    const bytes = Buffer.from(value, 'base64url');
    return bytes.length === 32 && bytes.toString('base64url') === value;
  } catch {
    return false;
  }
}

function parseChallengeForStorage(challenge: DevicePopChallengeV1): {
  challenge: DevicePopChallengeV1;
  issuedAt: Date;
  expiresAt: Date;
} {
  const parsed = DevicePopChallengeV1Schema.safeParse(challenge);
  if (!parsed.success || !isCanonicalNonce(challenge.nonce)) {
    throw new Error('invalid device PoP challenge contract');
  }

  const issuedAt = new Date(parsed.data.issuedAt);
  const expiresAt = new Date(parsed.data.expiresAt);
  if (
    !Number.isFinite(issuedAt.getTime())
    || !Number.isFinite(expiresAt.getTime())
    || expiresAt.getTime() <= issuedAt.getTime()
  ) {
    throw new Error('invalid device PoP challenge timestamps');
  }

  return { challenge: parsed.data, issuedAt, expiresAt };
}

function rowToStoredChallenge(
  row: typeof devicePopChallenges.$inferSelect,
): DevicePopStoredChallengeStateV1 {
  const parsed = DevicePopChallengeV1Schema.safeParse({
    schemaVersion: 'device-pop-challenge-v1',
    protocolVersion: 1,
    deviceId: row.deviceId,
    credentialVersion: row.credentialVersion,
    purpose: row.purpose,
    challengeId: row.challengeId,
    nonce: row.nonce,
    issuedAt: row.issuedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    signingContract: 'EMOPET_DEVICE_POP_FIXED_BINARY_V1',
  });

  if (!parsed.success || !isCanonicalNonce(row.nonce)) {
    throw new Error('corrupt durable device PoP challenge');
  }

  return {
    challenge: parsed.data,
    consumedAt: row.consumedAt?.toISOString() ?? null,
  };
}

/**
 * Durable challenge/replay store for #663.
 *
 * It implements both injected interfaces used by #653 and #654. It remains an
 * explicit dependency: issuer/verifier do not silently acquire a default store,
 * and no HTTP route is mounted here.
 */
export const durableDevicePopChallengeRepository:
  DevicePopChallengeStore & DevicePopVerificationChallengeStore = {
    async createIfAbsent(state: DevicePopChallengeStateV1): Promise<boolean> {
      if (state.consumedAt !== null) {
        throw new Error('new challenges must be unconsumed');
      }

      const { challenge, issuedAt, expiresAt } =
        parseChallengeForStorage(state.challenge);

      const inserted = await db
        .insert(devicePopChallenges)
        .values({
          challengeId: challenge.challengeId,
          deviceId: challenge.deviceId,
          credentialVersion: challenge.credentialVersion,
          purpose: challenge.purpose,
          nonce: challenge.nonce,
          issuedAt,
          expiresAt,
          signingContract: challenge.signingContract,
          consumedAt: null,
        })
        .onConflictDoNothing({
          target: devicePopChallenges.challengeId,
        })
        .returning({
          challengeId: devicePopChallenges.challengeId,
        });

      return inserted.length === 1;
    },

    async findByChallengeId(
      challengeId: string,
    ): Promise<DevicePopStoredChallengeStateV1 | null> {
      if (!UUID_RE.test(challengeId)) return null;

      const [row] = await db
        .select()
        .from(devicePopChallenges)
        .where(eq(devicePopChallenges.challengeId, challengeId))
        .limit(1);

      return row ? rowToStoredChallenge(row) : null;
    },

    async consumeIfUnconsumed(
      challengeId: string,
      consumedAt: string,
    ): Promise<boolean> {
      if (!UUID_RE.test(challengeId)) return false;

      const consumedAtMs = Date.parse(consumedAt);
      if (!Number.isFinite(consumedAtMs)) return false;

      const consumedAtDate = new Date(consumedAtMs);
      // The verifier emits canonical UTC ISO timestamps. Reject alternate or
      // lossy representations rather than silently normalizing replay evidence.
      if (consumedAtDate.toISOString() !== consumedAt) return false;

      const updated = await db
        .update(devicePopChallenges)
        .set({ consumedAt: consumedAtDate })
        .where(and(
          eq(devicePopChallenges.challengeId, challengeId),
          isNull(devicePopChallenges.consumedAt),
          lte(devicePopChallenges.issuedAt, consumedAtDate),
          gt(devicePopChallenges.expiresAt, consumedAtDate),
        ))
        .returning({
          challengeId: devicePopChallenges.challengeId,
        });

      return updated.length === 1;
    },
  };
