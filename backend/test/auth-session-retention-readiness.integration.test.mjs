import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.AUTH_RETENTION_DB_INTEGRATION === '1';

let sql = null;
let closeDatabase = null;
let inspectExpiredRefreshSessionRetention = null;

if (enabled) {
  const [
    { default: postgres },
    { closeDatabase: closeSharedDatabase },
    { inspectExpiredRefreshSessionRetention: inspect },
  ] = await Promise.all([
    import('postgres'),
    import('../dist/db/index.js'),
    import('../dist/api/services/auth-session-retention-readiness.js'),
  ]);

  sql = postgres(process.env.DATABASE_URL, { max: 1 });
  closeDatabase = closeSharedDatabase;
  inspectExpiredRefreshSessionRetention = inspect;
}

after(async () => {
  if (sql) await sql.end({ timeout: 5 });
  if (closeDatabase) await closeDatabase();
});

test('read-only readiness counts expired refresh rows on PostgreSQL without exposing identifiers', {
  skip: !enabled,
}, async () => {
  const userId = 'a0000000-0000-4000-8000-000000000451';
  const email = 'retention-readiness-451@emopet.invalid';
  const familyA = 'b0000000-0000-4000-8000-000000000451';
  const familyB = 'b0000000-0000-4000-8000-000000000452';
  const familyC = 'b0000000-0000-4000-8000-000000000453';
  const familyD = 'b0000000-0000-4000-8000-000000000454';
  const hashes = [
    'a'.repeat(64),
    'b'.repeat(64),
    'c'.repeat(64),
    'd'.repeat(64),
  ];

  await sql`DELETE FROM auth_refresh_sessions WHERE token_hash IN (${hashes[0]}, ${hashes[1]}, ${hashes[2]}, ${hashes[3]})`;
  await sql`DELETE FROM users WHERE id = ${userId}`;
  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (${userId}, ${email}, 'not-a-real-password-hash', 'Retention Readiness')
  `;

  await sql`
    INSERT INTO auth_refresh_sessions
      (user_id, family_id, token_hash, expires_at, revoked_at, revoke_reason)
    VALUES
      (${userId}, ${familyA}, ${hashes[0]}, '2026-09-20T10:00:00Z', '2026-09-19T10:00:00Z', 'logout'),
      (${userId}, ${familyB}, ${hashes[1]}, '2026-09-21T09:59:59Z', NULL, NULL),
      (NULL, ${familyC}, ${hashes[2]}, '2026-09-01T10:00:00Z', '2026-09-01T09:00:00Z', 'logout_all'),
      (${userId}, ${familyD}, ${hashes[3]}, '2026-09-22T10:00:00Z', NULL, NULL)
  `;

  try {
    const result = await inspectExpiredRefreshSessionRetention(
      '2026-09-21T10:00:00.000Z',
    );

    assert.deepEqual(result, {
      ok: true,
      mode: 'READ_ONLY_RETENTION_READINESS',
      destructiveActionAuthorized: false,
      claimsPurgeExecuted: false,
      categoryId: 'auth_refresh_sessions',
      evaluationAt: '2026-09-21T10:00:00.000Z',
      status: 'EXPIRED_ROWS_PRESENT',
      counts: {
        expiredTotal: 3,
        detachedExpired: 1,
        linkedExpired: 2,
        revokedExpired: 2,
        unrevokedExpired: 1,
      },
      policyBoundary: 'DELETE_ONLY_AFTER_ORIGINAL_EXPIRY',
    });

    assert.equal('tokenHash' in result, false);
    assert.equal('userId' in result, false);
    assert.equal('sessionIds' in result, false);

    const persisted = await sql`
      SELECT token_hash, user_id, expires_at, revoked_at
      FROM auth_refresh_sessions
      WHERE token_hash IN (${hashes[0]}, ${hashes[1]}, ${hashes[2]}, ${hashes[3]})
      ORDER BY token_hash
    `;
    assert.equal(persisted.length, 4, 'readiness probe must not mutate candidate rows');
  } finally {
    await sql`DELETE FROM auth_refresh_sessions WHERE token_hash IN (${hashes[0]}, ${hashes[1]}, ${hashes[2]}, ${hashes[3]})`;
    await sql`DELETE FROM users WHERE id = ${userId}`;
  }
});
