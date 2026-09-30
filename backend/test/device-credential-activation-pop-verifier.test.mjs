import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';

import {
  buildDevicePopSigningPreimageV1,
} from '../dist/api/security/device-pop-verifier.js';
import {
  verifyDeviceCredentialActivationPopResponseV1,
} from '../dist/api/security/device-credential-activation-pop-verifier.js';

const DEVICE_ID = '11111111-1111-4111-8111-111111111111';
const CHALLENGE_ID = '22222222-2222-4222-8222-222222222222';
const RECEIPT_ID = '33333333-3333-4333-8333-333333333333';
const NOW = new Date('2026-09-30T16:30:00.000Z');
const EXPIRY = new Date('2026-09-30T16:31:00.000Z');

const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
});

function sec1PublicKey() {
  const jwk = publicKey.export({ format: 'jwk' });
  return Buffer.concat([
    Buffer.from([0x04]),
    Buffer.from(jwk.x, 'base64url'),
    Buffer.from(jwk.y, 'base64url'),
  ]);
}

function challenge(overrides = {}) {
  return {
    schemaVersion: 'device-pop-challenge-v1',
    protocolVersion: 1,
    deviceId: DEVICE_ID,
    credentialVersion: 4,
    purpose: 'DEVICE_CREDENTIAL_ACTIVATION',
    challengeId: CHALLENGE_ID,
    nonce: Buffer.alloc(32, 0x5a).toString('base64url'),
    issuedAt: '2026-09-30T16:29:00.000Z',
    expiresAt: EXPIRY.toISOString(),
    signingContract: 'EMOPET_DEVICE_POP_FIXED_BINARY_V1',
    ...overrides,
  };
}

function signedResponse(challengeValue = challenge(), overrides = {}) {
  const preimage = buildDevicePopSigningPreimageV1(challengeValue);
  const signature = sign('sha256', preimage, {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });

  return {
    schemaVersion: 'device-pop-response-v1',
    protocolVersion: 1,
    deviceId: challengeValue.deviceId,
    credentialVersion: challengeValue.credentialVersion,
    purpose: challengeValue.purpose,
    challengeId: challengeValue.challengeId,
    signatureFormat: 'ECDSA_P256_SHA256_P1363_64',
    signature: signature.toString('base64url'),
    ...overrides,
  };
}

function fixture(overrides = {}) {
  const stored = challenge();
  let consumedAt = null;
  let consumeCalls = 0;

  return {
    stored,
    get consumedAt() {
      return consumedAt;
    },
    get consumeCalls() {
      return consumeCalls;
    },
    deps: {
      challenges: {
        async findByChallengeId(id) {
          if (id !== stored.challengeId) return null;
          return { challenge: stored, consumedAt };
        },
        async consumeIfUnconsumed() {
          throw new Error('manufacturing verifier must use atomic M4 evidence store');
        },
      },
      pendingCredentials: {
        async resolvePendingCredential(deviceId, credentialVersion) {
          return {
            deviceId,
            credentialVersion,
            state: 'PENDING_PROOF',
            publicKeySec1: sec1PublicKey(),
          };
        },
      },
      popEvidence: {
        async consumeAndPersistVerifiedEvidence(input) {
          consumeCalls++;
          if (
            input.challengeId !== stored.challengeId
            || input.deviceId !== stored.deviceId
            || input.credentialVersion !== stored.credentialVersion
            || consumedAt !== null
          ) {
            return null;
          }
          consumedAt = input.consumedAt;
          return {
            receiptId: input.receiptId,
            authority: 'SERVER_SIDE_POP_VERIFICATION_AUTHORITY',
            deviceId: input.deviceId,
            credentialVersion: input.credentialVersion,
            challengeId: input.challengeId,
            verificationResult: 'VERIFIED_AND_CONSUMED',
            verifiedAt: input.verifiedAt,
            consumedAt: input.consumedAt,
          };
        },
        async findByReceiptId() {
          return null;
        },
      },
      now: () => NOW,
      randomUuid: () => RECEIPT_ID,
      ...overrides,
    },
  };
}

