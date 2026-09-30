import test from 'node:test';
import assert from 'node:assert/strict';

import {
  issueDeviceCredentialActivationChallengeV1,
  issueDevicePopChallengeV1,
} from '../dist/api/security/device-pop-challenge-issuer.js';

const DEVICE_ID = '11111111-1111-4111-8111-111111111111';
const CHALLENGE_ID = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-09-27T17:30:00.000Z');
const EXPIRY = new Date('2026-09-27T17:31:00.000Z');

function dependencies(overrides = {}) {
  const states = [];
  return {
    states,
    deps: {
      credentials: {
        async resolveActiveCredential(deviceId) {
          return {
            deviceId,
            credentialVersion: 3,
            state: 'ACTIVE',
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

test('issuer creates one telemetry-only challenge from active credential authority', async () => {
  const { deps, states } = dependencies();
  const result = await issueDevicePopChallengeV1(
    { deviceId: DEVICE_ID, expiresAt: EXPIRY },
    deps,
  );

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.challenge.deviceId, DEVICE_ID);
  assert.equal(result.challenge.credentialVersion, 3);
  assert.equal(result.challenge.purpose, 'DEVICE_DATA_TELEMETRY_INGRESS');
  assert.equal(result.challenge.challengeId, CHALLENGE_ID);
  assert.equal(result.challenge.nonce, 'WlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlo');
  assert.equal(result.challenge.issuedAt, NOW.toISOString());
  assert.equal(result.challenge.expiresAt, EXPIRY.toISOString());
  assert.equal(result.challenge.signingContract, 'EMOPET_DEVICE_POP_FIXED_BINARY_V1');

  assert.equal(states.length, 1);
  assert.deepEqual(states[0], {
    challenge: result.challenge,
    consumedAt: null,
  });
});

test('issuer has no implicit TTL and rejects non-future expiry', async () => {
  const { deps } = dependencies();
  const result = await issueDevicePopChallengeV1(
    { deviceId: DEVICE_ID, expiresAt: NOW },
    deps,
  );
  assert.deepEqual(result, { ok: false, error: 'INVALID_EXPIRY' });
});

test('issuer fails closed when no active enrolled credential exists', async () => {
  const { deps } = dependencies({
    credentials: {
      async resolveActiveCredential() {
        return null;
      },
    },
  });
  const result = await issueDevicePopChallengeV1(
    { deviceId: DEVICE_ID, expiresAt: EXPIRY },
    deps,
  );
  assert.deepEqual(result, {
    ok: false,
    error: 'ACTIVE_CREDENTIAL_NOT_FOUND',
  });
});

test('issuer rejects credential authority for a different canonical device', async () => {
  const { deps } = dependencies({
    credentials: {
      async resolveActiveCredential() {
        return {
          deviceId: '33333333-3333-4333-8333-333333333333',
          credentialVersion: 3,
          state: 'ACTIVE',
        };
      },
    },
  });
  const result = await issueDevicePopChallengeV1(
    { deviceId: DEVICE_ID, expiresAt: EXPIRY },
    deps,
  );
  assert.deepEqual(result, {
    ok: false,
    error: 'ACTIVE_CREDENTIAL_NOT_FOUND',
  });
});

test('issuer treats atomic challenge-id conflict as refusal rather than retrying silently', async () => {
  let calls = 0;
  const { deps } = dependencies({
    store: {
      async createIfAbsent() {
        calls++;
        return false;
      },
    },
  });
  const result = await issueDevicePopChallengeV1(
    { deviceId: DEVICE_ID, expiresAt: EXPIRY },
    deps,
  );
  assert.deepEqual(result, { ok: false, error: 'CHALLENGE_ID_CONFLICT' });
  assert.equal(calls, 1);
});

test('issuer fails closed on challenge-store exception', async () => {
  const { deps } = dependencies({
    store: {
      async createIfAbsent() {
        throw new Error('store unavailable');
      },
    },
  });
  const result = await issueDevicePopChallengeV1(
    { deviceId: DEVICE_ID, expiresAt: EXPIRY },
    deps,
  );
  assert.deepEqual(result, { ok: false, error: 'CHALLENGE_STORE_FAILURE' });
});

test('issuer validates entropy output through shared challenge contract', async () => {
  const { deps } = dependencies({
    entropy: {
      randomUuid: () => 'not-a-uuid',
      randomBytes: () => new Uint8Array(31),
    },
  });
  const result = await issueDevicePopChallengeV1(
    { deviceId: DEVICE_ID, expiresAt: EXPIRY },
    deps,
  );
  assert.deepEqual(result, {
    ok: false,
    error: 'CONTRACT_VALIDATION_FAILURE',
  });
});


function activationDependencies(overrides = {}) {
  const states = [];
  return {
    states,
    deps: {
      credentials: {
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

test('manufacturing issuer creates activation-only challenge from exact pending credential', async () => {
  const { deps, states } = activationDependencies();
  const result = await issueDeviceCredentialActivationChallengeV1(
    {
      deviceId: DEVICE_ID,
      credentialVersion: 7,
      expiresAt: EXPIRY,
    },
    deps,
  );

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.challenge.deviceId, DEVICE_ID);
  assert.equal(result.challenge.credentialVersion, 7);
  assert.equal(result.challenge.purpose, 'DEVICE_CREDENTIAL_ACTIVATION');
  assert.equal(states.length, 1);
  assert.equal(states[0].challenge.purpose, 'DEVICE_CREDENTIAL_ACTIVATION');
});

test('manufacturing issuer refuses absent/wrong pending credential authority', async () => {
  const { deps } = activationDependencies({
    credentials: {
      async resolvePendingCredential() {
        return null;
      },
    },
  });
  const result = await issueDeviceCredentialActivationChallengeV1(
    {
      deviceId: DEVICE_ID,
      credentialVersion: 7,
      expiresAt: EXPIRY,
    },
    deps,
  );
  assert.deepEqual(result, {
    ok: false,
    error: 'PENDING_CREDENTIAL_NOT_FOUND',
  });
});

test('telemetry and activation issuers cannot silently swap credential states', async () => {
  const telemetry = dependencies({
    credentials: {
      async resolveActiveCredential(deviceId) {
        return {
          deviceId,
          credentialVersion: 3,
          state: 'PENDING_PROOF',
        };
      },
    },
  });
  assert.deepEqual(
    await issueDevicePopChallengeV1(
      { deviceId: DEVICE_ID, expiresAt: EXPIRY },
      telemetry.deps,
    ),
    { ok: false, error: 'ACTIVE_CREDENTIAL_NOT_FOUND' },
  );

  const activation = activationDependencies({
    credentials: {
      async resolvePendingCredential(deviceId, credentialVersion) {
        return {
          deviceId,
          credentialVersion,
          state: 'ACTIVE',
        };
      },
    },
  });
  assert.deepEqual(
    await issueDeviceCredentialActivationChallengeV1(
      {
        deviceId: DEVICE_ID,
        credentialVersion: 7,
        expiresAt: EXPIRY,
      },
      activation.deps,
    ),
    { ok: false, error: 'PENDING_CREDENTIAL_NOT_FOUND' },
  );
});
