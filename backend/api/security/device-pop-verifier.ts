import { createPublicKey, verify } from 'node:crypto';

import {
  DevicePopChallengeV1Schema,
  DevicePopResponseV1Schema,
  type DevicePopChallengeV1,
  type DevicePopResponseV1,
} from '@emopet/shared';

export type DevicePopVerifyError =
  | 'INVALID_RESPONSE_CONTRACT'
  | 'CHALLENGE_NOT_FOUND'
  | 'CHALLENGE_ALREADY_CONSUMED'
  | 'CHALLENGE_EXPIRED'
  | 'CHALLENGE_MISMATCH'
  | 'ACTIVE_CREDENTIAL_NOT_FOUND'
  | 'INVALID_PUBLIC_KEY'
  | 'INVALID_SIGNATURE'
  | 'CHALLENGE_CONSUME_CONFLICT'
  | 'CHALLENGE_STORE_FAILURE'
  | 'CREDENTIAL_RESOLVER_FAILURE';

export interface DevicePopStoredChallengeStateV1 {
  challenge: DevicePopChallengeV1;
  consumedAt: string | null;
}

export interface DevicePopVerificationChallengeStore {
  findByChallengeId(
    challengeId: string,
  ): Promise<DevicePopStoredChallengeStateV1 | null>;

  /**
   * Atomically consume only if the challenge is still unconsumed.
   *
   * A false result is a replay/race refusal. The verifier must not retry or
   * silently treat a prior concurrent success as this call's success.
   */
  consumeIfUnconsumed(
    challengeId: string,
    consumedAt: string,
  ): Promise<boolean>;
}

export interface DevicePopVerificationCredentialV1 {
  deviceId: string;
  credentialVersion: number;
  state: 'ACTIVE';
  /**
   * SEC1 uncompressed P-256 point: 0x04 || X(32) || Y(32).
   */
  publicKeySec1: Uint8Array;
}

export interface DevicePopVerificationCredentialResolver {
  resolveActiveCredential(
    deviceId: string,
    credentialVersion: number,
  ): Promise<DevicePopVerificationCredentialV1 | null>;
}

export interface DevicePopVerifierDependencies {
  challenges: DevicePopVerificationChallengeStore;
  credentials: DevicePopVerificationCredentialResolver;
  now?: () => Date;
}

export type VerifyDevicePopResult =
  | {
      ok: true;
      proof: {
        schemaVersion: 'device-pop-proof-verification-v1';
        deviceId: string;
        credentialVersion: number;
        purpose: 'DEVICE_DATA_TELEMETRY_INGRESS';
        challengeId: string;
        verifiedAt: string;
        cryptographicProofVerified: true;
        deviceDataTrustAuthorized: false;
        telemetryPersistenceAuthorized: false;
      };
    }
  | {
      ok: false;
      error: DevicePopVerifyError;
    };

const DOMAIN_SEPARATOR = Buffer.from('EMOPET_DEVICE_POP_V1', 'ascii');
const P256_SPKI_PREFIX = Buffer.from(
  '3059301306072a8648ce3d020106082a8648ce3d030107034200',
  'hex',
);

function uuidToBytes(uuid: string): Buffer {
  const hex = uuid.replaceAll('-', '');
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new Error('invalid uuid');
  }
  return Buffer.from(hex, 'hex');
}

function uint32be(value: number): Buffer {
  const out = Buffer.allocUnsafe(4);
  out.writeUInt32BE(value, 0);
  return out;
}

function uint64be(value: number): Buffer {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('invalid uint64 source');
  }
  const out = Buffer.allocUnsafe(8);
  out.writeBigUInt64BE(BigInt(value), 0);
  return out;
}

function decodeBase64UrlExact(value: string, bytes: number): Buffer {
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.length !== bytes) {
    throw new Error('invalid base64url length');
  }
  return decoded;
}

/**
 * Canonical fixed-binary PoP preimage from #652.
 *
 * This helper intentionally accepts only the stored server-side challenge.
 * Response JSON never supplies nonce/timestamps/public-key authority.
 */
export function buildDevicePopSigningPreimageV1(
  challenge: DevicePopChallengeV1,
): Buffer {
  const parsed = DevicePopChallengeV1Schema.parse(challenge);
  const issuedAt = Date.parse(parsed.issuedAt);
  const expiresAt = Date.parse(parsed.expiresAt);

  if (
    !Number.isSafeInteger(issuedAt)
    || !Number.isSafeInteger(expiresAt)
    || expiresAt <= issuedAt
  ) {
    throw new Error('invalid challenge time');
  }

  return Buffer.concat([
    DOMAIN_SEPARATOR,
    Buffer.from([parsed.protocolVersion]),
    Buffer.from([0x01]), // DEVICE_DATA_TELEMETRY_INGRESS
    uuidToBytes(parsed.deviceId),
    uint32be(parsed.credentialVersion),
    uuidToBytes(parsed.challengeId),
    decodeBase64UrlExact(parsed.nonce, 32),
    uint64be(issuedAt),
    uint64be(expiresAt),
  ]);
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
 * Source-level verifier primitive for #648.
 *
 * Positive result means only that one ACTIVE enrolled P-256 credential proved
 * possession against one live server challenge. It deliberately does NOT:
 * - authorize Device Data Trust;
 * - authorize telemetry persistence;
 * - expose a route;
 * - select TTL/rate policy;
 * - provide a default credential/challenge repository.
 */
export async function verifyDevicePopResponseV1(
  responseInput: unknown,
  dependencies: DevicePopVerifierDependencies,
): Promise<VerifyDevicePopResult> {
  const responseParsed = DevicePopResponseV1Schema.safeParse(responseInput);
  if (!responseParsed.success) {
    return { ok: false, error: 'INVALID_RESPONSE_CONTRACT' };
  }
  const response = responseParsed.data;

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

  let credential: DevicePopVerificationCredentialV1 | null;
  try {
    credential = await dependencies.credentials.resolveActiveCredential(
      challenge.deviceId,
      challenge.credentialVersion,
    );
  } catch {
    return { ok: false, error: 'CREDENTIAL_RESOLVER_FAILURE' };
  }

  if (
    credential == null
    || credential.state !== 'ACTIVE'
    || credential.deviceId !== challenge.deviceId
    || credential.credentialVersion !== challenge.credentialVersion
  ) {
    return { ok: false, error: 'ACTIVE_CREDENTIAL_NOT_FOUND' };
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
      schemaVersion: 'device-pop-proof-verification-v1',
      deviceId: challenge.deviceId,
      credentialVersion: challenge.credentialVersion,
      purpose: challenge.purpose,
      challengeId: challenge.challengeId,
      verifiedAt,
      cryptographicProofVerified: true,
      deviceDataTrustAuthorized: false,
      telemetryPersistenceAuthorized: false,
    },
  };
}
