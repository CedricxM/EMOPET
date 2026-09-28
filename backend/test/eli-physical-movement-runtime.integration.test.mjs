import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.ELI_PHYSICAL_MOVEMENT_DB_INTEGRATION === '1';

const OWNER_A = 'a7111111-1111-4111-8111-111111111111';
const OWNER_B = 'a7222222-2222-4222-8222-222222222222';
const DOG_A = 'b7111111-1111-4111-8111-111111111111';
const DOG_EMPTY = 'b7333333-3333-4333-8333-333333333333';
const TAG_A = 'd7111111-1111-4111-8111-111111111111';
const INGEST_AVAILABLE = 'e7111111-1111-4111-8111-111111111111';
const INGEST_LEGACY = 'e7222222-2222-4222-8222-222222222222';

let sql = null;
let persist = null;
let project = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, writeModule, runtimeModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/activity-variability-feature-ingestion.js'),
    import('../dist/api/services/eli-runtime/physical-movement-observation.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 1 });
  persist = writeModule.persistActivityVariabilityFeatureObservation;
  project = runtimeModule.projectLatestPhysicalMovementObservation;
  closeDatabase = dbModule.closeDatabase;
}

async function cleanup() {
  if (!sql) return;
  await sql`DELETE FROM sensor_feature_observations WHERE dog_id IN (${DOG_A}, ${DOG_EMPTY})`;
  await sql`DELETE FROM devices WHERE id = ${TAG_A}`;
  await sql`DELETE FROM dogs WHERE id IN (${DOG_A}, ${DOG_EMPTY})`;
  await sql`DELETE FROM users WHERE id IN (${OWNER_A}, ${OWNER_B})`;
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('first live #479 slice publishes physical movement only and abstains on incomplete provenance', {
  skip: !enabled,
}, async () => {
  await cleanup();

  await sql`
    INSERT INTO users (id, email, password_hash, name) VALUES
      (${OWNER_A}, 'eli-runtime-a@emopet.invalid', 'test-only', 'Owner A'),
      (${OWNER_B}, 'eli-runtime-b@emopet.invalid', 'test-only', 'Owner B')
  `;

  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class) VALUES
      (${DOG_A}, ${OWNER_A}, 'Runtime Dog', 'Test', '2020-01-01', 'female', 20.0, 'FC2'),
      (${DOG_EMPTY}, ${OWNER_A}, 'Empty Runtime Dog', 'Test', '2021-01-01', 'male', 19.0, 'FC2')
  `;

  await sql`
    INSERT INTO devices (id, dog_id, type, mac_address, firmware_version)
    VALUES (${TAG_A}, ${DOG_A}, 'TAG', '02:00:00:00:77:11', '6.1.0')
  `;

  const stored = await persist(OWNER_A, {
    dogId: DOG_A,
    ingestionId: INGEST_AVAILABLE,
    deviceId: TAG_A,
    observedAt: new Date('2026-09-27T12:00:00.000Z'),
    source: 'TAG',
    featureKey: 'activity_variability',
    value: 0.37,
    observationStatus: 'OBSERVED',
    nullReason: null,
    featureContractVersion: 'tag-activity-variability-cv30m-v1',
    windowSeconds: 1800,
    validSeconds: 1710,
    qualityState: 'VALID',
    transportProvenance: {
      transportVersion: 1,
      bootSessionId: 0x778899aa,
      sequence: 41,
      windowEndMs: 3_600_000,
    },
    eventTimeProvenance: {
      strategy: 'BOOT_ANCHOR_V1',
      anchorDeviceMs: 3_700_000,
      anchorUtc: new Date('2026-09-27T12:01:40.000Z'),
      uncertaintyMs: 120,
    },
  });
  assert.equal(stored.ok, true, JSON.stringify(stored));

  const available = await project(OWNER_A, DOG_A, new Date('2026-09-27T12:05:00.000Z'));
  assert.equal(available.ok, true, JSON.stringify(available));
  assert.equal(available.response.status, 'AVAILABLE');
  assert.equal(available.response.observation.observationKind, 'PHYSICAL_MOVEMENT_VARIABILITY');
  assert.equal(available.response.observation.value, 0.37);
  assert.equal(available.response.observation.qualityState, 'VALID');
  assert.equal(available.response.observation.affectiveInterpretationAuthorized, false);
  assert.equal(available.response.observation.latentStatePublished, false);
  assert.equal(available.response.observation.runtimeVersion, 'eli-runtime-physical-movement-v1');
  assert.equal(available.response.observation.eventTime.uncertaintyMs, 120);

  const wrongOwner = await project(OWNER_B, DOG_A);
  assert.deepEqual(wrongOwner, { ok: false, error: 'DOG_NOT_FOUND' });

  const none = await project(OWNER_A, DOG_EMPTY, new Date('2026-09-27T12:05:00.000Z'));
  assert.equal(none.ok, true);
  assert.equal(none.response.status, 'NONE_FOUND');

  await sql`
    INSERT INTO sensor_feature_observations (
      dog_id, ingestion_id, device_id, observed_at, source, feature_key, value,
      observation_status, null_reason, feature_contract_version, window_seconds,
      valid_seconds, quality_state, firmware_version_at_ingest
    ) VALUES (
      ${DOG_A}, ${INGEST_LEGACY}, ${TAG_A}, '2026-09-27T12:10:00Z', 'TAG',
      'activity_variability', 0.41, 'OBSERVED', NULL,
      'tag-activity-variability-cv30m-v1', 1800, 1700, NULL, '6.1.0'
    )
  `;

  const abstained = await project(OWNER_A, DOG_A);
  assert.equal(abstained.ok, true);
  assert.equal(abstained.response.status, 'UNAVAILABLE');
  assert.equal(abstained.response.reason, 'QUALITY_MISSING');
});
