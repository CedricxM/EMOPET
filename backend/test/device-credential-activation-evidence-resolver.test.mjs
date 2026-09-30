import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveDeviceCredentialActivationEvidenceV1,
} from '../dist/api/security/device-credential-activation-evidence-resolver.js';

const DEVICE = '11111111-1111-4111-8111-111111111111';
const POP_RECEIPT = '22222222-2222-4222-8222-222222222222';
const CHALLENGE = '33333333-3333-4333-8333-333333333333';
const DEBUG_RECEIPT = '44444444-4444-4444-8444-444444444444';
const TARGET_RECEIPT = '55555555-5555-4555-8555-555555555555';
const ACTIVATION = '66666666-6666-4666-8666-666666666666';
const NOW = new Date('2026-09-30T12:00:00.000Z');

function refs(overrides = {}) {
  return {
    schemaVersion: 'device-credential-activation-evidence-refs-v1',
    protocolVersion: 1,
    deviceId: DEVICE,
    pendingCredentialVersion: 4,
    popVerificationReceiptId: POP_RECEIPT,
    popChallengeId: CHALLENGE,
    debugStateReceiptId: DEBUG_RECEIPT,
    targetEvidenceReceiptId: TARGET_RECEIPT,
    firmwareVersion: 'fw-4',
    hardwareRevision: 'MS88SF3-P0',
    bootstrapRevision: 'boot-2',
    predecessorCredentialVersion: null,
    authority: 'SERVER_SIDE_MANUFACTURING_EVIDENCE_AUTHORITY',
    recordedAt: '2099-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function fixture(overrides = {}) {
  const pending = {
    deviceId: DEVICE,
    credentialVersion: 4,
    state: 'PENDING_PROOF',
    firmwareVersion: 'fw-4',
    hardwareRevision: 'MS88SF3-P0',
    bootstrapRevision: 'boot-2',
  };

  const pop = {
    receiptId: POP_RECEIPT,
    authority: 'SERVER_SIDE_POP_VERIFICATION_AUTHORITY',
    deviceId: DEVICE,
    credentialVersion: 4,
    challengeId: CHALLENGE,
    verificationResult: 'VERIFIED_AND_CONSUMED',
    verifiedAt: '2026-09-30T11:57:00.000Z',
    consumedAt: '2026-09-30T11:57:00.000Z',
  };

  const debug = {
    receiptId: DEBUG_RECEIPT,
    authority: 'SERVER_SIDE_PRODUCTION_DEBUG_AUTHORITY',
    deviceId: DEVICE,
    credentialVersion: 4,
    debugStateResult: 'APPROTECT_PRODUCTION_POLICY_VERIFIED',
    firmwareVersion: 'fw-4',
    hardwareRevision: 'MS88SF3-P0',
    bootstrapRevision: 'boot-2',
    recordedAt: '2026-09-30T11:58:00.000Z',
  };

  const target = {
    receiptId: TARGET_RECEIPT,
    authority: 'SERVER_SIDE_TARGET_EVIDENCE_AUTHORITY',
    deviceId: DEVICE,
    credentialVersion: 4,
    targetResult: 'REPRESENTATIVE_MS88SF3_NRF52840_VERIFIED',
    firmwareVersion: 'fw-4',
    hardwareRevision: 'MS88SF3-P0',
    bootstrapRevision: 'boot-2',
    recordedAt: '2026-09-30T11:59:00.000Z',
  };

  const deps = {
    pendingCredentials: {
      async resolvePendingCredential() {
        return pending;
      },
    },
    popProofs: {
      async findByReceiptId() {
        return pop;
      },
    },
    debugStates: {
      async findByReceiptId() {
        return debug;
      },
    },
    targetEvidence: {
      async findByReceiptId() {
        return target;
      },
    },
    now: () => NOW,
    randomUuid: () => ACTIVATION,
    ...overrides,
  };

  return { pending, pop, debug, target, deps };
}

test('resolver rebuilds canonical activation receipt from server-side evidence', async () => {
  const f = fixture();
  const result = await resolveDeviceCredentialActivationEvidenceV1(
    refs(),
    f.deps,
  );

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.receipt.activationId, ACTIVATION);
  assert.equal(result.receipt.cutoverType, 'INITIAL');
  assert.equal(result.receipt.predecessorResultingState, 'NONE');
  assert.equal(result.receipt.deviceDataTrustAuthorized, false);
  assert.equal(result.receipt.networkTelemetryPersistenceAuthorized, false);

  // Caller-controlled future recordedAt is discarded. The resolver derives the
  // canonical timestamp from the latest resolved evidence record.
  assert.equal(
    result.receipt.evidenceRefs.recordedAt,
    '2026-09-30T11:59:00.000Z',
  );
});

