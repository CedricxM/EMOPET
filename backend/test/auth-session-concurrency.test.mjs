import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import postgres from 'postgres';

const enabled = process.env.AUTH_DB_INTEGRATION === '1' || process.env.EMOPET_DB_INTEGRATION_TEST === '1';

async function waitForBlockedOperations(tx, blockerPid, expected) {
  const deadline = Date.now() + 4_000;
  let count = 0;
  while (Date.now() < deadline) {
    await tx`SELECT pg_stat_clear_snapshot()`;
    const [row] = await tx`
      WITH RECURSIVE blocked AS (
        SELECT pid FROM pg_stat_activity WHERE ${blockerPid} = ANY(pg_blocking_pids(pid))
        UNION
        SELECT activity.pid FROM pg_stat_activity activity
        JOIN blocked ON blocked.pid = ANY(pg_blocking_pids(activity.pid))
      ) SELECT count(*)::int AS count FROM blocked
    `;
    count = row.count;
    if (count >= expected) return;
    await delay(10);
  }
  assert.fail(`Expected ${expected} blocked session operations, observed ${count}`);
}

test('AUTH-01 serializes refresh issuance with durable logout and credential changes', {
  skip: !enabled, timeout: 30_000,
}, async (t) => {
  const [{ auth }, { issueRefreshCredential }, { hashPassword }, { signAccessToken }, { closeDatabase }] = await Promise.all([
    import('../dist/api/routes/auth.js'),
    import('../dist/api/services/auth-sessions.js'),
    import('../dist/api/services/auth-security.js'),
    import('../dist/api/middleware/auth.js'),
    import('../dist/db/index.js'),
  ]);
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const email = `auth-race-${userId}@example.test`;
  const password = `fixture-password-${randomUUID()}`;
  const passwordHash = await hashPassword(password);
  const requests = [];

  t.after(async () => {
    await Promise.allSettled(requests);
    try {
      await sql`DELETE FROM auth_refresh_sessions WHERE user_id IN (${userId}, ${otherUserId})`;
      await sql`DELETE FROM users WHERE id IN (${userId}, ${otherUserId})`;
    } finally {
      await sql.end({ timeout: 5 });
      await closeDatabase();
    }
  });

  await sql`INSERT INTO users (id, email, password_hash, name) VALUES
    (${userId}, ${email}, ${passwordHash}, 'Auth race fixture'),
    (${otherUserId}, ${`auth-race-${otherUserId}@example.test`}, ${passwordHash}, 'Other account fixture')`;

  const post = (path, body, accessToken) => {
    const request = auth.request(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    });
    requests.push(request);
    return request;
  };
  async function seedSession(owner = userId) {
    const credential = issueRefreshCredential(owner);
    const s = credential.session;
    await sql`INSERT INTO auth_refresh_sessions (user_id, family_id, token_hash, expires_at)
      VALUES (${s.userId}, ${s.familyId}, ${s.tokenHash}, ${s.expiresAt})`;
    return credential;
  }
  async function activeCount(owner, familyId = null) {
    const [row] = await sql`SELECT count(*)::int AS count FROM auth_refresh_sessions
      WHERE user_id = ${owner} AND revoked_at IS NULL
        AND (${familyId}::uuid IS NULL OR family_id = ${familyId}::uuid)`;
    return row.count;
  }
  const otherSession = await seedSession(otherUserId);

  for (const endpoint of ['/logout', '/logout-all']) {
    await t.test(`${endpoint} cannot miss a successor inserted by an in-flight refresh`, async () => {
      const initial = await seedSession();
      const independent = await seedSession();
      const accessToken = endpoint === '/logout-all' ? await signAccessToken(userId) : undefined;
      let refresh;
      let logout;
      await sql.begin(async (tx) => {
        const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
        // Pause refresh at consumption, after its initial reads. A competing
        // UPDATE without the common account lock takes a stale statement snapshot
        // and can miss the successor inserted before the refresh commits.
        await tx`SELECT id FROM auth_refresh_sessions WHERE token_hash = ${initial.session.tokenHash} FOR UPDATE`;
        refresh = post('/refresh', { refreshToken: initial.rawToken });
        await waitForBlockedOperations(tx, pid, 1);
        logout = post(endpoint, { refreshToken: initial.rawToken }, accessToken);
        await waitForBlockedOperations(tx, pid, 2);
      });

      const refreshResponse = await refresh;
      assert.equal(refreshResponse.status, 200);
      const successor = await refreshResponse.json();
      const logoutResponse = await logout;
      assert.equal(logoutResponse.status, 204);
      assert.equal(logoutResponse.headers.get('cache-control'), 'no-store');
      assert.equal(await activeCount(userId, initial.session.familyId), 0);
      assert.equal((await post('/refresh', { refreshToken: successor.refreshToken })).status, 401);
      assert.equal(await activeCount(userId, independent.session.familyId), endpoint === '/logout' ? 1 : 0);
      assert.equal(await activeCount(otherUserId, otherSession.session.familyId), 1);

      const beforeRetry = await sql`SELECT id, revoked_at, revoke_reason, last_used_at
        FROM auth_refresh_sessions WHERE family_id = ${initial.session.familyId} ORDER BY id`;
      assert.equal((await post(endpoint, { refreshToken: initial.rawToken }, accessToken)).status, 204);
      const afterRetry = await sql`SELECT id, revoked_at, revoke_reason, last_used_at
        FROM auth_refresh_sessions WHERE family_id = ${initial.session.familyId} ORDER BY id`;
      assert.deepEqual(afterRetry, beforeRetry, 'logout retries preserve the original revocation evidence');
    });
  }

  await t.test('expiry is checked against the clock after waiting for session authority', async () => {
    const initial = await seedSession();
    let refresh;
    await sql.begin(async (tx) => {
      const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
      await tx`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${initial.session.familyId}, 0))`;
      refresh = post('/refresh', { refreshToken: initial.rawToken });
      await waitForBlockedOperations(tx, pid, 1);
      // The expiry boundary is after request start but before lock release.
      await tx`UPDATE auth_refresh_sessions SET expires_at = clock_timestamp()
        WHERE token_hash = ${initial.session.tokenHash}`;
    });
    assert.equal((await refresh).status, 401);
    const rows = await sql`SELECT revoke_reason FROM auth_refresh_sessions WHERE family_id = ${initial.session.familyId}`;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].revoke_reason, 'expired');
  });

  await t.test('login cannot issue from a password changed after its verification read', async () => {
    const changedHash = await hashPassword(`changed-${randomUUID()}`);
    const before = await activeCount(userId);
    let login;
    await sql.begin(async (tx) => {
      const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
      await tx`UPDATE users SET password_hash = ${changedHash} WHERE id = ${userId}`;
      login = post('/login', { email, password });
      await waitForBlockedOperations(tx, pid, 1);
    });
    const response = await login;
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Invalid credentials' });
    assert.equal(await activeCount(userId), before);
  });
});
