import { createPublicKey, randomUUID, verify } from 'node:crypto';

import {
  DevicePopChallengeV1Schema,
  DevicePopResponseV1Schema,
  type DevicePopChallengeV1,
  type DevicePopResponseV1,
} from '@emopet/shared';

import {
  buildDevicePopSigningPreimageV1,
  type DevicePopStoredChallengeStateV1,
  type DevicePopVerificationChallengeStore,
} from './device-pop-verifier.js';

export interface DevicePopPendingVerificationCredentialV1 {
  deviceId: string;
  credentialVersion: number;
  state: 'PENDING_PROOF';
  publicKeySec1: Uint8Array;
}

export interface DevicePopPendingVerificationCredentialResolver {
  resolvePendingCredential(
    deviceId: string,
    credentialVersion: number,
  ): Promise<DevicePopPendingVerificationCredentialV1 | null>;
}

export interface DeviceCredentialActivationPopVerifierDependencies {
  challenges: DevicePopVerificationChallengeStore;
  pendingCredentials: DevicePopPendingVerificationCredentialResolver;
  now?: () => Date;
  randomUuid?: () => string;
}

export type DeviceCredentialActivationPopVerifyError =
  | 'INVALID_RESPONSE_CONTRACT'
  | 'PURPOSE_NOT_ALLOWED'
  | 'CHALLENGE_NOT_FOUND'
  | 'CHALLENGE_ALREADY_CONSUMED'
  | 'CHALLENGE_EXPIRED'
  | 'CHALLENGE_MISMATCH'
  | 'PENDING_CREDENTIAL_NOT_FOUND'
  | 'INVALID_PUBLIC_KEY'
  | 'INVALID_SIGNATURE'
  | 'CHALLENGE_CONSUME_CONFLICT'
  | 'CHALLENGE_STORE_FAILURE'
  | 'CREDENTIAL_RESOLVER_FAILURE';

export type VerifyDeviceCredentialActivationPopResult =
  | {
      ok: true;
      proof: {
        schemaVersion: 'device-credential-activation-pop-proof-v1';
        receiptId: string;
        authority: 'SERVER_SIDE_POP_VERIFICATION_AUTHORITY';
        deviceId: string;
        credentialVersion: number;
        purpose: 'DEVICE_CREDENTIAL_ACTIVATION';
        challengeId: string;
        verificationResult: 'VERIFIED_AND_CONSUMED';
        verifiedAt: string;
        consumedAt: string;
        cryptographicProofVerified: true;
        deviceDataTrustAuthorized: false;
        telemetryPersistenceAuthorized: false;
      };
    }
  | {
      ok: false;
      error: DeviceCredentialActivationPopVerifyError;
    };

const P256_SPKI_PREFIX = Buffer.from(
  '3059301306072a8648ce3d020106082a8648ce3d030107034200',
  'hex',
);

function decodeBase64UrlExact(value: string, bytes: number): Buffer {
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.length !== bytes) {
    throw new Error('invalid base64url length');
  }
  return decoded;
}

function publicKeyFromSec1(sec1: Uint8Array) {
  const bytes = Buffer.from(sec1);
  if (bytes.length !== 65 || bytes[0] !== 0x04) {
    throw new Error('invalid sec1 key');
  }

  return createPublicKey({
    key: Buffer.concat([P256_SPKI_PREFIX, bytes]),
    format: 'der',
    type: 'spki',
  });
}

function responseMatchesChallenge(
  response: DevicePopResponseV1,
  challenge: DevicePopChallengeV1,
): boolean {
  return (
    response.protocolVersion === challenge.protocolVersion
    && response.deviceId === challenge.deviceId
    && response.credentialVersion === challenge.credentialVersion
    && response.purpose === challenge.purpose
    && response.challengeId === challenge.challengeId
  );
}

/**
 * M4 PoP verifier for a PENDING_PROOF credential.
 *
 * A positive result is manufacturing evidence only. It does not activate the
 * credential and does not authorize Device Data Trust or telemetry persistence.
 */
