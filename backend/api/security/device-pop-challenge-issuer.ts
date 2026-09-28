import { randomBytes, randomUUID } from 'node:crypto';

import {
  DevicePopChallengeV1Schema,
  type DevicePopChallengeV1,
} from '@emopet/shared';

export const DEVICE_POP_PURPOSE_TELEMETRY_V1 =
  'DEVICE_DATA_TELEMETRY_INGRESS' as const;

export type DevicePopChallengeIssueError =
  | 'ACTIVE_CREDENTIAL_NOT_FOUND'
  | 'INVALID_EXPIRY'
  | 'CHALLENGE_ID_CONFLICT'
  | 'CHALLENGE_STORE_FAILURE'
  | 'CONTRACT_VALIDATION_FAILURE';

export interface DevicePopActiveCredentialV1 {
  deviceId: string;
  credentialVersion: number;
  state: 'ACTIVE';
}

export interface DevicePopCredentialResolver {
  resolveActiveCredential(
    deviceId: string,
  ): Promise<DevicePopActiveCredentialV1 | null>;
}

export interface DevicePopChallengeStateV1 {
  challenge: DevicePopChallengeV1;
  consumedAt: null;
}

/**
 * Persistence authority must provide one atomic "create if challenge id is
 * unused" operation. An in-memory Map is acceptable for unit tests only and is
 * not a production replay store.
 */
export interface DevicePopChallengeStore {
  createIfAbsent(state: DevicePopChallengeStateV1): Promise<boolean>;
}

export interface DevicePopChallengeEntropy {
  randomUuid(): string;
  randomBytes(length: number): Uint8Array;
}

export interface DevicePopChallengeIssuerDependencies {
  credentials: DevicePopCredentialResolver;
  store: DevicePopChallengeStore;
  now?: () => Date;
  entropy?: DevicePopChallengeEntropy;
}

export interface IssueDevicePopChallengeInput {
  deviceId: string;
  /**
   * Expiry is supplied by a separate policy authority. This primitive has no
   * default TTL and therefore cannot silently select a product security policy.
   */
  expiresAt: Date;
}

export type IssueDevicePopChallengeResult =
  | {
      ok: true;
      challenge: DevicePopChallengeV1;
    }
  | {
      ok: false;
      error: DevicePopChallengeIssueError;
    };

const nodeEntropy: DevicePopChallengeEntropy = {
  randomUuid: () => randomUUID(),
  randomBytes: (length) => randomBytes(length),
};

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

/**
 * Source-level issuer primitive for #648.
 *
 * This function is deliberately not connected to an HTTP route and has no
 * default credential repository or challenge store. A caller must provide both
 * authorities explicitly. Until a durable replay store and enrolled credential
 * repository exist, Product runtime issuance remains unimplemented.
 */
export async function issueDevicePopChallengeV1(
  input: IssueDevicePopChallengeInput,
  dependencies: DevicePopChallengeIssuerDependencies,
): Promise<IssueDevicePopChallengeResult> {
  const now = (dependencies.now ?? (() => new Date()))();
  const expiresAtMs = input.expiresAt.getTime();
  const issuedAtMs = now.getTime();

  if (
    !Number.isFinite(issuedAtMs)
    || !Number.isFinite(expiresAtMs)
    || expiresAtMs <= issuedAtMs
  ) {
    return { ok: false, error: 'INVALID_EXPIRY' };
  }

  const credential = await dependencies.credentials.resolveActiveCredential(
    input.deviceId,
  );
  if (
    credential == null
    || credential.state !== 'ACTIVE'
    || credential.deviceId !== input.deviceId
    || !Number.isSafeInteger(credential.credentialVersion)
    || credential.credentialVersion <= 0
    || credential.credentialVersion > 0xffffffff
  ) {
    return { ok: false, error: 'ACTIVE_CREDENTIAL_NOT_FOUND' };
  }

  const entropy = dependencies.entropy ?? nodeEntropy;
  const challenge: DevicePopChallengeV1 = {
    schemaVersion: 'device-pop-challenge-v1',
    protocolVersion: 1,
    deviceId: input.deviceId,
    credentialVersion: credential.credentialVersion,
    purpose: DEVICE_POP_PURPOSE_TELEMETRY_V1,
    challengeId: entropy.randomUuid(),
    nonce: toBase64Url(entropy.randomBytes(32)),
    issuedAt: now.toISOString(),
    expiresAt: input.expiresAt.toISOString(),
    signingContract: 'EMOPET_DEVICE_POP_FIXED_BINARY_V1',
  };

  const parsed = DevicePopChallengeV1Schema.safeParse(challenge);
  if (!parsed.success) {
    return { ok: false, error: 'CONTRACT_VALIDATION_FAILURE' };
  }

  try {
    const created = await dependencies.store.createIfAbsent({
      challenge: parsed.data,
      consumedAt: null,
    });
    if (!created) {
      return { ok: false, error: 'CHALLENGE_ID_CONFLICT' };
    }
  } catch {
    return { ok: false, error: 'CHALLENGE_STORE_FAILURE' };
  }

  return {
    ok: true,
    challenge: parsed.data,
  };
}
