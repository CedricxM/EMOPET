import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.AUTH_RATE_LIMIT_DB_INTEGRATION === '1';

process.env.AUTH_RATE_LIMIT_HMAC_SECRET ??=
  'test-only-auth-rate-limit-hmac-secret-767-do-not-use-in-production';

let sql = null;
let checkSharedAuthRateLimit = null;
let hashAuthRateLimitBucketKey = null;
let purgeExpiredAuthRateLimitWindows = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, storeModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/security/auth-rate-limit-store.js'),
    import('../dist/db/index.js'),
  ]);

  sql = postgres(process.env.DATABASE_URL, { max: 4 });
  checkSharedAuthRateLimit = storeModule.checkSharedAuthRateLimit;
  hashAuthRateLimitBucketKey = storeModule.hashAuthRateLimitBucketKey;
  purgeExpiredAuthRateLimitWindows =
    storeModule.purgeExpiredAuthRateLimitWindows;
  closeDatabase = dbModule.closeDatabase;
}

const OPTIONS = Object.freeze({ limit: 2, windowMs: 60_000 });
const RAW_KEY = 'auth:203.0.113.77';

async function cleanup() {
  if (!sql) return;
  await sql`DELETE FROM auth_rate_limit_windows`;
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('concurrent callers share one PostgreSQL auth budget', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const results = await Promise.all([
    checkSharedAuthRateLimit(RAW_KEY, OPTIONS),
    checkSharedAuthRateLimit(RAW_KEY, OPTIONS),
    checkSharedAuthRateLimit(RAW_KEY, OPTIONS),
    checkSharedAuthRateLimit(RAW_KEY, OPTIONS),
  ]);

  assert.equal(results.filter((r) => r.status === 'ALLOWED').length, 2);
  assert.equal(results.filter((r) => r.status === 'RATE_LIMITED').length, 2);

  const [row] = await sql`
    SELECT count
    FROM auth_rate_limit_windows
    WHERE bucket_hash = ${hashAuthRateLimitBucketKey(RAW_KEY)}
  `;

  // Count saturates at limit+1 rather than growing with blocked traffic.
  assert.equal(row.count, 3);
});

test('stored bucket is HMAC pseudonymous and never contains raw client identity', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const result = await checkSharedAuthRateLimit(RAW_KEY, OPTIONS);
  assert.equal(result.status, 'ALLOWED');

  const [row] = await sql`
    SELECT bucket_hash, count, window_started_at, reset_at, updated_at
    FROM auth_rate_limit_windows
  `;

  assert.match(row.bucket_hash, /^[0-9a-f]{64}$/);
  assert.equal(row.bucket_hash, hashAuthRateLimitBucketKey(RAW_KEY));
  assert.equal(JSON.stringify(row).includes('203.0.113.77'), false);
  assert.equal(JSON.stringify(row).includes(RAW_KEY), false);

  const columns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'auth_rate_limit_windows'
    ORDER BY ordinal_position
  `;

  const names = columns.map((column) => column.column_name);
  assert.deepEqual(names, [
    'bucket_hash',
    'count',
    'window_started_at',
    'reset_at',
    'updated_at',
  ]);
  assert.equal(names.some((name) => /ip|email|token|header/i.test(name)), false);
});

test('expired window resets to a fresh shared budget', {
  skip: !enabled,
}, async () => {
  await cleanup();

  assert.equal(
    (await checkSharedAuthRateLimit(RAW_KEY, OPTIONS)).status,
    'ALLOWED',
  );

  const hash = hashAuthRateLimitBucketKey(RAW_KEY);
  await sql`
    UPDATE auth_rate_limit_windows
    SET
      window_started_at = CURRENT_TIMESTAMP - INTERVAL '3 minutes',
      updated_at = CURRENT_TIMESTAMP - INTERVAL '2 minutes',
      reset_at = CURRENT_TIMESTAMP - INTERVAL '1 minute'
    WHERE bucket_hash = ${hash}
  `;

  const result = await checkSharedAuthRateLimit(RAW_KEY, OPTIONS);
  assert.equal(result.status, 'ALLOWED');
  if (result.status !== 'ALLOWED') return;
  assert.equal(result.remaining, 1);

  const [row] = await sql`
    SELECT count, reset_at > CURRENT_TIMESTAMP AS future_reset
    FROM auth_rate_limit_windows
    WHERE bucket_hash = ${hash}
  `;
  assert.equal(row.count, 1);
  assert.equal(row.future_reset, true);
});

test('explicit cleanup removes expired pseudonymous buckets', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const hash = hashAuthRateLimitBucketKey('auth:198.51.100.44');
  await sql`
    INSERT INTO auth_rate_limit_windows (
      bucket_hash,
      count,
      window_started_at,
      updated_at,
      reset_at
    ) VALUES (
      ${hash},
      1,
      CURRENT_TIMESTAMP - INTERVAL '3 minutes',
      CURRENT_TIMESTAMP - INTERVAL '2 minutes',
      CURRENT_TIMESTAMP - INTERVAL '1 minute'
    )
  `;

  assert.equal(await purgeExpiredAuthRateLimitWindows(), true);

  const [row] = await sql`
    SELECT count(*)::int AS count
    FROM auth_rate_limit_windows
    WHERE bucket_hash = ${hash}
  `;
  assert.equal(row.count, 0);
});

test('store outage fails closed instead of falling back to process-local allowance', {
  skip: !enabled,
}, async () => {
  await cleanup();

  await sql`
    ALTER TABLE auth_rate_limit_windows
    RENAME TO auth_rate_limit_windows_unavailable_test
  `;

  try {
    const result = await checkSharedAuthRateLimit(RAW_KEY, OPTIONS);
    assert.deepEqual(result, {
      status: 'STORE_UNAVAILABLE',
      retryable: true,
    });
  } finally {
    await sql`
      ALTER TABLE auth_rate_limit_windows_unavailable_test
      RENAME TO auth_rate_limit_windows
    `;
  }
});
