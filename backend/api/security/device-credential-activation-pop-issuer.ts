import { randomBytes, randomUUID } from 'node:crypto';

import {
  DevicePopChallengeV1Schema,
  type DevicePopChallengeV1,
} from '@emopet/shared';

import type {
  DevicePopChallengeEntropy,
  DevicePopChallengeStore,
} from './device-pop-challenge-issuer.js';

export const DEVICE_POP_PURPOSE_CREDENTIAL_ACTIVATION_V1 =
  'DEVICE_CREDENTIAL_ACTIVATION' as const;

export interface DevicePopPendingCredentialV1 {
  deviceId: string;
  credentialVersion: number;
  state: 'PENDING_PROOF';
}

export interface DevicePopPendingCredentialResolver {
  resolvePendingCredential(
    deviceId: string,
    credentialVersion: number,
  ): Promise<DevicePopPendingCredentialV1 | null>;
}

export interface DeviceCredentialActivationChallengeIssuerDependencies {
  pendingCredentials: DevicePopPendingCredentialResolver;
  store: DevicePopChallengeStore;
  now?: () => Date;
  entropy?: DevicePopChallengeEntropy;
}

export interface IssueDeviceCredentialActivationChallengeInput {
  deviceId: string;
  credentialVersion: number;
  /**
   * Expiry is selected by a separate policy authority.
   * This primitive intentionally has no default TTL.
   */
  expiresAt: Date;
}

export type DeviceCredentialActivationChallengeIssueError =
  | 'INVALID_CREDENTIAL_VERSION'
  | 'INVALID_EXPIRY'
  | 'PENDING_CREDENTIAL_NOT_FOUND'
  | 'CREDENTIAL_RESOLVER_FAILURE'
  | 'CHALLENGE_ID_CONFLICT'
  | 'CHALLENGE_STORE_FAILURE'
  | 'CONTRACT_VALIDATION_FAILURE';

export type IssueDeviceCredentialActivationChallengeResult =
  | {
      ok: true;
      challenge: DevicePopChallengeV1;
    }
  | {
      ok: false;
      error: DeviceCredentialActivationChallengeIssueError;
    };

const nodeEntropy: DevicePopChallengeEntropy = {
  randomUuid: () => randomUUID(),
  randomBytes: (length) => randomBytes(length),
};

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

/**
 * Source-level M4 challenge issuer for #791.
 *
 * This lane is deliberately separate from runtime telemetry issuance:
 * - exact PENDING_PROOF credential version is required;
 * - purpose is fixed to DEVICE_CREDENTIAL_ACTIVATION;
 * - no HTTP route/default TTL/default store exists;
 * - issuing a challenge does not authorize activation.
 */
export async function issueDeviceCredentialActivationChallengeV1(
  input: IssueDeviceCredentialActivationChallengeInput,
  dependencies: DeviceCredentialActivationChallengeIssuerDependencies,
): Promise<IssueDeviceCredentialActivationChallengeResult> {
  if (
    !Number.isSafeInteger(input.credentialVersion)
    || input.credentialVersion <= 0
    || input.credentialVersion > 0xffffffff
  ) {
    return { ok: false, error: 'INVALID_CREDENTIAL_VERSION' };
  }

  const now = (dependencies.now ?? (() => new Date()))();
  const issuedAtMs = now.getTime();
  const expiresAtMs = input.expiresAt.getTime();
  if (
    !Number.isFinite(issuedAtMs)
    || !Number.isFinite(expiresAtMs)
    || expiresAtMs <= issuedAtMs
  ) {
    return { ok: false, error: 'INVALID_EXPIRY' };
  }

  let pending: DevicePopPendingCredentialV1 | null;
  try {
    pending = await dependencies.pendingCredentials.resolvePendingCredential(
      input.deviceId,
      input.credentialVersion,
    );
  } catch {
    return { ok: false, error: 'CREDENTIAL_RESOLVER_FAILURE' };
  }

  if (
    pending == null
    || pending.state !== 'PENDING_PROOF'
    || pending.deviceId !== input.deviceId
    || pending.credentialVersion !== input.credentialVersion
  ) {
    return { ok: false, error: 'PENDING_CREDENTIAL_NOT_FOUND' };
  }

  const entropy = dependencies.entropy ?? nodeEntropy;
  const challenge: DevicePopChallengeV1 = {
    schemaVersion: 'device-pop-challenge-v1',
    protocolVersion: 1,
    deviceId: pending.deviceId,
    credentialVersion: pending.credentialVersion,
    purpose: DEVICE_POP_PURPOSE_CREDENTIAL_ACTIVATION_V1,
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

  return { ok: true, challenge: parsed.data };
}
