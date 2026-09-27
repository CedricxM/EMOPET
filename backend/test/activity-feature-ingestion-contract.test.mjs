import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const schemaSource = new URL('../db/schema/sensors.ts', import.meta.url);
const serviceSource = new URL('../api/services/activity-variability-feature-ingestion.ts', import.meta.url);
const routesSource = new URL('../api/routes/sensors.ts', import.meta.url);
const migrationSource = new URL('../db/migrations/0016_sensor_feature_observation_authority.sql', import.meta.url);

test('activity feature persistence is narrow, versioned and non-affective', async () => {
  const [schema, service, migration] = await Promise.all([
    readFile(schemaSource, 'utf8'),
    readFile(serviceSource, 'utf8'),
    readFile(migrationSource, 'utf8'),
  ]);

  for (const source of [schema, service, migration]) {
    assert.match(source, /activity_variability/);
    assert.match(source, /tag-activity-variability-cv30m-v1/);
    assert.match(source, /1800/);
  }

  assert.match(schema, /INSUFFICIENT_COVERAGE/);
  assert.match(schema, /MEAN_BELOW_DIVISION_GUARD/);
  assert.match(schema, /validSeconds/);
  assert.match(service, /firmwareVersionAtIngest/);

  for (const forbidden of ['arousal', 'valence', 'wellbeing', 'emotion']) {
    assert.equal(
      migration.toLowerCase().includes(forbidden),
      false,
      `persistence migration must not encode affective semantics: ${forbidden}`,
    );
  }
});

test('feature persistence primitive is not yet exposed through a backend route', async () => {
  const [routes, service] = await Promise.all([
    readFile(routesSource, 'utf8'),
    readFile(serviceSource, 'utf8'),
  ]);

  assert.doesNotMatch(routes, /persistActivityVariabilityFeatureObservation/);
  assert.doesNotMatch(routes, /sensor_feature_observations/);
  assert.match(service, /No public route/);
  assert.match(service, /BLE V1 frame does not carry/);
});

test('migration is additive and owns the new table at promotion-order 0016', async () => {
  const migration = await readFile(migrationSource, 'utf8');
  assert.match(migration, /CREATE TABLE sensor_feature_observations/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|DELETE FROM|UPDATE /i);
  assert.match(migration, /REFERENCES dogs\(id\)/);
  assert.match(migration, /REFERENCES devices\(id\)/);
  assert.match(migration, /UNIQUE INDEX uq_sensor_feature_observations_ingestion_id/);
});
