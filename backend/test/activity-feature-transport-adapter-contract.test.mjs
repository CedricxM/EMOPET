import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('transport adapter remains route-less, physical-only and device-trust neutral', async () => {
  const [adapter, routes, schema, migration] = await Promise.all([
    readFile(new URL('../api/services/activity-variability-transport-adapter.ts', import.meta.url), 'utf8'),
    readFile(new URL('../api/routes/sensors.ts', import.meta.url), 'utf8'),
    readFile(new URL('../db/schema/sensors.ts', import.meta.url), 'utf8'),
    readFile(new URL('../db/migrations/0019_sensor_feature_quality_provenance.sql', import.meta.url), 'utf8'),
  ]);

  assert.match(adapter, /ActivityVariabilityFeatureTransportFrameSchema/);
  assert.match(adapter, /resolveBootRelativeEventTime/);
  assert.match(adapter, /persistActivityVariabilityFeatureObservation/);
  assert.match(adapter, /physical-device trust/);
  assert.doesNotMatch(adapter, /stepEKF|eliStates|arousal:|valence:/);

  assert.doesNotMatch(routes, /ingestActivityVariabilityTransportFrame/);
  assert.doesNotMatch(routes, /buildActivityVariabilityEnvelopeFromTransport/);

  assert.match(schema, /qualityState/);
  assert.match(migration, /quality_state varchar\(16\)/);
  assert.match(migration, /VALID/);
  assert.match(migration, /DEGRADED/);
  assert.match(migration, /SUPPRESSED/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|DELETE FROM|UPDATE /i);
});
