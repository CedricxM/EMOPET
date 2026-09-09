import test from 'node:test';
import assert from 'node:assert/strict';

import { toGuardianAuthorizedEliExport } from '../dist/api/services/data-export-policy.js';

function persistedEli(gateStatus = 'PUBLISH') {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    dogId: '22222222-2222-4222-8222-222222222222',
    timestamp: new Date('2026-09-09T20:00:00.000Z'),
    arousal: 0.73,
    valence: -0.41,
    load: 0.62,
    confidence: 0.91,
    gateStatus,
    sensorReliability: {
      pvdf: 'VALID',
      loadCells: 'VALID',
      imu: 'VALID',
      mic: 'DEGRADED',
      piezo: 'VALID',
      gps: 'SUPPRESSED',
    },
    createdAt: new Date('2026-09-09T20:00:01.000Z'),
  };
}

function assertInternalStateIsAbsent(result) {
  assert.equal('valence' in result, false);
  assert.equal('arousal' in result, false);
  assert.equal('sensorReliability' in result, false);

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('"valence"'), false);
  assert.equal(serialized.includes('"arousal"'), false);
  assert.equal(serialized.includes('"sensorReliability"'), false);
}

test('PUBLISH exports only Guardian-authorized inferred ELI fields', () => {
  const result = toGuardianAuthorizedEliExport(persistedEli('PUBLISH'));

  assert.equal(result.gateStatus, 'PUBLISH');
  assert.equal(result.load, 0.62);
  assert.equal(result.confidence, 0.91);
  assert.equal(result.provenance.publicationPolicy, 'GUARDIAN_AUTHORIZED_FIELDS_ONLY');
  assertInternalStateIsAbsent(result);
});

test('DEGRADE does not leak latent ELI values', () => {
  const result = toGuardianAuthorizedEliExport(persistedEli('DEGRADE'));

  assert.equal(result.gateStatus, 'DEGRADE');
  assert.equal('load' in result, false);
  assertInternalStateIsAbsent(result);
});

test('REJECT and unknown gate values fail closed', () => {
  for (const gateStatus of ['REJECT', 'UNRECOGNIZED']) {
    const result = toGuardianAuthorizedEliExport(persistedEli(gateStatus));

    assert.equal(result.gateStatus, gateStatus);
    assert.equal('load' in result, false);
    assertInternalStateIsAbsent(result);
  }
});
