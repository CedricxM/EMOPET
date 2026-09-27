import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';

import {
  buildDevicePopSigningPreimageV1,
  verifyDevicePopResponseV1,
} from '../dist/api/security/device-pop-verifier.js';

const DEVICE_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_DEVICE_ID = '33333333-3333-4333-8333-333333333333';
const CHALLENGE_ID = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-09-27T18:30:00.000Z');
const EXPIRY = new Date('2026-09-27T18:31:00.000Z');

const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
});

function sec1PublicKey() {
  const jwk = publicKey.export({ format: 'jwk' });
  assert.equal(jwk.kty, 'EC');
  assert.equal(jwk.crv, 'P-256');
  assert.ok(jwk.x);
  assert.ok(jwk.y);
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
    credentialVersion: 3,
    purpose: 'DEVICE_DATA_TELEMETRY_INGRESS',
    challengeId: CHALLENGE_ID,
    nonce: Buffer.alloc(32, 0x5a).toString('base64url'),
    issuedAt: '2026-09-27T18:29:00.000Z',
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

  assert.equal(signature.length, 64);

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

  const base = {
    challenges: {
      async findByChallengeId(challengeId) {
        if (challengeId !== stored.challengeId) return null;
        return { challenge: stored, consumedAt };
      },
      async consumeIfUnconsumed(challengeId, at) {
        consumeCalls++;
        if (challengeId !== stored.challengeId || consumedAt !== null) {
          return false;
        }
        consumedAt = at;
        return true;
      },
    },
    credentials: {
      async resolveActiveCredential(deviceId, credentialVersion) {
        return {
          deviceId,
          credentialVersion,
          state: 'ACTIVE',
          publicKeySec1: sec1PublicKey(),
        };
      },
    },
    now: () => NOW,
  };

  return {
    stored,
    get consumedAt() {
      return consumedAt;
    },
    get consumeCalls() {
      return consumeCalls;
    },
    deps: {
      ...base,
      ...overrides,
    },
  };
}

test('verifier accepts one valid P-256 proof and atomically consumes the challenge', async () => {
  const f = fixture();
  const response = signedResponse(f.stored);

  const result = await verifyDevicePopResponseV1(response, f.deps);

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(result.proof, {
    schemaVersion: 'device-pop-proof-verification-v1',
    deviceId: DEVICE_ID,
    credentialVersion: 3,
    purpose: 'DEVICE_DATA_TELEMETRY_INGRESS',
    challengeId: CHALLENGE_ID,
    verifiedAt: NOW.toISOString(),
    cryptographicProofVerified: true,
    deviceDataTrustAuthorized: false,
    telemetryPersistenceAuthorized: false,
  });
  assert.equal(f.consumeCalls, 1);
  assert.equal(f.consumedAt, NOW.toISOString());
});

test('invalid signature authorizes nothing and does not consume challenge', async () => {
  const f = fixture();
  const response = signedResponse(f.stored);
  const bytes = Buffer.from(response.signature, 'base64url');
  bytes[0] ^= 0x01;
  response.signature = bytes.toString('base64url');

  const result = await verifyDevicePopResponseV1(response, f.deps);

  assert.deepEqual(result, { ok: false, error: 'INVALID_SIGNATURE' });
  assert.equal(f.consumeCalls, 0);
  assert.equal(f.consumedAt, null);
});

test('response fields cannot substitute for stored challenge authority', async () => {
  const f = fixture();
  const response = signedResponse(f.stored, { deviceId: OTHER_DEVICE_ID });

  const result = await verifyDevicePopResponseV1(response, f.deps);

  assert.deepEqual(result, { ok: false, error: 'CHALLENGE_MISMATCH' });
  assert.equal(f.consumeCalls, 0);
});

test('expired challenge is rejected by backend time before credential verification', async () => {
  let credentialCalls = 0;
  const f = fixture({
    now: () => EXPIRY,
    credentials: {
      async resolveActiveCredential() {
        credentialCalls++;
        throw new Error('must not be called');
      },
    },
  });

  const result = await verifyDevicePopResponseV1(
    signedResponse(f.stored),
    f.deps,
  );

  assert.deepEqual(result, { ok: false, error: 'CHALLENGE_EXPIRED' });
  assert.equal(credentialCalls, 0);
  assert.equal(f.consumeCalls, 0);
});

