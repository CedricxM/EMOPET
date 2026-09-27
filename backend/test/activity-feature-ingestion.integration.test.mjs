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
let resolveBootRelativeEventTime = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, service, timeService, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/activity-variability-feature-ingestion.js'),
    import('../dist/api/services/device-boot-event-time.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 1 });
  persistActivityVariabilityFeatureObservation =
    service.persistActivityVariabilityFeatureObservation;
  resolveBootRelativeEventTime = timeService.resolveBootRelativeEventTime;
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

  const resolvedTime = resolveBootRelativeEventTime({
    deviceId: TAG_A,
    bootSessionId: 0x10203040,
    windowEndMs: 3_600_000,
    anchor: {
      deviceId: TAG_A,
      bootSessionId: 0x10203040,
      anchorDeviceMs: 3_700_000,
      anchorUtc: new Date('2026-09-27T10:01:40.000Z'),
      uncertaintyMs: 250,
    },
    maxLookbackMs: 600_000,
  });
  assert.equal(resolvedTime.ok, true, JSON.stringify(resolvedTime));
  assert.equal(resolvedTime.observedAt.toISOString(), '2026-09-27T10:00:00.000Z');

  const transported = observed({
    ingestionId: undefined,
    observedAt: resolvedTime.observedAt,
    value: 0.51,
    transportProvenance: {
      transportVersion: 1,
      bootSessionId: 0x10203040,
      sequence: 65535,
      windowEndMs: 3_600_000,
    },
    eventTimeProvenance: resolvedTime.eventTimeProvenance,
  });

  const transportCreated = await persistActivityVariabilityFeatureObservation(
    OWNER_A,
    transported,
  );
  assert.equal(transportCreated.ok, true, JSON.stringify(transportCreated));
  assert.equal(transportCreated.status, 'CREATED');
  assert.match(
    transportCreated.observation.ingestionId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  assert.equal(transportCreated.observation.transportVersion, 1);
  assert.equal(transportCreated.observation.transportBootSessionId, 0x10203040);
  assert.equal(transportCreated.observation.transportSequence, 65535);
  assert.equal(transportCreated.observation.transportWindowEndMs, 3_600_000);
  assert.equal(transportCreated.observation.eventTimeResolution, 'BOOT_ANCHOR_V1');
  assert.equal(transportCreated.observation.clockAnchorDeviceMs, 3_700_000);
  assert.equal(
    transportCreated.observation.clockAnchorUtc.toISOString(),
    '2026-09-27T10:01:40.000Z',
  );
  assert.equal(transportCreated.observation.eventTimeUncertaintyMs, 250);

  const transportReplay = await persistActivityVariabilityFeatureObservation(
    OWNER_A,
    transported,
  );
  assert.equal(transportReplay.ok, true);
  assert.equal(transportReplay.status, 'IDEMPOTENT_REPLAY');
  assert.equal(transportReplay.observation.id, transportCreated.observation.id);
  assert.equal(
    transportReplay.observation.ingestionId,
    transportCreated.observation.ingestionId,
  );

  const transportPayloadConflict = await persistActivityVariabilityFeatureObservation(
    OWNER_A,
    { ...transported, value: 0.52 },
  );
  assert.deepEqual(
    transportPayloadConflict,
    { ok: false, error: 'INGESTION_CONFLICT' },
  );

  const explicitIdAgainstExistingTransport =
    await persistActivityVariabilityFeatureObservation(
      OWNER_A,
      {
        ...transported,
        ingestionId: 'e4444444-4444-4444-8444-444444444444',
      },
    );
  assert.deepEqual(
    explicitIdAgainstExistingTransport,
    { ok: false, error: 'INGESTION_CONFLICT' },
  );

  const newBootSameSequence = await persistActivityVariabilityFeatureObservation(
    OWNER_A,
    {
      ...transported,
      observedAt: new Date('2026-09-27T10:30:00.000Z'),
      transportProvenance: {
        transportVersion: 1,
        bootSessionId: 0x10203041,
        sequence: 65535,
        windowEndMs: 3_600_000,
      },
      eventTimeProvenance: undefined,
    },
  );
  assert.equal(newBootSameSequence.ok, true);
  assert.equal(newBootSameSequence.status, 'CREATED');

  const legacyIdentityVsTransportConflict =
    await persistActivityVariabilityFeatureObservation(
      OWNER_A,
      observed({
        transportProvenance: {
          transportVersion: 1,
          bootSessionId: 0x10203042,
          sequence: 1,
          windowEndMs: 1234,
        },
      }),
    );
  assert.deepEqual(
    legacyIdentityVsTransportConflict,
    { ok: false, error: 'INGESTION_CONFLICT' },
  );

  const rows = await sql`
    SELECT dog_id, device_id, feature_key, feature_contract_version,
           window_seconds, valid_seconds, firmware_version_at_ingest,
           transport_version, transport_boot_session_id, transport_sequence,
           transport_window_end_ms, event_time_resolution,
           clock_anchor_device_ms, clock_anchor_utc, event_time_uncertainty_ms
    FROM sensor_feature_observations
    WHERE dog_id = ${DOG_A}
    ORDER BY observed_at, ingestion_id
  `;
  assert.equal(rows.length, 4);
  for (const row of rows) {
    assert.equal(row.dog_id, DOG_A);
    assert.equal(row.device_id, TAG_A);
    assert.equal(row.feature_key, 'activity_variability');
    assert.equal(row.feature_contract_version, 'tag-activity-variability-cv30m-v1');
    assert.equal(row.window_seconds, 1800);
    assert.equal(row.firmware_version_at_ingest, '6.0.0');
  }
});
