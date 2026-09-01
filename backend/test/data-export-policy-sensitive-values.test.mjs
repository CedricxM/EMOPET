import test from 'node:test';
import assert from 'node:assert/strict';

import {
  exportEnvelopeToCsv,
  serializeEliForGuardianExport,
} from '../dist/api/services/data-export-policy.js';

const persisted = {
  id: '10000000-0000-4000-8000-000000000099',
  dogId: '20000000-0000-4000-8000-000000000099',
  timestamp: new Date('2026-09-01T08:00:00.000Z'),
  arousal: 0.6192837465,
  valence: -0.7139462817,
  load: 0.5872319456,
  confidence: 0.8437281954,
  sensorReliability: { piezo: 'VALID', imu: 'VALID' },
  createdAt: new Date('2026-09-01T08:00:01.000Z'),
};

function csvFor(gateStatus) {
  const inferred = serializeEliForGuardianExport({ ...persisted, gateStatus });
  return exportEnvelopeToCsv({
    devices: [],
    preprocessed: [],
    inferred: [inferred],
    baselines: [],
  });
}

test('DATA-01: PUBLISH CSV includes authorized arousal/load but not valence', () => {
  const csv = csvFor('PUBLISH');
  assert.ok(csv.includes(String(persisted.arousal)));
  assert.ok(csv.includes(String(persisted.load)));
  assert.equal(csv.includes(String(persisted.valence)), false);
});

for (const gateStatus of ['DEGRADE', 'REJECT', 'FUTURE_STATE']) {
  test(`DATA-01: ${gateStatus} CSV contains none of the persisted latent values`, () => {
    const csv = csvFor(gateStatus);
    assert.equal(csv.includes(String(persisted.arousal)), false);
    assert.equal(csv.includes(String(persisted.load)), false);
    assert.equal(csv.includes(String(persisted.valence)), false);
  });
}
