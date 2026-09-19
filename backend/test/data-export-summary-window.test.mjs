import test from 'node:test';
import assert from 'node:assert/strict';

import { toOwnerAuthorizedSensorSummaryExport } from '../dist/api/services/data-export-policy.js';

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

test('sensor summary export declares the known hourly window and keeps unknown sampling metadata explicit', () => {
  const result = toOwnerAuthorizedSensorSummaryExport(persistedSensorSummary());

  assert.deepEqual(result.aggregationWindow, {
    durationMinutes: 60,
    timestampAnchor: 'UNSPECIFIED_BY_CURRENT_CONTRACT',
    sampleRateStatus: 'NOT_RECORDED',
    sampleCountStatus: 'NOT_RECORDED',
  });

  assert.equal(result.provenance.eventTimeField, 'timestamp');
  assert.equal(result.provenance.receiveTimeField, 'createdAt');
  assert.equal(Object.hasOwn(result.aggregationWindow, 'sampleRateHz'), false);
  assert.equal(Object.hasOwn(result.aggregationWindow, 'sampleCount'), false);

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('ingestionId'), false, 'retry identity must remain internal');
});
