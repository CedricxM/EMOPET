import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.ACTIVITY_FEATURE_READ_DB_INTEGRATION === '1';

const OWNER_A = 'a4111111-1111-4111-8111-111111111111';
const OWNER_B = 'a4222222-2222-4222-8222-222222222222';
const DOG_A = 'b4111111-1111-4111-8111-111111111111';
const DOG_EMPTY = 'b4333333-3333-4333-8333-333333333333';
const TAG_A = 'd4111111-1111-4111-8111-111111111111';
const INGEST_OLD = 'e4111111-1111-4111-8111-111111111111';
const INGEST_NEW = 'e4222222-2222-4222-8222-222222222222';

let sql = null;
let persist = null;
let readLatest = null;
let readHistory = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, writeModule, readModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/activity-variability-feature-ingestion.js'),
    import('../dist/api/services/activity-variability-feature-read.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 1 });
  persist = writeModule.persistActivityVariabilityFeatureObservation;
  readLatest = readModule.readLatestActivityVariabilityObservation;
  readHistory = readModule.readActivityVariabilityObservationHistory;
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

function observation(ingestionId, observedAt, value, overrides = {}) {
  return {
    dogId: DOG_A,
    ingestionId,
    deviceId: TAG_A,
    observedAt: new Date(observedAt),
    source: 'TAG',
    featureKey: 'activity_variability',
    value,
    observationStatus: 'OBSERVED',
    nullReason: null,
    featureContractVersion: 'tag-activity-variability-cv30m-v1',
    windowSeconds: 1800,
    validSeconds: 1700,
    ...overrides,
  };
}

test('Owner-scoped feature reads preserve physical/null semantics and bounded history', {
  skip: !enabled,
}, async () => {
  await cleanup();

  await sql`
    INSERT INTO users (id, email, password_hash, name) VALUES
      (${OWNER_A}, 'activity-read-a@emopet.invalid', 'test-only', 'Owner A'),
      (${OWNER_B}, 'activity-read-b@emopet.invalid', 'test-only', 'Owner B')
  `;

  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class) VALUES
      (${DOG_A}, ${OWNER_A}, 'Read Dog', 'Test', '2020-01-01', 'female', 20.0, 'FC2'),
      (${DOG_EMPTY}, ${OWNER_A}, 'Empty Dog', 'Test', '2021-01-01', 'male', 19.0, 'FC2')
  `;

  await sql`
    INSERT INTO devices (id, dog_id, type, mac_address, firmware_version)
    VALUES (${TAG_A}, ${DOG_A}, 'TAG', '02:00:00:00:44:11', '6.1.0')
  `;

  const first = await persist(
    OWNER_A,
    observation(INGEST_OLD, '2026-09-27T08:00:00.000Z', 0.21),
  );
  assert.equal(first.ok, true, JSON.stringify(first));

  const second = await persist(
    OWNER_A,
    observation(INGEST_NEW, '2026-09-27T09:00:00.000Z', null, {
      observationStatus: 'NOT_OBSERVED',
      nullReason: 'INSUFFICIENT_COVERAGE',
      validSeconds: 400,
    }),
  );
  assert.equal(second.ok, true, JSON.stringify(second));

  const latest = await readLatest(OWNER_A, DOG_A);
  assert.equal(latest.ok, true, JSON.stringify(latest));
  assert.equal(latest.status, 'AVAILABLE');
  assert.equal(latest.observation.observationStatus, 'NOT_OBSERVED');
  assert.equal(latest.observation.value, null);
  assert.equal(latest.observation.nullReason, 'INSUFFICIENT_COVERAGE');
  assert.equal(latest.observation.interpretationAuthority, 'PHYSICAL_MOVEMENT_VARIABILITY_ONLY');
  assert.equal(latest.observation.affectiveInterpretationAuthorized, false);
  assert.equal(latest.observation.eliInvocationAuthorized, false);
  assert.equal(latest.observation.firmwareVersionAtIngest, '6.1.0');

  const history = await readHistory(
    OWNER_A,
    DOG_A,
    '6h',
    new Date('2026-09-27T10:00:00.000Z'),
  );
  assert.equal(history.ok, true, JSON.stringify(history));
  assert.equal(history.status, 'AVAILABLE');
  assert.equal(history.range, '6h');
  assert.deepEqual(
    history.observations.map((row) => row.observedAt),
    ['2026-09-27T09:00:00.000Z', '2026-09-27T08:00:00.000Z'],
  );
  assert.equal(history.observations[1].value, 0.21);

  const none = await readLatest(OWNER_A, DOG_EMPTY);
  assert.deepEqual(none, { ok: true, status: 'NONE_FOUND', observation: null });

  const wrongOwner = await readLatest(OWNER_B, DOG_A);
  assert.deepEqual(wrongOwner, { ok: false, error: 'DOG_NOT_FOUND' });

  const outOfWindow = await readHistory(
    OWNER_A,
    DOG_A,
    '1h',
    new Date('2026-09-27T12:00:00.000Z'),
  );
  assert.equal(outOfWindow.ok, true);
  assert.equal(outOfWindow.status, 'NONE_FOUND');
  assert.deepEqual(outOfWindow.observations, []);
});
