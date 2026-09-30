import test from 'node:test';
import assert from 'node:assert/strict';

import {
  issueDeviceCredentialActivationChallengeV1,
} from '../dist/api/security/device-credential-activation-pop-issuer.js';

const DEVICE_ID = '11111111-1111-4111-8111-111111111111';
const CHALLENGE_ID = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-09-30T16:00:00.000Z');
const EXPIRY = new Date('2026-09-30T16:01:00.000Z');

function fixture(overrides = {}) {
  const states = [];
  return {
    states,
    deps: {
      pendingCredentials: {
        async resolvePendingCredential(deviceId, credentialVersion) {
          return {
            deviceId,
            credentialVersion,
            state: 'PENDING_PROOF',
          };
        },
      },
      store: {
        async createIfAbsent(state) {
          states.push(state);
          return true;
        },
      },
      now: () => NOW,
      entropy: {
        randomUuid: () => CHALLENGE_ID,
        randomBytes: (length) => new Uint8Array(length).fill(0x5a),
      },
      ...overrides,
    },
  };
}

test('manufacturing issuer creates activation-purpose challenge from exact PENDING_PROOF credential', async () => {
  const f = fixture();
  const result = await issueDeviceCredentialActivationChallengeV1(
    { deviceId: DEVICE_ID, credentialVersion: 4, expiresAt: EXPIRY },
    f.deps,
  );

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.challenge.deviceId, DEVICE_ID);
  assert.equal(result.challenge.credentialVersion, 4);
  assert.equal(result.challenge.purpose, 'DEVICE_CREDENTIAL_ACTIVATION');
  assert.equal(result.challenge.challengeId, CHALLENGE_ID);
  assert.equal(result.challenge.issuedAt, NOW.toISOString());
  assert.equal(result.challenge.expiresAt, EXPIRY.toISOString());
  assert.equal(f.states.length, 1);
  assert.deepEqual(f.states[0], {
    challenge: result.challenge,
    consumedAt: null,
  });
});

test('manufacturing issuer rejects missing or ACTIVE credential authority', async () => {
  for (const value of [null, {
    deviceId: DEVICE_ID,
    credentialVersion: 4,
    state: 'ACTIVE',
  }]) {
    const f = fixture({
      pendingCredentials: {
        async resolvePendingCredential() {
          return value;
        },
      },
    });

    const result = await issueDeviceCredentialActivationChallengeV1(
      { deviceId: DEVICE_ID, credentialVersion: 4, expiresAt: EXPIRY },
      f.deps,
    );
    assert.deepEqual(result, {
      ok: false,
      error: 'PENDING_CREDENTIAL_NOT_FOUND',
    });
    assert.equal(f.states.length, 0);
  }
});

test('manufacturing issuer refuses invalid version/expiry and resolver failures', async () => {
  const f = fixture();

  assert.deepEqual(
    await issueDeviceCredentialActivationChallengeV1(
      { deviceId: DEVICE_ID, credentialVersion: 0, expiresAt: EXPIRY },
      f.deps,
    ),
    { ok: false, error: 'INVALID_CREDENTIAL_VERSION' },
  );

  assert.deepEqual(
    await issueDeviceCredentialActivationChallengeV1(
      { deviceId: DEVICE_ID, credentialVersion: 4, expiresAt: NOW },
      f.deps,
    ),
    { ok: false, error: 'INVALID_EXPIRY' },
  );

  const broken = fixture({
    pendingCredentials: {
      async resolvePendingCredential() {
        throw new Error('repository unavailable');
      },
    },
  });
  assert.deepEqual(
    await issueDeviceCredentialActivationChallengeV1(
      { deviceId: DEVICE_ID, credentialVersion: 4, expiresAt: EXPIRY },
      broken.deps,
    ),
    { ok: false, error: 'CREDENTIAL_RESOLVER_FAILURE' },
  );
});

test('manufacturing issuer preserves atomic challenge-store refusal', async () => {
  const conflict = fixture({
    store: {
      async createIfAbsent() {
        return false;
      },
    },
  });
  assert.deepEqual(
    await issueDeviceCredentialActivationChallengeV1(
      { deviceId: DEVICE_ID, credentialVersion: 4, expiresAt: EXPIRY },
      conflict.deps,
    ),
    { ok: false, error: 'CHALLENGE_ID_CONFLICT' },
  );

  const failure = fixture({
    store: {
      async createIfAbsent() {
        throw new Error('store unavailable');
      },
    },
  });
  assert.deepEqual(
    await issueDeviceCredentialActivationChallengeV1(
      { deviceId: DEVICE_ID, credentialVersion: 4, expiresAt: EXPIRY },
      failure.deps,
    ),
    { ok: false, error: 'CHALLENGE_STORE_FAILURE' },
  );
});

test('manufacturing issuer validates entropy output through shared contract', async () => {
  const f = fixture({
    entropy: {
      randomUuid: () => 'not-a-uuid',
      randomBytes: () => new Uint8Array(31),
    },
  });

  assert.deepEqual(
    await issueDeviceCredentialActivationChallengeV1(
      { deviceId: DEVICE_ID, credentialVersion: 4, expiresAt: EXPIRY },
      f.deps,
    ),
    { ok: false, error: 'CONTRACT_VALIDATION_FAILURE' },
  );
});
