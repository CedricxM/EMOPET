import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.ACTIVITY_FEATURE_DB_INTEGRATION === '1';

const OWNER_A = 'a1111111-1111-4111-8111-111111111111';
const OWNER_B = 'a2222222-2222-4222-8222-222222222222';
const DOG_A = 'b1111111-1111-4111-8111-111111111111';
const DOG_B = 'b2222222-2222-4222-8222-222222222222';
const TAG_A = 'd1111111-1111-4111-8111-111111111111';
const TAG_B = 'd2222222-2222-4222-8222-222222222222';
const INGESTION = 'e1111111-1111-4111-8111-111111111111';

let sql = null;
let persistActivityVariabilityFeatureObservation = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, service, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/activity-variability-feature-ingestion.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 1 });
  persistActivityVariabilityFeatureObservation =
    service.persistActivityVariabilityFeatureObservation;
  closeDatabase = dbModule.closeDatabase;
}

async function cleanup() {
  if (!sql) return;
  await sql`DELETE FROM sensor_feature_observations
    WHERE dog_id IN (${DOG_A}, ${DOG_B})`;
  await sql`DELETE FROM devices WHERE id IN (${TAG_A}, ${TAG_B})`;
  await sql`DELETE FROM dogs WHERE id IN (${DOG_A}, ${DOG_B})`;
  await sql`DELETE FROM users WHERE id IN (${OWNER_A}, ${OWNER_B})`;
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

function observed(overrides = {}) {
  return {
    dogId: DOG_A,
    ingestionId: INGESTION,
    deviceId: TAG_A,
    observedAt: new Date('2026-09-27T09:00:00.000Z'),
    source: 'TAG',
    featureKey: 'activity_variability',
    value: 0.42,
    observationStatus: 'OBSERVED',
    nullReason: null,
    featureContractVersion: 'tag-activity-variability-cv30m-v1',
    windowSeconds: 1800,
    validSeconds: 1700,
    ...overrides,
  };
}

test('activity feature persistence is owner/device bound, idempotent and fail-closed', {
  skip: !enabled,
}, async () => {
  await cleanup();

  await sql`
    INSERT INTO users (id, email, password_hash, name) VALUES
      (${OWNER_A}, 'activity-owner-a@emopet.invalid', 'test-only', 'Owner A'),
      (${OWNER_B}, 'activity-owner-b@emopet.invalid', 'test-only', 'Owner B')
  `;

  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class) VALUES
      (${DOG_A}, ${OWNER_A}, 'Dog A', 'Test', '2020-01-01', 'female', 20.0, 'FC2'),
      (${DOG_B}, ${OWNER_B}, 'Dog B', 'Test', '2021-01-01', 'male', 21.0, 'FC2')
  `;

  await sql`
    INSERT INTO devices (id, dog_id, type, mac_address, firmware_version) VALUES
      (${TAG_A}, ${DOG_A}, 'TAG', '02:00:00:00:11:11', '6.0.0'),
      (${TAG_B}, ${DOG_B}, 'TAG', '02:00:00:00:22:22', '6.0.0')
  `;

  const invalidCoverage = await persistActivityVariabilityFeatureObservation(
    OWNER_A,
    observed({ validSeconds: 899 }),
  );
  assert.equal(invalidCoverage.ok, false);
  assert.equal(invalidCoverage.error, 'INVALID_FEATURE_ENVELOPE');

  const wrongOwner = await persistActivityVariabilityFeatureObservation(
    OWNER_B,
    observed(),
  );
  assert.deepEqual(wrongOwner, { ok: false, error: 'OWNER_OR_DOG_NOT_FOUND' });

  const wrongDevice = await persistActivityVariabilityFeatureObservation(
    OWNER_A,
    observed({ deviceId: TAG_B }),
  );
  assert.deepEqual(wrongDevice, { ok: false, error: 'DEVICE_BINDING_INVALID' });

  const created = await persistActivityVariabilityFeatureObservation(OWNER_A, observed());
  assert.equal(created.ok, true, JSON.stringify(created));
  assert.equal(created.status, 'CREATED');
  assert.equal(created.observation.firmwareVersionAtIngest, '6.0.0');
  assert.equal(created.observation.featureContractVersion, 'tag-activity-variability-cv30m-v1');

  const replay = await persistActivityVariabilityFeatureObservation(OWNER_A, observed());
  assert.equal(replay.ok, true);
  assert.equal(replay.status, 'IDEMPOTENT_REPLAY');
  assert.equal(replay.observation.id, created.observation.id);

  const conflict = await persistActivityVariabilityFeatureObservation(
    OWNER_A,
    observed({ value: 0.43 }),
  );
  assert.deepEqual(conflict, { ok: false, error: 'INGESTION_CONFLICT' });

  const notObserved = await persistActivityVariabilityFeatureObservation(
    OWNER_A,
    observed({
      ingestionId: 'e3333333-3333-4333-8333-333333333333',
      value: null,
      observationStatus: 'NOT_OBSERVED',
      nullReason: 'INSUFFICIENT_COVERAGE',
      validSeconds: 400,
    }),
  );
  assert.equal(notObserved.ok, true);
  assert.equal(notObserved.status, 'CREATED');
  assert.equal(notObserved.observation.value, null);

  const rows = await sql`
    SELECT dog_id, device_id, feature_key, feature_contract_version,
           window_seconds, valid_seconds, firmware_version_at_ingest
    FROM sensor_feature_observations
    WHERE dog_id = ${DOG_A}
    ORDER BY observed_at, ingestion_id
  `;
  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.equal(row.dog_id, DOG_A);
    assert.equal(row.device_id, TAG_A);
    assert.equal(row.feature_key, 'activity_variability');
    assert.equal(row.feature_contract_version, 'tag-activity-variability-cv30m-v1');
    assert.equal(row.window_seconds, 1800);
    assert.equal(row.firmware_version_at_ingest, '6.0.0');
  }
});
