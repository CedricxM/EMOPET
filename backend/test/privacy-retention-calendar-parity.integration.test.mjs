import test, { after } from 'node:test';
import assert from 'node:assert/strict';

import { computeRetentionExpiry } from '../dist/api/services/retention-dry-run.js';

const enabled = process.env.RETENTION_CALENDAR_PARITY_DB_INTEGRATION === '1';
const USER_ID = 'a2000000-0000-4000-8000-000000000901';
const DOG_ID = 'b2000000-0000-4000-8000-000000000901';
const DEVICE_ID = 'd2000000-0000-4000-8000-000000000901';
const CONTENT_ID = 'a2000000-0000-4000-8000-000000000902';
const COMMUNITY_ID = 'a2000000-0000-4000-8000-000000000903';
const UNCLOCKED_ID = 'a2000000-0000-4000-8000-000000000904';
const starts = [
  '2024-02-27T23:59:59.999Z',
  '2024-02-28T12:00:00.001Z',
  '2024-02-29T10:00:00.000Z',
  '2024-02-29T12:00:00.000Z',
  '2024-02-29T12:00:00.001Z',
  '2024-02-29T23:59:59.999Z',
  '2024-03-01T00:00:00.000Z',
  '2024-03-30T23:30:00.000Z',
];
const id = (prefix, index) => `${prefix}000000-0000-4000-8000-${String(920 + index).padStart(12, '0')}`;

let sql = null;
let inspectDetailedSensorEliRetention = null;
let inspectModerationRetention = null;
let closeDatabase = null;

if (enabled) {
  // Both real connections use a non-UTC session timezone. Month arithmetic
  // must still use UTC, including when the anniversary crosses a DST change.
  const databaseUrl = new URL(process.env.DATABASE_URL);
  databaseUrl.searchParams.set('TimeZone', 'Europe/Paris');
  process.env.DATABASE_URL = databaseUrl.toString();
  const [postgres, detailed, moderation, database] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/detailed-sensor-eli-retention-readiness.js'),
    import('../dist/api/services/moderation-retention-readiness.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres.default(process.env.DATABASE_URL, { max: 1 });
  inspectDetailedSensorEliRetention = detailed.inspectDetailedSensorEliRetention;
  inspectModerationRetention = moderation.inspectModerationRetention;
  closeDatabase = database.closeDatabase;
}

async function cleanup() {
  if (!sql) return;
  await sql`DELETE FROM community_reports WHERE community_id = ${COMMUNITY_ID}`;
  await sql`DELETE FROM sensor_summaries WHERE dog_id = ${DOG_ID}`;
  await sql`DELETE FROM eli_states WHERE dog_id = ${DOG_ID}`;
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

test('PostgreSQL calendar retention matches UTC planner expiry across leap days and DST', {
  skip: !enabled,
}, async () => {
  await cleanup();
  const [session] = await sql`SELECT current_setting('TimeZone') AS timezone`;
  assert.equal(session.timezone, 'Europe/Paris');
  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (${USER_ID}, 'calendar-parity-901@emopet.invalid', 'test-only', 'Calendar Parity')
  `;
  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES (${DOG_ID}, ${USER_ID}, 'Calendar Dog', 'Test', '2020-01-01', 'female', 20.0, 'FC2')
  `;
  await sql`
    INSERT INTO devices (id, dog_id, type, mac_address)
    VALUES (${DEVICE_ID}, ${DOG_ID}, 'TAG', '02:00:00:00:09:01')
  `;

  for (const [index, start] of starts.entries()) {
    await sql`
      INSERT INTO sensor_summaries (id, dog_id, ingestion_id, device_id, timestamp, source)
      VALUES (${id('c2', index)}, ${DOG_ID}, ${id('e2', index)}, ${DEVICE_ID}, ${start}::timestamptz, 'TAG')
    `;
    await sql`
      INSERT INTO eli_states (id, dog_id, timestamp, arousal, valence, load, confidence, gate_status, sensor_reliability)
      VALUES (${id('f2', index)}, ${DOG_ID}, ${start}::timestamptz, 0.2, 0.3, 0.1, 0.9, 'PUBLISH', '{}'::jsonb)
    `;
    await sql`
      INSERT INTO community_reports (id, content_type, content_id, community_id, reason, status, final_action_at)
      VALUES (${id('a3', index)}, 'post', ${CONTENT_ID}, ${COMMUNITY_ID}, 'spam', 'closed', ${start}::timestamptz)
    `;
  }
  await sql`
    INSERT INTO community_reports (id, content_type, content_id, community_id, reason, status)
    VALUES (${UNCLOCKED_ID}, 'post', ${CONTENT_ID}, ${COMMUNITY_ID}, 'spam', 'open')
  `;

  const snapshot = async () => JSON.stringify(await Promise.all([
    sql`SELECT id, timestamp FROM sensor_summaries WHERE dog_id = ${DOG_ID} ORDER BY id`,
    sql`SELECT id, timestamp FROM eli_states WHERE dog_id = ${DOG_ID} ORDER BY id`,
    sql`SELECT id, status, final_action_at FROM community_reports WHERE community_id = ${COMMUNITY_ID} ORDER BY id`,
  ]));
  const before = await snapshot();

  for (const [year, months, inspect] of [
    [2025, 12, inspectModerationRetention],
    [2027, 36, inspectDetailedSensorEliRetention],
  ]) {
    for (const suffix of [
      '02-28T09:59:59.999Z', '02-28T10:00:00.000Z', '02-28T12:00:00.000Z',
      '02-28T12:00:00.001Z', '02-28T23:59:59.999Z', '03-01T00:00:00.000Z',
      '03-30T23:00:00.000Z', '03-30T23:30:00.000Z',
    ]) {
      const evaluationAt = `${year}-${suffix}`;
      const expected = starts.filter((start) => computeRetentionExpiry(start, months, 'MONTHS') <= evaluationAt).length;
      const result = await inspect(evaluationAt);
      assert.equal(result.ok, true, JSON.stringify(result));
      assert.equal(result.expiryBasis, 'ROW_CLOCK_PLUS_UTC_CALENDAR_MONTHS');
      assert.equal(result.destructiveActionAuthorized, false);
      assert.equal(result.claimsPurgeExecuted, false);
      if (months === 12) {
        assert.equal(result.counts.beyondWindowTotal, expected, evaluationAt);
        assert.equal(result.counts.clockedTotal, starts.length);
        assert.equal(result.counts.unclockedTotal, 1);
        assert.equal(result.claimsHistoricalBackfillComplete, false);
      } else {
        assert.equal(result.counts.sensorBeyondWindow, expected, evaluationAt);
        assert.equal(result.counts.eliBeyondWindow, expected, evaluationAt);
        assert.equal(result.counts.sensorDetailedTotal, starts.length);
        assert.equal(result.counts.eliDetailedTotal, starts.length);
        assert.equal(result.claimsAggregationCompleted, false);
      }
      // Pin the observed bug independently of the shared planner oracle.
      if (suffix === '02-28T12:00:00.000Z') assert.equal(expected, 3);
      if (suffix === '03-30T23:00:00.000Z') assert.equal(expected, 7);
    }
  }

  assert.equal(await snapshot(), before, 'readiness must not mutate clocks or rows');
});