test('rotation receipt is shaped only from predecessor version, not caller verdicts', async () => {
  const f = fixture();
  const result = await resolveDeviceCredentialActivationEvidenceV1(
    refs({ predecessorCredentialVersion: 3 }),
    f.deps,
  );

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.receipt.cutoverType, 'ROTATION');
  assert.equal(result.receipt.predecessorCredentialVersion, 3);
  assert.equal(
    result.receipt.predecessorResultingState,
    'REVOKED_PENDING_ERASE',
  );
});

test('missing server-side evidence fails closed', async () => {
  const f = fixture({
    targetEvidence: {
      async findByReceiptId() {
        return null;
      },
    },
  });

  const result = await resolveDeviceCredentialActivationEvidenceV1(
    refs(),
    f.deps,
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'TARGET_EVIDENCE_RECEIPT_NOT_FOUND',
  });
});

test('wrong PoP challenge binding fails closed', async () => {
  const f = fixture();
  f.pop.challengeId = '77777777-7777-4777-8777-777777777777';

  const result = await resolveDeviceCredentialActivationEvidenceV1(
    refs(),
    f.deps,
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'POP_EVIDENCE_MISMATCH',
  });
});

test('wrong debug-device binding fails closed', async () => {
  const f = fixture();
  f.debug.deviceId = '77777777-7777-4777-8777-777777777777';

  const result = await resolveDeviceCredentialActivationEvidenceV1(
    refs(),
    f.deps,
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'DEBUG_EVIDENCE_MISMATCH',
  });
});

test('wrong target family fails closed', async () => {
  const f = fixture();
  f.target.targetResult = 'SOME_OTHER_TARGET';

  const result = await resolveDeviceCredentialActivationEvidenceV1(
    refs(),
    f.deps,
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'TARGET_EVIDENCE_MISMATCH',
  });
});

test('credential/evidence provenance mismatch fails closed', async () => {
  const f = fixture();
  f.debug.firmwareVersion = 'fw-other';

  const result = await resolveDeviceCredentialActivationEvidenceV1(
    refs(),
    f.deps,
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'PROVENANCE_MISMATCH',
  });
});

test('future or time-inverted evidence fails closed', async () => {
  const f = fixture();
  f.target.recordedAt = '2026-09-30T12:00:01.000Z';

  const future = await resolveDeviceCredentialActivationEvidenceV1(
    refs(),
    f.deps,
  );
  assert.deepEqual(future, {
    ok: false,
    error: 'EVIDENCE_TIME_INVALID',
  });

  f.target.recordedAt = '2026-09-30T11:59:00.000Z';
  f.pop.consumedAt = '2026-09-30T11:56:59.000Z';

  const inverted = await resolveDeviceCredentialActivationEvidenceV1(
    refs(),
    f.deps,
  );
  assert.deepEqual(inverted, {
    ok: false,
    error: 'EVIDENCE_TIME_INVALID',
  });
});

test('evidence-store exception fails closed without constructing receipt', async () => {
  const f = fixture({
    popProofs: {
      async findByReceiptId() {
        throw new Error('store unavailable');
      },
    },
  });

  const result = await resolveDeviceCredentialActivationEvidenceV1(
    refs(),
    f.deps,
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'EVIDENCE_STORE_FAILURE',
  });
});
