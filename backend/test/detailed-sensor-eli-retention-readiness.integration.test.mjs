import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.DETAILED_SENSOR_ELI_RETENTION_DB_INTEGRATION === '1';

const USER_ID = 'a0000000-0000-4000-8000-000000000640';
const DOG_ID = 'b0000000-0000-4000-8000-000000000640';
const DEVICE_ID = 'd0000000-0000-4000-8000-000000000640';
const SENSOR_FRESH = 'c0000000-0000-4000-8000-000000000640';
const SENSOR_OLD = 'c0000000-0000-4000-8000-000000000641';
const INGEST_FRESH = 'e0000000-0000-4000-8000-000000000640';
const INGEST_OLD = 'e0000000-0000-4000-8000-000000000641';
const ELI_FRESH = 'f0000000-0000-4000-8000-000000000640';
const ELI_OLD = 'f0000000-0000-4000-8000-000000000641';

let sql = null;
let inspectDetailedSensorEliRetention = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, readinessModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/detailed-sensor-eli-retention-readiness.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 1 });
  inspectDetailedSensorEliRetention =
    readinessModule.inspectDetailedSensorEliRetention;
  closeDatabase = dbModule.closeDatabase;
}

async function cleanup() {
  if (!sql) return;
  await sql`DELETE FROM sensor_summaries WHERE id IN (${SENSOR_FRESH}, ${SENSOR_OLD})`;
  await sql`DELETE FROM eli_states WHERE id IN (${ELI_FRESH}, ${ELI_OLD})`;
  await sql`DELETE FROM devices WHERE id = ${DEVICE_ID}`;
  await sql`DELETE FROM dogs WHERE id = ${DOG_ID}`;
  await sql`DELETE FROM users WHERE id = ${USER_ID}`;
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('detailed sensor + ELI readiness counts only rows beyond the common 36-month window', {
  skip: !enabled,
}, async () => {
  await cleanup();

  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (
      ${USER_ID},
      'detailed-retention-640@emopet.invalid',
      'test-only',
      'Detailed Retention'
    )
  `;

  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES (
      ${DOG_ID}, ${USER_ID}, 'Retention Dog', 'Test',
      '2020-01-01', 'female', 20.0, 'FC2'
    )
  `;

  await sql`
    INSERT INTO devices (id, dog_id, type, mac_address)
    VALUES (${DEVICE_ID}, ${DOG_ID}, 'TAG', '02:00:00:00:06:40')
  `;

  await sql`
    INSERT INTO sensor_summaries (
      id, dog_id, ingestion_id, device_id, timestamp, source
    ) VALUES
      (
        ${SENSOR_FRESH}, ${DOG_ID}, ${INGEST_FRESH}, ${DEVICE_ID},
        '2026-09-20T12:00:00.000Z', 'TAG'
      ),
      (
        ${SENSOR_OLD}, ${DOG_ID}, ${INGEST_OLD}, ${DEVICE_ID},
        '2023-09-20T12:00:00.000Z', 'TAG'
      )
  `;

  await sql`
    INSERT INTO eli_states (
      id, dog_id, timestamp, arousal, valence, load,
      confidence, gate_status, sensor_reliability
    ) VALUES
      (
        ${ELI_FRESH}, ${DOG_ID}, '2026-09-20T12:00:00.000Z',
        0.2, 0.3, 0.1, 0.9, 'PUBLISH', '{}'::jsonb
      ),
      (
        ${ELI_OLD}, ${DOG_ID}, '2023-09-20T12:00:00.000Z',
        0.4, 0.1, 0.2, 0.8, 'PUBLISH', '{}'::jsonb
      )
  `;

  const result = await inspectDetailedSensorEliRetention(
    '2026-09-21T12:00:00.000Z',
  );

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.cutoffAt, '2023-09-21T12:00:00.000Z');
  assert.equal(result.status, 'DETAILED_ROWS_BEYOND_36_MONTHS_PRESENT');
  assert.equal(result.destructiveActionAuthorized, false);
  assert.equal(result.claimsPurgeExecuted, false);
  assert.equal(result.claimsAggregationCompleted, false);
  assert.deepEqual(result.counts, {
    sensorDetailedTotal: 2,
    sensorBeyondWindow: 1,
    eliDetailedTotal: 2,
    eliBeyondWindow: 1,
  });

  const [sensorRows, eliRows] = await Promise.all([
    sql`SELECT count(*)::int AS count FROM sensor_summaries
        WHERE id IN (${SENSOR_FRESH}, ${SENSOR_OLD})`,
    sql`SELECT count(*)::int AS count FROM eli_states
        WHERE id IN (${ELI_FRESH}, ${ELI_OLD})`,
  ]);
  assert.equal(Number(sensorRows[0].count), 2, 'readiness must not mutate sensor rows');
  assert.equal(Number(eliRows[0].count), 2, 'readiness must not mutate ELI rows');
});
