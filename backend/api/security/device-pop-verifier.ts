import {
  createPublicKey,
  createVerify,
} from 'node:crypto';

import {
  DevicePopChallengeV1Schema,
  DevicePopResponseV1Schema,
  type DevicePopChallengeV1,
  type DevicePopResponseV1,
} from '@emopet/shared';

const DOMAIN_SEPARATOR = Buffer.from('EMOPET_DEVICE_POP_V1', 'ascii');
const TELEMETRY_PURPOSE_CODE = 0x01;

export type DevicePopCryptographicVerificationError =
  | 'CHALLENGE_CONTRACT_INVALID'
  | 'RESPONSE_CONTRACT_INVALID'
  | 'CHALLENGE_EXPIRED'
  | 'RESPONSE_MISMATCH'
  | 'PUBLIC_KEY_INVALID'
  | 'SIGNATURE_INVALID';

export type DevicePopCryptographicVerificationResult =
  | {
      ok: true;
      cryptographicProofValid: true;
      /**
       * This is deliberately NOT Device Trust success. Replay consumption,
       * credential lifecycle and server trust state remain external.
       */
      deviceTrustAuthorized: false;
    }
  | {
      ok: false;
      error: DevicePopCryptographicVerificationError;
    };

function uuidToBytes(value: string): Buffer {
  const compact = value.replaceAll('-', '');
  if (!/^[0-9a-fA-F]{32}$/.test(compact)) {
    throw new Error('invalid UUID');
  }
  return Buffer.from(compact, 'hex');
}

function u32be(value: number): Buffer {
  const out = Buffer.allocUnsafe(4);
  out.writeUInt32BE(value, 0);
  return out;
}

function u64be(value: number): Buffer {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('invalid uint64 source value');
  }
  const out = Buffer.allocUnsafe(8);
  out.writeBigUInt64BE(BigInt(value), 0);
  return out;
}

function purposeCode(purpose: DevicePopChallengeV1['purpose']): number {
  if (purpose === 'DEVICE_DATA_TELEMETRY_INGRESS') {
    return TELEMETRY_PURPOSE_CODE;
  }
  throw new Error('unsupported purpose');
}

/**
 * Canonical EMOPET_DEVICE_POP_FIXED_BINARY_V1 signing preimage.
 *
 * Size for v1 = 106 bytes.
 */
export function encodeDevicePopSigningPreimageV1(
  challenge: DevicePopChallengeV1,
): Buffer {
  const parsed = DevicePopChallengeV1Schema.parse(challenge);
  const nonce = Buffer.from(parsed.nonce, 'base64url');
  if (nonce.length !== 32) {
    throw new Error('invalid nonce length');
  }

  const issuedAtMs = Date.parse(parsed.issuedAt);
  const expiresAtMs = Date.parse(parsed.expiresAt);

  return Buffer.concat([
    DOMAIN_SEPARATOR,
    Buffer.from([parsed.protocolVersion, purposeCode(parsed.purpose)]),
    uuidToBytes(parsed.deviceId),
    u32be(parsed.credentialVersion),
    uuidToBytes(parsed.challengeId),
    nonce,
    u64be(issuedAtMs),
    u64be(expiresAtMs),
  ]);
}

function sec1P256PublicKeyFromBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]{87}$/.test(value)) {
    throw new Error('invalid SEC1 public-key encoding');
  }
  const raw = Buffer.from(value, 'base64url');
  if (raw.length !== 65 || raw[0] !== 0x04) {
    throw new Error('public key must be uncompressed SEC1 P-256');
  }

  const x = raw.subarray(1, 33).toString('base64url');
  const y = raw.subarray(33, 65).toString('base64url');

  return createPublicKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      x,
      y,
    },
    format: 'jwk',
  });
}

export interface VerifyDevicePopCryptographyV1Input {
  challenge: DevicePopChallengeV1;
  response: DevicePopResponseV1;
  enrolledPublicKeySec1Base64Url: string;
  /**
   * Server time. Device time is never expiry authority.
   */
  now: Date;
}

/**
 * Verify only the cryptographic proof for one stored challenge.
 *
 * This function does NOT:
 * - consume replay state;
 * - resolve credential ACTIVE/REVOKED/REPLACED lifecycle;
 * - authorize telemetry persistence;
 * - authorize claim/bind or commands.
 */
export function verifyDevicePopCryptographyV1(
  input: VerifyDevicePopCryptographyV1Input,
): DevicePopCryptographicVerificationResult {
  const challengeParsed = DevicePopChallengeV1Schema.safeParse(input.challenge);
  if (!challengeParsed.success) {
    return { ok: false, error: 'CHALLENGE_CONTRACT_INVALID' };
  }

  const responseParsed = DevicePopResponseV1Schema.safeParse(input.response);
  if (!responseParsed.success) {
    return { ok: false, error: 'RESPONSE_CONTRACT_INVALID' };
  }

  const challenge = challengeParsed.data;
  const response = responseParsed.data;
  const nowMs = input.now.getTime();
  const expiresAtMs = Date.parse(challenge.expiresAt);
  if (!Number.isFinite(nowMs) || nowMs >= expiresAtMs) {
    return { ok: false, error: 'CHALLENGE_EXPIRED' };
  }

  if (
    response.protocolVersion !== challenge.protocolVersion
    || response.deviceId !== challenge.deviceId
    || response.credentialVersion !== challenge.credentialVersion
    || response.purpose !== challenge.purpose
    || response.challengeId !== challenge.challengeId
  ) {
    return { ok: false, error: 'RESPONSE_MISMATCH' };
  }

  let publicKey;
  try {
    publicKey = sec1P256PublicKeyFromBase64Url(
      input.enrolledPublicKeySec1Base64Url,
    );
  } catch {
    return { ok: false, error: 'PUBLIC_KEY_INVALID' };
  }

  const signature = Buffer.from(response.signature, 'base64url');
  if (signature.length !== 64) {
    return { ok: false, error: 'RESPONSE_CONTRACT_INVALID' };
  }

  let preimage: Buffer;
  try {
    preimage = encodeDevicePopSigningPreimageV1(challenge);
  } catch {
    return { ok: false, error: 'CHALLENGE_CONTRACT_INVALID' };
  }

  const verifier = createVerify('SHA256');
  verifier.update(preimage);
  verifier.end();

  const valid = verifier.verify(
    {
      key: publicKey,
      dsaEncoding: 'ieee-p1363',
    },
    signature,
  );

  if (!valid) {
    return { ok: false, error: 'SIGNATURE_INVALID' };
  }

  return {
    ok: true,
    cryptographicProofValid: true,
    deviceTrustAuthorized: false,
  };
}