test('already-consumed challenge replay is rejected before cryptography', async () => {
  const stored = challenge();
  let credentialCalls = 0;
  const deps = {
    challenges: {
      async findByChallengeId() {
        return {
          challenge: stored,
          consumedAt: '2026-09-27T18:29:30.000Z',
        };
      },
      async consumeIfUnconsumed() {
        throw new Error('must not consume');
      },
    },
    credentials: {
      async resolveActiveCredential() {
        credentialCalls++;
        throw new Error('must not resolve');
      },
    },
    now: () => NOW,
  };

  const result = await verifyDevicePopResponseV1(
    signedResponse(stored),
    deps,
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'CHALLENGE_ALREADY_CONSUMED',
  });
  assert.equal(credentialCalls, 0);
});

test('wrong/replaced credential authority is rejected', async () => {
  const f = fixture({
    credentials: {
      async resolveActiveCredential() {
        return {
          deviceId: DEVICE_ID,
          credentialVersion: 4,
          state: 'ACTIVE',
          publicKeySec1: sec1PublicKey(),
        };
      },
    },
  });

  const result = await verifyDevicePopResponseV1(
    signedResponse(f.stored),
    f.deps,
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'ACTIVE_CREDENTIAL_NOT_FOUND',
  });
  assert.equal(f.consumeCalls, 0);
});

test('malformed enrolled SEC1 public key fails closed', async () => {
  const f = fixture({
    credentials: {
      async resolveActiveCredential(deviceId, credentialVersion) {
        return {
          deviceId,
          credentialVersion,
          state: 'ACTIVE',
          publicKeySec1: new Uint8Array(65).fill(0x01),
        };
      },
    },
  });

  const result = await verifyDevicePopResponseV1(
    signedResponse(f.stored),
    f.deps,
  );

  assert.deepEqual(result, { ok: false, error: 'INVALID_PUBLIC_KEY' });
  assert.equal(f.consumeCalls, 0);
});

test('concurrent successful verification loses authority if atomic consume loses race', async () => {
  const f = fixture({
    challenges: {
      async findByChallengeId() {
        return { challenge: challenge(), consumedAt: null };
      },
      async consumeIfUnconsumed() {
        return false;
      },
    },
  });

  const result = await verifyDevicePopResponseV1(
    signedResponse(f.stored),
    f.deps,
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'CHALLENGE_CONSUME_CONFLICT',
  });
});

test('response cannot smuggle its own public key through the strict contract', async () => {
  const f = fixture();
  const response = {
    ...signedResponse(f.stored),
    publicKey: sec1PublicKey().toString('base64url'),
  };

  const result = await verifyDevicePopResponseV1(response, f.deps);

  assert.deepEqual(result, {
    ok: false,
    error: 'INVALID_RESPONSE_CONTRACT',
  });
  assert.equal(f.consumeCalls, 0);
});

test('challenge-store and credential-resolver failures stay fail closed', async () => {
  const response = signedResponse(challenge());

  const storeFailure = await verifyDevicePopResponseV1(response, {
    challenges: {
      async findByChallengeId() {
        throw new Error('store unavailable');
      },
      async consumeIfUnconsumed() {
        return true;
      },
    },
    credentials: {
      async resolveActiveCredential() {
        throw new Error('unused');
      },
    },
    now: () => NOW,
  });
  assert.deepEqual(storeFailure, {
    ok: false,
    error: 'CHALLENGE_STORE_FAILURE',
  });

  const credentialFailure = await verifyDevicePopResponseV1(response, {
    challenges: {
      async findByChallengeId() {
        return { challenge: challenge(), consumedAt: null };
      },
      async consumeIfUnconsumed() {
        return true;
      },
    },
    credentials: {
      async resolveActiveCredential() {
        throw new Error('credential store unavailable');
      },
    },
    now: () => NOW,
  });
  assert.deepEqual(credentialFailure, {
    ok: false,
    error: 'CREDENTIAL_RESOLVER_FAILURE',
  });
});
