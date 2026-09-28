import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const schemaSource = new URL('../db/schema/sensors.ts', import.meta.url);
const serviceSource = new URL('../api/services/activity-variability-feature-ingestion.ts', import.meta.url);
const routesSource = new URL('../api/routes/sensors.ts', import.meta.url);
const validatorSource = new URL('../../packages/shared/src/validators/index.ts', import.meta.url);
const migrationSource = new URL('../db/migrations/0016_sensor_feature_observation_authority.sql', import.meta.url);
const replayMigrationSource = new URL('../db/migrations/0017_sensor_feature_transport_replay.sql', import.meta.url);
const timeMigrationSource = new URL('../db/migrations/0018_sensor_feature_event_time_provenance.sql', import.meta.url);
const eventTimeResolverSource = new URL('../api/services/device-boot-event-time.ts', import.meta.url);

test('activity feature persistence is narrow, versioned and non-affective', async () => {
  const [schema, service, migration, validator] = await Promise.all([
    readFile(schemaSource, 'utf8'),
    readFile(serviceSource, 'utf8'),
    readFile(migrationSource, 'utf8'),
    readFile(validatorSource, 'utf8'),
  ]);

  for (const source of [schema, migration, validator]) {
    assert.match(source, /activity_variability/);
    assert.match(source, /tag-activity-variability-cv30m-v1/);
    assert.match(source, /1800/);
  }
  assert.match(service, /ActivityVariabilityFeatureObservationCreateSchema/);

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
  assert.doesNotMatch(routes, /resolveBootRelativeEventTime/);
  assert.match(service, /No public route/);
  assert.match(service, /physical device/);
  assert.match(service, /does not create that anchor/);
  assert.match(service, /infer it\s*\n? \* from receive time/);
});

test('migration is additive and owns the new table at promotion-order 0016', async () => {
  const migration = await readFile(migrationSource, 'utf8');
  assert.match(migration, /CREATE TABLE sensor_feature_observations/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|DELETE FROM|UPDATE /i);
  assert.match(migration, /REFERENCES dogs\(id\)/);
  assert.match(migration, /REFERENCES devices\(id\)/);
  assert.match(migration, /UNIQUE INDEX uq_sensor_feature_observations_ingestion_id/);
});

test('transport replay persistence remains additive and separate from event-time authority', async () => {
  const [schema, service, replayMigration, validator] = await Promise.all([
    readFile(schemaSource, 'utf8'),
    readFile(serviceSource, 'utf8'),
    readFile(replayMigrationSource, 'utf8'),
    readFile(validatorSource, 'utf8'),
  ]);

  assert.match(schema, /transportBootSessionId/);
  assert.match(schema, /transportSequence/);
  assert.match(schema, /uq_sensor_feature_observations_transport_replay/);
  assert.match(replayMigration, /transport_boot_session_id bigint/);
  assert.match(replayMigration, /transport_sequence integer/);
  assert.match(replayMigration, /4294967295/);
  assert.match(replayMigration, /65535/);
  assert.match(service, /randomUUID/);
  assert.match(service, /existingByTransport/);
  assert.match(validator, /ingestionId or transportProvenance is required/);
  assert.doesNotMatch(replayMigration, /DROP TABLE|DROP COLUMN|DELETE FROM|UPDATE /i);
  assert.doesNotMatch(replayMigration.toLowerCase(), /wall.*time.*mapping/);
});

test('boot-anchor event-time resolution preserves uncertainty without activating receive-time inference', async () => {
  const [schema, service, migration, resolver, validator] = await Promise.all([
    readFile(schemaSource, 'utf8'),
    readFile(serviceSource, 'utf8'),
    readFile(timeMigrationSource, 'utf8'),
    readFile(eventTimeResolverSource, 'utf8'),
    readFile(validatorSource, 'utf8'),
  ]);

  assert.match(schema, /transportWindowEndMs/);
  assert.match(schema, /clockAnchorDeviceMs/);
  assert.match(schema, /eventTimeUncertaintyMs/);
  assert.match(service, /clockAnchorUtc/);
  assert.match(service, /eventTimeUncertaintyMs/);

  assert.match(migration, /transport_window_end_ms bigint/);
  assert.match(migration, /event_time_resolution varchar\(32\)/);
  assert.match(migration, /clock_anchor_device_ms bigint/);
  assert.match(migration, /clock_anchor_utc timestamptz/);
  assert.match(migration, /event_time_uncertainty_ms integer/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|DELETE FROM|UPDATE /i);

  assert.match(resolver, /UINT32_HALF_RANGE/);
  assert.match(resolver, /AMBIGUOUS_OR_TOO_OLD/);
  assert.match(resolver, /maxLookbackMs/);
  assert.match(resolver, /No receive-time shortcut is used/);
  assert.doesNotMatch(resolver, /Date\.now\(/);
  assert.doesNotMatch(resolver, /receivedAt/);

  assert.match(validator, /BOOT_ANCHOR_V1/);
  assert.match(validator, /eventTimeProvenance requires transportProvenance/);
  assert.match(validator, /transportProvenance requires qualityState/);
});
