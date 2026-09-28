import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.ACTIVITY_FEATURE_TRANSPORT_ADAPTER_DB_INTEGRATION === '1';

const OWNER = 'a5111111-1111-4111-8111-111111111111';
const DOG = 'b5111111-1111-4111-8111-111111111111';
const TAG = 'd5111111-1111-4111-8111-111111111111';

let sql = null;
let ingest = null;
let readLatest = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, adapter, readModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/activity-variability-transport-adapter.js'),
    import('../dist/api/services/activity-variability-feature-read.js'),
    import('../dist/db/index.js'),
  ]);

  sql = postgres(process.env.DATABASE_URL, { max: 1 });
  ingest = adapter.ingestActivityVariabilityTransportFrame;
  readLatest = readModule.readLatestActivityVariabilityObservation;
  closeDatabase = dbModule.closeDatabase;
}

async function cleanup() {
  if (!sql) return;
  await sql`DELETE FROM sensor_feature_observations WHERE dog_id = ${DOG}`;
  await sql`DELETE FROM devices WHERE id = ${TAG}`;
  await sql`DELETE FROM dogs WHERE id = ${DOG}`;
  await sql`DELETE FROM users WHERE id = ${OWNER}`;
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

function frame(overrides = {}) {
  return {
    transportVersion: 1,
    source: 'TAG',
    featureKey: 'activity_variability',
    featureContractVersion: 'tag-activity-variability-cv30m-v1',
    sequence: 42,
    bootSessionId: 0x55667788,
    windowEndMs: 3_600_000,
    windowSeconds: 1800,
    validSeconds: 1700,
    observationStatus: 'OBSERVED',
    nullReason: null,
    qualityState: 'DEGRADED',
    value: 0.37,
    ...overrides,
  };
}

function anchor(overrides = {}) {
  return {
    deviceId: TAG,
    bootSessionId: 0x55667788,
    anchorDeviceMs: 3_700_000,
    anchorUtc: new Date('2026-09-27T11:01:40.000Z'),
    uncertaintyMs: 275,
    ...overrides,
  };
}

test('validated transport frame maps to durable physical feature provenance without ELI activation', {
  skip: !enabled,
}, async () => {
  await cleanup();

  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (${OWNER}, 'transport-adapter@emopet.invalid', 'test-only', 'Owner')
  `;

  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES (${DOG}, ${OWNER}, 'Adapter Dog', 'Test', '2020-01-01', 'female', 20.0, 'FC2')
  `;

  await sql`
    INSERT INTO devices (id, dog_id, type, mac_address, firmware_version)
    VALUES (${TAG}, ${DOG}, 'TAG', '02:00:00:00:55:11', '6.2.0')
  `;

  const created = await ingest({
    ownerId: OWNER,
    dogId: DOG,
    deviceId: TAG,
    frame: frame(),
    clockAnchor: anchor(),
    maxLookbackMs: 600_000,
  });

  assert.equal(created.ok, true, JSON.stringify(created));
  assert.equal(created.status, 'CREATED');
  assert.equal(created.observation.observedAt.toISOString(), '2026-09-27T11:00:00.000Z');
  assert.equal(created.observation.qualityState, 'DEGRADED');
  assert.equal(created.observation.transportBootSessionId, 0x55667788);
  assert.equal(created.observation.transportSequence, 42);
  assert.equal(created.observation.transportWindowEndMs, 3_600_000);
  assert.equal(created.observation.eventTimeResolution, 'BOOT_ANCHOR_V1');
  assert.equal(created.observation.eventTimeUncertaintyMs, 275);

  const replay = await ingest({
    ownerId: OWNER,
    dogId: DOG,
    deviceId: TAG,
    frame: frame(),
    clockAnchor: anchor(),
    maxLookbackMs: 600_000,
  });

  assert.equal(replay.ok, true);
  assert.equal(replay.status, 'IDEMPOTENT_REPLAY');
  assert.equal(replay.observation.id, created.observation.id);
  assert.equal(replay.observation.ingestionId, created.observation.ingestionId);

  const latest = await readLatest(OWNER, DOG);
  assert.equal(latest.ok, true, JSON.stringify(latest));
  assert.equal(latest.status, 'AVAILABLE');
  assert.equal(latest.observation.qualityState, 'DEGRADED');
  assert.equal(latest.observation.eventTimeUncertaintyMs, 275);
  assert.equal(latest.observation.affectiveInterpretationAuthorized, false);
  assert.equal(latest.observation.eliInvocationAuthorized, false);

  const badBoot = await ingest({
    ownerId: OWNER,
    dogId: DOG,
    deviceId: TAG,
    frame: frame({ sequence: 43 }),
    clockAnchor: anchor({ bootSessionId: 0x55667789 }),
    maxLookbackMs: 600_000,
  });
  assert.deepEqual(
    badBoot,
    { ok: false, error: 'EVENT_TIME_UNRESOLVED', reason: 'BOOT_SESSION_MISMATCH' },
  );

  const invalidQuality = await ingest({
    ownerId: OWNER,
    dogId: DOG,
    deviceId: TAG,
    frame: frame({ sequence: 44, qualityState: 'SUPPRESSED' }),
    clockAnchor: anchor(),
    maxLookbackMs: 600_000,
  });
  assert.equal(invalidQuality.ok, false);
  assert.equal(invalidQuality.error, 'INVALID_TRANSPORT_FRAME');

  const [count] = await sql`
    SELECT count(*)::int AS count
    FROM sensor_feature_observations
    WHERE dog_id = ${DOG}
  `;
  assert.equal(Number(count.count), 1);
});
