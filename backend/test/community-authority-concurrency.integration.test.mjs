import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { Hono } from 'hono';
import postgres from 'postgres';

const enabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';
const applicationName = `community-qa-${randomUUID()}`;

async function waitForBlocked(tx, blockerPid, expected) {
  const deadline = Date.now() + 4_000;
  let observed = 0;
  while (Date.now() < deadline) {
    await tx`SELECT pg_stat_clear_snapshot()`;
    const [row] = await tx`
      WITH RECURSIVE blocked AS (
        SELECT pid FROM pg_stat_activity WHERE ${blockerPid} = ANY(pg_blocking_pids(pid))
        UNION
        SELECT activity.pid FROM pg_stat_activity activity
        JOIN blocked ON blocked.pid = ANY(pg_blocking_pids(activity.pid))
      ) SELECT count(*)::int AS count FROM blocked
        JOIN pg_stat_activity USING (pid) WHERE application_name = ${applicationName}
    `;
    observed = row.count;
    if (observed >= expected) return;
    await delay(10);
  }
  assert.fail(`Expected ${expected} blocked Community operations, saw ${observed}`);
}

test('Community authority survives concurrent membership, rules and parent changes', {
  skip: !enabled, timeout: 55_000,
}, async (t) => {
  // Each test file runs in its own process. Name every connection in this file
  // so another integration suite cannot accidentally satisfy a lock assertion.
  const previousAppName = process.env.PGAPPNAME;
  process.env.PGAPPNAME = applicationName;
  const [{ community, COMMUNITY_RULES_VERSION }, { authMiddleware, signAccessToken }, { closeDatabase }] = await Promise.all([
    import('../dist/api/routes/community.js'),
    import('../dist/api/middleware/auth.js'),
    import('../dist/db/index.js'),
  ]);
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const changesSql = postgres(process.env.DATABASE_URL, { max: 3 });
  if (previousAppName === undefined) delete process.env.PGAPPNAME;
  else process.env.PGAPPNAME = previousAppName;

  const memberId = randomUUID();
  const outsiderId = randomUUID();
  const communityId = randomUUID();
  const otherCommunityId = randomUUID();
  const membershipId = randomUUID();
  const parentId = randomUUID();
  const eventId = randomUUID();
  const requests = [];
  const changes = [];

  t.after(async () => {
    await Promise.allSettled([...requests, ...changes]);
    try {
      await sql`DELETE FROM comments WHERE author_id IN (${memberId}, ${outsiderId})`;
      await sql`DELETE FROM posts WHERE community_id IN (${communityId}, ${otherCommunityId})`;
      await sql`DELETE FROM community_events WHERE community_id IN (${communityId}, ${otherCommunityId})`;
      await sql`DELETE FROM community_members WHERE community_id IN (${communityId}, ${otherCommunityId})`;
      await sql`DELETE FROM community_rules_acceptances WHERE user_id IN (${memberId}, ${outsiderId})`;
      await sql`DELETE FROM communities WHERE id IN (${communityId}, ${otherCommunityId})`;
      await sql`DELETE FROM users WHERE id IN (${memberId}, ${outsiderId})`;
    } finally {
      await changesSql.end({ timeout: 5 });
      await sql.end({ timeout: 5 });
      await closeDatabase();
    }
  });

  for (const id of [memberId, outsiderId]) {
    await sql`INSERT INTO users (id, email, password_hash, name)
      VALUES (${id}, ${`community-concurrency-${id}@example.test`}, 'test-only', 'Community fixture')`;
  }
  for (const id of [communityId, otherCommunityId]) {
    await sql`INSERT INTO communities (id, name, type, created_by)
      VALUES (${id}, 'Private community fixture', 'activity', ${memberId})`;
  }
  await sql`INSERT INTO posts (id, community_id, author_id, type, content)
    VALUES (${parentId}, ${communityId}, ${memberId}, 'moment', 'Existing private post')`;
  await sql`INSERT INTO community_events (id, community_id, created_by, title, location, starts_at)
    VALUES (${eventId}, ${communityId}, ${memberId}, 'Private event', 'Test location', '2099-01-01')`;

  async function restoreMembership() {
    await sql`INSERT INTO community_members (id, community_id, user_id)
      VALUES (${membershipId}, ${communityId}, ${memberId})
      ON CONFLICT (id) DO UPDATE SET user_id = excluded.user_id, community_id = excluded.community_id`;
  }
  async function restoreRules() {
    await sql`INSERT INTO community_rules_acceptances (user_id, rules_version)
      VALUES (${memberId}, ${COMMUNITY_RULES_VERSION})
      ON CONFLICT (user_id) DO UPDATE SET rules_version = excluded.rules_version`;
  }
  await restoreMembership();
  await restoreRules();

  const app = new Hono();
  app.use('/api/*', authMiddleware);
  app.route('/api/community', community);
  const memberToken = await signAccessToken(memberId);
  const outsiderToken = await signAccessToken(outsiderId);
  function request(path, body, token = memberToken) {
    const pending = app.request(`/api/community${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    requests.push(pending);
    return pending;
  }
  function rulesGatedRequests() {
    return [
      request(`/${communityId}/feed`),
      request(`/${communityId}/events`),
      request('/posts', { communityId, type: 'moment', content: 'Must not persist', mediaUrls: [] }),
      request('/comments', { postId: parentId, content: 'Must not persist' }),
      request('/events', { communityId, title: 'Must not persist', location: 'Test', startsAt: '2099-01-01T10:00:00Z' }),
    ];
  }
  async function assertNoNewContent() {
    const [counts] = await sql`SELECT
      (SELECT count(*)::int FROM posts WHERE community_id IN (${communityId}, ${otherCommunityId})) AS posts,
      (SELECT count(*)::int FROM comments WHERE author_id = ${memberId}) AS comments,
      (SELECT count(*)::int FROM community_events WHERE community_id = ${communityId}) AS events`;
    assert.deepEqual(counts, { posts: 1, comments: 0, events: 1 });
  }

  await t.test('real JWT identity, member isolation and private validation responses', async () => {
    const feed = await request(`/${communityId}/feed`);
    assert.equal(feed.status, 200);
    assert.equal(feed.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual((await feed.json()).posts.map((post) => post.id), [parentId]);
    const denied = await request(`/${communityId}`, undefined, outsiderToken);
    const missing = await request(`/${randomUUID()}`, undefined, outsiderToken);
    assert.equal(denied.status, 404);
    assert.equal(missing.status, 404);
    assert.deepEqual(await denied.json(), await missing.json());
    // Creating a community in SQL is not a substitute for membership authority.
    assert.equal((await request(`/${otherCommunityId}`)).status, 404);
    assert.equal((await request('/posts', { malformed: true }, null)).status, 401);
    const invalid = await request('/posts', { malformed: true });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.headers.get('cache-control'), 'private, no-store');
  });

  for (const operation of ['deletion', 'reassignment']) {
    await t.test(`membership ${operation} already in flight wins all dependent reads and writes`, async () => {
      let pending;
      try {
        await sql.begin(async (tx) => {
          const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
          if (operation === 'deletion') await tx`DELETE FROM community_members WHERE id = ${membershipId}`;
          else await tx`UPDATE community_members SET user_id = ${outsiderId} WHERE id = ${membershipId}`;
          pending = [request(''), request(`/${communityId}`), ...rulesGatedRequests()];
          await waitForBlocked(tx, pid, pending.length);
        });
        const [list, ...denied] = await Promise.all(pending);
        assert.equal(list.status, 200);
        assert.deepEqual(await list.json(), { communities: [] });
        for (const response of denied) {
          assert.equal(response.status, 404);
          assert.equal(response.headers.get('cache-control'), 'private, no-store');
          assert.deepEqual(await response.json(), { error: 'Community not found' });
        }
        await assertNoNewContent();
      } finally {
        await Promise.allSettled(pending ?? []);
        await restoreMembership();
      }
    });
  }

  for (const operation of ['version change', 'deletion']) {
    await t.test(`rules ${operation} already in flight prevents feeds, events and writes`, async () => {
      let pending;
      try {
        await sql.begin(async (tx) => {
          const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
          if (operation === 'deletion') await tx`DELETE FROM community_rules_acceptances WHERE user_id = ${memberId}`;
          else await tx`UPDATE community_rules_acceptances SET rules_version = 'obsolete-fixture' WHERE user_id = ${memberId}`;
          pending = rulesGatedRequests();
          await waitForBlocked(tx, pid, pending.length);
          assert.equal((await request(`/${communityId}`)).status, 200, 'detail remains membership-only');
        });
        for (const response of await Promise.all(pending)) {
          assert.equal(response.status, 403);
          assert.deepEqual(await response.json(), {
            error: 'Community rules acceptance required.', code: 'COMMUNITY_RULES_REQUIRED',
            rulesVersion: COMMUNITY_RULES_VERSION,
          });
        }
        await assertNoNewContent();
        const acceptance = await request('/rules/accept', { accepted: true, rulesVersion: 'client-cannot-choose' });
        assert.equal(acceptance.status, 201);
        assert.equal((await acceptance.json()).acceptance.rulesVersion, COMMUNITY_RULES_VERSION);
        assert.equal((await request(`/${communityId}/feed`)).status, 200);
      } finally {
        await Promise.allSettled(pending ?? []);
        await restoreRules();
      }
    });
  }

  await t.test('a parent post move invalidates a comment after its initial scope lookup', async () => {
    let pending;
    try {
      await sql.begin(async (tx) => {
        const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
        await tx`UPDATE posts SET community_id = ${otherCommunityId} WHERE id = ${parentId}`;
        pending = request('/comments', { postId: parentId, content: 'Must not follow a moved parent' });
        await waitForBlocked(tx, pid, 1);
      });
      const response = await pending;
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { error: 'Post not found' });
      await assertNoNewContent();
    } finally {
      await Promise.allSettled([pending]);
      await sql`UPDATE posts SET community_id = ${communityId} WHERE id = ${parentId}`;
    }
  });

  await t.test('membership, rules and parent binding remain held until an authorized write commits', async () => {
    let pending;
    const pendingChanges = [];
    try {
      await sql.begin(async (tx) => {
        const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
        // Pause the actual INSERT, after its three authority locks are held.
        // SHARE permits the parent lookup but conflicts with INSERT's table lock.
        await tx`LOCK TABLE comments IN SHARE MODE`;
        pending = request('/comments', { postId: parentId, content: 'Authorized before withdrawal' });
        await waitForBlocked(tx, pid, 1);
        pendingChanges.push(
          Promise.resolve(changesSql`DELETE FROM community_members WHERE id = ${membershipId}`),
          Promise.resolve(changesSql`DELETE FROM community_rules_acceptances WHERE user_id = ${memberId}`),
          Promise.resolve(changesSql`UPDATE posts SET community_id = ${otherCommunityId} WHERE id = ${parentId}`),
        );
        changes.push(...pendingChanges);
        await waitForBlocked(tx, pid, 4);
      });
      const response = await pending;
      assert.equal(response.status, 201);
      const { comment } = await response.json();
      assert.equal(comment.authorId, memberId);
      await Promise.all(pendingChanges);
      const [persisted] = await sql`SELECT id FROM comments WHERE id = ${comment.id}`;
      assert.equal(persisted.id, comment.id);
      assert.equal((await request(`/${communityId}/feed`)).status, 404);
      assert.equal((await request('/comments', { postId: parentId, content: 'Too late' })).status, 404);
    } finally {
      await Promise.allSettled([pending, ...pendingChanges]);
      await sql`DELETE FROM comments WHERE author_id = ${memberId}`;
      await sql`UPDATE posts SET community_id = ${communityId} WHERE id = ${parentId}`;
      await restoreMembership();
      await restoreRules();
    }
  });

  await t.test('authority lock timeout yields a bounded sanitized failure and recovers', async () => {
    await sql.begin(async (tx) => {
      const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
      await tx`UPDATE community_members SET role = role WHERE id = ${membershipId}`;
      const pending = [
        request(`/${communityId}`),
        request('/posts', { communityId, type: 'moment', content: 'Must not outlive the lock timeout' }),
      ];
      await waitForBlocked(tx, pid, pending.length);
      const responses = await Promise.all(pending);
      for (const [index, response] of responses.entries()) {
        assert.equal(response.status, 503);
        assert.equal(response.headers.get('cache-control'), 'private, no-store');
        assert.deepEqual(await response.json(), {
          error: 'Community authoritative database operation unavailable.',
          code: 'COMMUNITY_DATABASE_UNAVAILABLE',
          operation: index === 0 ? 'get_community' : 'create_post', retryable: true,
        });
      }
    });
    assert.equal((await request(`/${communityId}/feed`)).status, 200);
    await assertNoNewContent();
  });
});
