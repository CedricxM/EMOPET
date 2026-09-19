import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  toOwnerAuthorizedBaselineExport,
  toOwnerAuthorizedEliExport,
  toOwnerAuthorizedSensorSummaryExport,
} from '../dist/api/services/data-export-policy.js';

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

function persistedSensorSummary() {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    dogId: '22222222-2222-4222-8222-222222222222',
    ingestionId: '55555555-5555-4555-8555-555555555555',
    deviceId: '66666666-6666-4666-8666-666666666666',
    timestamp: new Date('2026-09-12T18:00:00.000Z'),
    source: 'TAG',
    firmwareVersionAtIngest: '1.2.3',
    matPresenceMinutes: null,
    respiratoryRateMean: null,
    respiratoryRateStd: null,
    respiratoryRateConfidence: null,
    weightKg: null,
    positionChanges: null,
    activityMinutes: 12.5,
    distanceKm: 1.4,
    vocalEvents: 2,
    vocalEnergyMean: 18.4,
    postureDistribution: { walking: 0.4 },
    agitationEvents: 1,
    temperatureC: 19.2,
    humidityPct: 63,
    createdAt: new Date('2026-09-12T18:00:01.000Z'),
  };
}

function persistedBaseline() {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    dogId: '22222222-2222-4222-8222-222222222222',
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

test('sensor summary export exposes useful provenance but never leaks ingestion retry identity', () => {
  const row = persistedSensorSummary();
  const result = toOwnerAuthorizedSensorSummaryExport(row);

  assert.equal(result.id, row.id);
  assert.equal(result.deviceId, row.deviceId);
  assert.equal(result.firmwareVersionAtIngest, '1.2.3');
  assert.equal(result.timestamp.toISOString(), '2026-09-12T18:00:00.000Z');
  assert.equal(result.createdAt.toISOString(), '2026-09-12T18:00:01.000Z');
  assert.equal(result.provenance.deviceBinding, 'SERVER_VERIFIED_REGISTRY_BINDING');
  assert.equal(result.provenance.eventTimeField, 'timestamp');
  assert.equal(result.provenance.receiveTimeField, 'createdAt');
  assert.equal(result.provenance.firmwareSnapshotSource, 'SERVER_DEVICE_REGISTRY');
  assert.equal(Object.hasOwn(result, 'ingestionId'), false);

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('ingestionId'), false);
  assert.equal(serialized.includes(row.ingestionId), false);
});

test('PUBLISH exports only Owner-authorized inferred ELI fields', () => {
  const result = toOwnerAuthorizedEliExport(persistedEli('PUBLISH'));

  assert.equal(result.gateStatus, 'PUBLISH');
  assert.equal(result.load, 0.62);
  assert.equal(result.confidence, 0.91);
  assert.equal(result.provenance.publicationPolicy, 'OWNER_AUTHORIZED_FIELDS_ONLY');
  assertInternalStateIsAbsent(result);
});

test('DEGRADE does not leak latent ELI values', () => {
  const result = toOwnerAuthorizedEliExport(persistedEli('DEGRADE'));

  assert.equal(result.gateStatus, 'DEGRADE');
  assert.equal('load' in result, false);
  assertInternalStateIsAbsent(result);
});

test('REJECT and unknown gate values fail closed', () => {
  for (const gateStatus of ['REJECT', 'UNRECOGNIZED']) {
    const result = toOwnerAuthorizedEliExport(persistedEli(gateStatus));

    assert.equal(result.gateStatus, gateStatus);
    assert.equal('load' in result, false);
    assertInternalStateIsAbsent(result);
  }
});

test('baseline projection exposes lifecycle metadata but withholds opaque metrics', () => {
  const row = persistedBaseline();
  const result = toOwnerAuthorizedBaselineExport(row);

  assert.equal(result.id, row.id);
  assert.equal(result.dogId, row.dogId);
  assert.equal(result.validHours, row.validHours);
  assert.equal(result.established, row.established);
  assert.equal(result.metricsStatus, 'WITHHELD_PENDING_DISCLOSURE_AUTHORITY');
  assert.equal(result.provenance.publicationPolicy, 'OWNER_AUTHORIZED_FIELDS_ONLY');
  assert.equal(Object.hasOwn(result, 'metrics'), false);

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('activityVariabilityMean'), false);
  assert.equal(serialized.includes('rrVariabilityMean'), false);
  assert.equal(serialized.includes('DO_NOT_DISCLOSE'), false);
});

test('Owner export route must use the controlled sensor and baseline projections', async () => {
  const exportRoute = await readFile(new URL('../api/routes/data-export.ts', import.meta.url), 'utf8');

  assert.match(exportRoute, /summaryRows\.map\(toOwnerAuthorizedSensorSummaryExport\)/);
  assert.doesNotMatch(exportRoute, /preprocessed:\s*summaryRows\.map\(\(row\)\s*=>\s*\(\{\s*\.\.\.row/);
  assert.match(exportRoute, /baselineRows\.map\(toOwnerAuthorizedBaselineExport\)/);
  assert.doesNotMatch(exportRoute, /baselines:\s*baselineRows[,\n]/);
  assert.match(exportRoute, /baselineMetricDisclosurePolicy:\s*'WITHHELD_PENDING_DISCLOSURE_AUTHORITY'/);
  assert.match(exportRoute, /p0-data-act-v2/);

});
