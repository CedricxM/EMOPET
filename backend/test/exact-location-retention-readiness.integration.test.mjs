import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.EXACT_LOCATION_RETENTION_DB_INTEGRATION === '1';

const USER_ID = 'a0000000-0000-4000-8000-000000000620';
const DOG_A = 'b0000000-0000-4000-8000-000000000620';
const DOG_B = 'b0000000-0000-4000-8000-000000000621';
const EVENT_FRESH = 'c0000000-0000-4000-8000-000000000620';
const EVENT_OLD_COMPLETE = 'c0000000-0000-4000-8000-000000000621';
const EVENT_OLD_PARTIAL = 'c0000000-0000-4000-8000-000000000622';
const EVENT_OLD_NO_COORDS = 'c0000000-0000-4000-8000-000000000623';

let sql = null;
let inspectExactLocationRetention = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, readinessModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/exact-location-retention-readiness.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 1 });
  inspectExactLocationRetention = readinessModule.inspectExactLocationRetention;
  closeDatabase = dbModule.closeDatabase;
}

async function cleanup() {
  if (!sql) return;
  await sql`
    DELETE FROM copresence_events
    WHERE id IN (
      ${EVENT_FRESH},
      ${EVENT_OLD_COMPLETE},
      ${EVENT_OLD_PARTIAL},
      ${EVENT_OLD_NO_COORDS}
    )
  `;
  await sql`DELETE FROM dogs WHERE id IN (${DOG_A}, ${DOG_B})`;
  await sql`DELETE FROM users WHERE id = ${USER_ID}`;
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('exact-location readiness counts only coordinate-bearing copresence rows beyond the 24-hour maximum', {
  skip: !enabled,
}, async () => {
  await cleanup();

  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (
      ${USER_ID},
      'exact-location-retention-620@emopet.invalid',
      'test-only',
      'Exact Location Retention'
    )
  `;

  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES
      (${DOG_A}, ${USER_ID}, 'Location A', 'Test', '2020-01-01', 'female', 20.0, 'FC2'),
      (${DOG_B}, ${USER_ID}, 'Location B', 'Test', '2021-01-01', 'male', 21.0, 'FC2')
  `;

  await sql`
    INSERT INTO copresence_events (
      id, dog_a_id, dog_b_id, latitude, longitude, occurred_at
    ) VALUES
      (
        ${EVENT_FRESH}, ${DOG_A}, ${DOG_B},
        48.8566, 2.3522, '2026-09-21T11:00:00.000Z'
      ),
      (
        ${EVENT_OLD_COMPLETE}, ${DOG_A}, ${DOG_B},
        47.2184, -1.5536, '2026-09-20T11:00:00.000Z'
      ),
      (
        ${EVENT_OLD_PARTIAL}, ${DOG_A}, ${DOG_B},
        47.7508, NULL, '2026-09-20T06:00:00.000Z'
      ),
      (
        ${EVENT_OLD_NO_COORDS}, ${DOG_A}, ${DOG_B},
        NULL, NULL, '2026-09-20T06:00:00.000Z'
      )
  `;

  const result = await inspectExactLocationRetention(
    '2026-09-21T12:00:00.000Z',
  );

  assert.equal(result.ok, true);
  assert.equal(result.cutoffAt, '2026-09-20T12:00:00.000Z');
  assert.equal(result.status, 'ROWS_BEYOND_MAX_WINDOW_PRESENT');
  assert.equal(result.destructiveActionAuthorized, false);
  assert.equal(result.claimsPurgeExecuted, false);
  assert.equal(result.claimsSessionEndCompliance, false);
  assert.deepEqual(result.counts, {
    coordinateBearingTotal: 3,
    completeCoordinatePairs: 2,
    partialCoordinateRows: 1,
    beyondMaxWindowTotal: 2,
    beyondMaxWindowCompletePairs: 1,
    beyondMaxWindowPartialRows: 1,
  });

  const rows = await sql`
    SELECT id, latitude, longitude, occurred_at
    FROM copresence_events
    WHERE id IN (
      ${EVENT_FRESH},
      ${EVENT_OLD_COMPLETE},
      ${EVENT_OLD_PARTIAL},
      ${EVENT_OLD_NO_COORDS}
    )
    ORDER BY id
  `;
  assert.equal(rows.length, 4, 'readiness must not mutate or delete location rows');
});
