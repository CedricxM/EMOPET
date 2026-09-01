import test from 'node:test';
import assert from 'node:assert/strict';

import {
  exportEnvelopeToCsv,
  serializeEliForGuardianExport,
} from '../dist/api/services/data-export-policy.js';

const base = {
  id: '10000000-0000-4000-8000-000000000001',
  dogId: '20000000-0000-4000-8000-000000000001',
  timestamp: new Date('2026-09-01T08:00:00.000Z'),
  arousal: 0.62,
  valence: -0.71,
  load: 0.58,
  confidence: 0.84,
  sensorReliability: { piezo: 'VALID', imu: 'VALID' },
  createdAt: new Date('2026-09-01T08:00:01.000Z'),
};

test('DATA-01: PUBLISH exports Guardian-authorized ELI values but never valence', () => {
  const exported = serializeEliForGuardianExport({ ...base, gateStatus: 'PUBLISH' });

  assert.equal(exported.arousal, base.arousal);
  assert.equal(exported.load, base.load);
  assert.equal(exported.gateStatus, 'PUBLISH');
  assert.equal(exported.latentValuesStatus, 'PUBLISHED');
  assert.equal(Object.hasOwn(exported, 'valence'), false);
  assert.equal(JSON.stringify(exported).includes('valence'), false);
});

test('DATA-01: DEGRADE withholds arousal/load and never exports valence', () => {
  const exported = serializeEliForGuardianExport({ ...base, gateStatus: 'DEGRADE' });

  assert.equal(exported.gateStatus, 'DEGRADE');
  assert.equal(exported.latentValuesStatus, 'WITHHELD_BY_ELI_GATE');
  assert.equal(Object.hasOwn(exported, 'arousal'), false);
  assert.equal(Object.hasOwn(exported, 'load'), false);
  assert.equal(Object.hasOwn(exported, 'valence'), false);
});

test('DATA-01: REJECT withholds arousal/load and never exports valence', () => {
  const exported = serializeEliForGuardianExport({ ...base, gateStatus: 'REJECT' });

  assert.equal(exported.gateStatus, 'REJECT');
  assert.equal(exported.latentValuesStatus, 'WITHHELD_BY_ELI_GATE');
  assert.equal(Object.hasOwn(exported, 'arousal'), false);
  assert.equal(Object.hasOwn(exported, 'load'), false);
  assert.equal(Object.hasOwn(exported, 'valence'), false);
});

test('DATA-01: unknown gate fails closed for latent values', () => {
  const exported = serializeEliForGuardianExport({ ...base, gateStatus: 'FUTURE_STATE' });

  assert.equal(exported.latentValuesStatus, 'WITHHELD_BY_ELI_GATE');
  assert.equal(Object.hasOwn(exported, 'arousal'), false);
  assert.equal(Object.hasOwn(exported, 'load'), false);
  assert.equal(Object.hasOwn(exported, 'valence'), false);
});

test('DATA-01: CSV export cannot leak valence and preserves gated rows without latent values', () => {
  const publish = serializeEliForGuardianExport({ ...base, gateStatus: 'PUBLISH' });
  const rejected = serializeEliForGuardianExport({
    ...base,
    id: '10000000-0000-4000-8000-000000000002',
    gateStatus: 'REJECT',
  });

  const csv = exportEnvelopeToCsv({
    devices: [],
    preprocessed: [],
    inferred: [publish, rejected],
    baselines: [],
  });

  assert.equal(csv.includes('valence'), false);
  assert.match(csv, /arousal/);
  assert.match(csv, /load/);
  assert.match(csv, /PUBLISH/);
  assert.match(csv, /REJECT/);
  assert.equal(csv.includes(String(base.valence)), false);
});