test('manufacturing verifier proves exact PENDING_PROOF credential and consumes challenge once', async () => {
  const f = fixture();
  const result = await verifyDeviceCredentialActivationPopResponseV1(
    signedResponse(f.stored),
    f.deps,
  );

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(result.proof, {
    schemaVersion: 'device-credential-activation-pop-proof-v1',
    receiptId: RECEIPT_ID,
    authority: 'SERVER_SIDE_POP_VERIFICATION_AUTHORITY',
    deviceId: DEVICE_ID,
    credentialVersion: 4,
    purpose: 'DEVICE_CREDENTIAL_ACTIVATION',
    challengeId: CHALLENGE_ID,
    verificationResult: 'VERIFIED_AND_CONSUMED',
    verifiedAt: NOW.toISOString(),
    consumedAt: NOW.toISOString(),
    cryptographicProofVerified: true,
    deviceDataTrustAuthorized: false,
    telemetryPersistenceAuthorized: false,
  });
  assert.equal(f.consumeCalls, 1);
  assert.equal(f.consumedAt, NOW.toISOString());
});

test('manufacturing verifier refuses telemetry purpose before credential authority', async () => {
  let credentialCalls = 0;
  const telemetry = challenge({ purpose: 'DEVICE_DATA_TELEMETRY_INGRESS' });
  const f = fixture({
    pendingCredentials: {
      async resolvePendingCredential() {
        credentialCalls++;
        throw new Error('must not resolve');
      },
    },
  });
  f.stored.purpose = 'DEVICE_DATA_TELEMETRY_INGRESS';

  const result = await verifyDeviceCredentialActivationPopResponseV1(
    signedResponse(telemetry),
    f.deps,
  );

  assert.deepEqual(result, { ok: false, error: 'PURPOSE_NOT_ALLOWED' });
  assert.equal(credentialCalls, 0);
  assert.equal(f.consumeCalls, 0);
});

test('manufacturing verifier refuses ACTIVE credential as M4 authority', async () => {
  const f = fixture({
    pendingCredentials: {
      async resolvePendingCredential(deviceId, credentialVersion) {
        return {
          deviceId,
          credentialVersion,
          state: 'ACTIVE',
          publicKeySec1: sec1PublicKey(),
        };
      },
    },
  });

  const result = await verifyDeviceCredentialActivationPopResponseV1(
    signedResponse(f.stored),
    f.deps,
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'PENDING_CREDENTIAL_NOT_FOUND',
  });
  assert.equal(f.consumeCalls, 0);
});

test('invalid manufacturing signature authorizes nothing and does not consume', async () => {
  const f = fixture();
  const response = signedResponse(f.stored);
  const bytes = Buffer.from(response.signature, 'base64url');
  bytes[0] ^= 0x01;
  response.signature = bytes.toString('base64url');

  assert.deepEqual(
    await verifyDeviceCredentialActivationPopResponseV1(response, f.deps),
    { ok: false, error: 'INVALID_SIGNATURE' },
  );
  assert.equal(f.consumeCalls, 0);
});

test('manufacturing verifier loses authority when atomic consume+receipt commit loses race', async () => {
  const f = fixture({
    popEvidence: {
      async consumeAndPersistVerifiedEvidence() {
        return null;
      },
      async findByReceiptId() {
        return null;
      },
    },
  });

  assert.deepEqual(
    await verifyDeviceCredentialActivationPopResponseV1(
      signedResponse(f.stored),
      f.deps,
    ),
    { ok: false, error: 'CHALLENGE_CONSUME_CONFLICT' },
  );
});

test('manufacturing verifier cannot succeed when durable M4 persistence fails', async () => {
  const f = fixture({
    popEvidence: {
      async consumeAndPersistVerifiedEvidence() {
        throw new Error('database unavailable');
      },
      async findByReceiptId() {
        return null;
      },
    },
  });

  assert.deepEqual(
    await verifyDeviceCredentialActivationPopResponseV1(
      signedResponse(f.stored),
      f.deps,
    ),
    { ok: false, error: 'POP_EVIDENCE_STORE_FAILURE' },
  );
});

test('expired/replayed manufacturing challenge fails closed', async () => {
  const expired = fixture({ now: () => EXPIRY });
  assert.deepEqual(
    await verifyDeviceCredentialActivationPopResponseV1(
      signedResponse(expired.stored),
      expired.deps,
    ),
    { ok: false, error: 'CHALLENGE_EXPIRED' },
  );

  const replay = fixture({
    challenges: {
      async findByChallengeId() {
        return {
          challenge: challenge(),
          consumedAt: '2026-09-30T16:29:30.000Z',
        };
      },
      async consumeIfUnconsumed() {
        throw new Error('must not consume');
      },
    },
  });
  assert.deepEqual(
    await verifyDeviceCredentialActivationPopResponseV1(
      signedResponse(replay.stored),
      replay.deps,
    ),
    { ok: false, error: 'CHALLENGE_ALREADY_CONSUMED' },
  );
});