export async function verifyDeviceCredentialActivationPopResponseV1(
  responseInput: unknown,
  dependencies: DeviceCredentialActivationPopVerifierDependencies,
): Promise<VerifyDeviceCredentialActivationPopResult> {
  const responseParsed = DevicePopResponseV1Schema.safeParse(responseInput);
  if (!responseParsed.success) {
    return { ok: false, error: 'INVALID_RESPONSE_CONTRACT' };
  }
  const response = responseParsed.data;

  if (response.purpose !== 'DEVICE_CREDENTIAL_ACTIVATION') {
    return { ok: false, error: 'PURPOSE_NOT_ALLOWED' };
  }

  let state: DevicePopStoredChallengeStateV1 | null;
  try {
    state = await dependencies.challenges.findByChallengeId(
      response.challengeId,
    );
  } catch {
    return { ok: false, error: 'CHALLENGE_STORE_FAILURE' };
  }

  if (state == null) {
    return { ok: false, error: 'CHALLENGE_NOT_FOUND' };
  }
  if (state.consumedAt !== null) {
    return { ok: false, error: 'CHALLENGE_ALREADY_CONSUMED' };
  }

  const challengeParsed = DevicePopChallengeV1Schema.safeParse(state.challenge);
  if (!challengeParsed.success) {
    return { ok: false, error: 'CHALLENGE_MISMATCH' };
  }
  const challenge = challengeParsed.data;

  if (challenge.purpose !== 'DEVICE_CREDENTIAL_ACTIVATION') {
    return { ok: false, error: 'PURPOSE_NOT_ALLOWED' };
  }

  if (!responseMatchesChallenge(response, challenge)) {
    return { ok: false, error: 'CHALLENGE_MISMATCH' };
  }

  const now = (dependencies.now ?? (() => new Date()))();
  const nowMs = now.getTime();
  const expiresAtMs = Date.parse(challenge.expiresAt);
  if (
    !Number.isFinite(nowMs)
    || !Number.isFinite(expiresAtMs)
    || nowMs >= expiresAtMs
  ) {
    return { ok: false, error: 'CHALLENGE_EXPIRED' };
  }

  let credential: DevicePopPendingVerificationCredentialV1 | null;
  try {
    credential = await dependencies.pendingCredentials.resolvePendingCredential(
      challenge.deviceId,
      challenge.credentialVersion,
    );
  } catch {
    return { ok: false, error: 'CREDENTIAL_RESOLVER_FAILURE' };
  }

  if (
    credential == null
    || credential.state !== 'PENDING_PROOF'
    || credential.deviceId !== challenge.deviceId
    || credential.credentialVersion !== challenge.credentialVersion
  ) {
    return { ok: false, error: 'PENDING_CREDENTIAL_NOT_FOUND' };
  }

  let key;
  let preimage: Buffer;
  let signature: Buffer;
  try {
    key = publicKeyFromSec1(credential.publicKeySec1);
    preimage = buildDevicePopSigningPreimageV1(challenge);
    signature = decodeBase64UrlExact(response.signature, 64);
  } catch {
    return { ok: false, error: 'INVALID_PUBLIC_KEY' };
  }

  let valid = false;
  try {
    valid = verify(
      'sha256',
      preimage,
      {
        key,
        dsaEncoding: 'ieee-p1363',
      },
      signature,
    );
  } catch {
    valid = false;
  }

  if (!valid) {
    return { ok: false, error: 'INVALID_SIGNATURE' };
  }

  const verifiedAt = now.toISOString();
  try {
    const consumed = await dependencies.challenges.consumeIfUnconsumed(
      challenge.challengeId,
      verifiedAt,
    );
    if (!consumed) {
      return { ok: false, error: 'CHALLENGE_CONSUME_CONFLICT' };
    }
  } catch {
    return { ok: false, error: 'CHALLENGE_STORE_FAILURE' };
  }

  return {
    ok: true,
    proof: {
      schemaVersion: 'device-credential-activation-pop-proof-v1',
      receiptId: (dependencies.randomUuid ?? randomUUID)(),
      authority: 'SERVER_SIDE_POP_VERIFICATION_AUTHORITY',
      deviceId: challenge.deviceId,
      credentialVersion: challenge.credentialVersion,
      purpose: 'DEVICE_CREDENTIAL_ACTIVATION',
      challengeId: challenge.challengeId,
      verificationResult: 'VERIFIED_AND_CONSUMED',
      verifiedAt,
      consumedAt: verifiedAt,
      cryptographicProofVerified: true,
      deviceDataTrustAuthorized: false,
      telemetryPersistenceAuthorized: false,
    },
  };
}
