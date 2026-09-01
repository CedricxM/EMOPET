import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  exportEnvelopeToCsv,
  serializeBaselineForGuardianExport,
} from '../dist/api/services/data-export-policy.js';

const persistedBaseline = {
  id: '30000000-0000-4000-8000-000000000001',
  dogId: '20000000-0000-4000-8000-000000000001',
  startedAt: new Date('2026-08-01T08:00:00.000Z'),
  validHours: 72.5,
  established: 1,
  metrics: {
    activityVariabilityMean: 0.42,
    rrVariabilityMean: 0.17,
    internalCandidate: 'DO_NOT_DISCLOSE',
  },
  updatedAt: new Date('2026-09-01T08:00:00.000Z'),
};

test('DATA-01: baseline serializer exposes lifecycle metadata but never persisted metrics', () => {
  const exported = serializeBaselineForGuardianExport(persistedBaseline);

  assert.equal(exported.id, persistedBaseline.id);
  assert.equal(exported.dogId, persistedBaseline.dogId);
  assert.equal(exported.validHours, persistedBaseline.validHours);
  assert.equal(exported.established, persistedBaseline.established);
  assert.equal(exported.metricsStatus, 'WITHHELD_PENDING_DISCLOSURE_AUTHORITY');
  assert.equal(Object.hasOwn(exported, 'metrics'), false);
  assert.equal(JSON.stringify(exported).includes('DO_NOT_DISCLOSE'), false);
});

test('DATA-01: CSV export cannot leak opaque baseline metric payload', () => {
  const baseline = serializeBaselineForGuardianExport(persistedBaseline);
  const csv = exportEnvelopeToCsv({
    devices: [],
    preprocessed: [],
    inferred: [],
    baselines: [baseline],
  });

  assert.match(csv, /baseline/);
  assert.match(csv, /WITHHELD_PENDING_DISCLOSURE_AUTHORITY/);
  assert.equal(csv.includes('activityVariabilityMean'), false);
  assert.equal(csv.includes('rrVariabilityMean'), false);
  assert.equal(csv.includes('DO_NOT_DISCLOSE'), false);
});

test('DATA-01: route delegates baseline disclosure to controlled serializer', async () => {
  const route = await readFile(new URL('../api/routes/data-export.ts', import.meta.url), 'utf8');

  assert.match(route, /baselineRows\.map\(serializeBaselineForGuardianExport\)/);
  assert.doesNotMatch(route, /baselines:\s*baselineRows[,\n]/);
  assert.match(route, /p0-data-act-v3/);
});
