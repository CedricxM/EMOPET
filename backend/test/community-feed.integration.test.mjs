import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import postgres from 'postgres';

const enabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('Community feed uses bounded stable pages without turning cursors into authority', {
  skip: !enabled, timeout: 30_000,
}, async (t) => {
  const [{ community, COMMUNITY_RULES_VERSION }, { authMiddleware, signAccessToken }, { closeDatabase }] = await Promise.all([
    import('../dist/api/routes/community.js'),
    import('../dist/api/middleware/auth.js'),
    import('../dist/db/index.js'),
  ]);
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const memberId = randomUUID();
  const otherMemberId = randomUUID();
  const outsiderId = randomUUID();
  const communityId = randomUUID();
  const otherCommunityId = randomUUID();
  const emptyCommunityId = randomUUID();
  const privateSentinel = `PRIVATE-FEED-${randomUUID()}`;
  const foreignSentinel = `FOREIGN-COMMUNITY-${randomUUID()}`;
  const fixtures = Array.from({ length: 18 }, (_, i) => {
    const microsecondOffset = Math.floor(i / 4) + 1;
    return {
      id: randomUUID(),
      microsecondOffset,
      createdAt: `2026-09-01T12:00:00.123${String(microsecondOffset).padStart(3, '0')}Z`,
    };
  });
  const ordered = [...fixtures].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt > b.createdAt ? -1 : 1;
    return a.id > b.id ? -1 : a.id < b.id ? 1 : 0;
  });

  t.after(async () => {
    try {
      await sql`DELETE FROM posts WHERE community_id IN (${communityId}, ${otherCommunityId}, ${emptyCommunityId})`;
      await sql`DELETE FROM community_members WHERE community_id IN (${communityId}, ${otherCommunityId}, ${emptyCommunityId})`;
      await sql`DELETE FROM community_rules_acceptances WHERE user_id IN (${memberId}, ${otherMemberId})`;
      await sql`DELETE FROM communities WHERE id IN (${communityId}, ${otherCommunityId}, ${emptyCommunityId})`;
      await sql`DELETE FROM users WHERE id IN (${memberId}, ${otherMemberId}, ${outsiderId})`;
    } finally {
      await sql.end({ timeout: 5 });
      await closeDatabase();
    }
  });

  for (const id of [memberId, otherMemberId, outsiderId]) {
    await sql`INSERT INTO users (id, email, password_hash, name)
      VALUES (${id}, ${`feed-${id}@example.test`}, 'test-only', 'Feed fixture')`;
  }
  for (const id of [communityId, otherCommunityId, emptyCommunityId]) {
    await sql`INSERT INTO communities (id, name, type, created_by) VALUES (${id}, 'Feed circle', 'activity', ${memberId})`;
    await sql`INSERT INTO community_members (community_id, user_id) VALUES (${id}, ${memberId})`;
  }
  await sql`INSERT INTO community_members (community_id, user_id) VALUES (${communityId}, ${otherMemberId})`;
  for (const id of [memberId, otherMemberId]) {
    await sql`INSERT INTO community_rules_acceptances (user_id, rules_version) VALUES (${id}, ${COMMUNITY_RULES_VERSION})`;
  }
  async function insertFixture(row) {
    // Build the sub-millisecond boundary in PostgreSQL itself. Some JS drivers
    // normalize ISO timestamp parameters through millisecond Date precision,
    // which would make a microsecond cursor test accidentally test the driver.
    await sql`INSERT INTO posts (id, community_id, author_id, type, content, created_at, sensor_overlay, like_count)
      VALUES (${row.id}, ${communityId}, ${memberId}, 'moment', 'Chosen post',
        TIMESTAMPTZ '2026-09-01 12:00:00.123000+00' + (${row.microsecondOffset} * INTERVAL '1 microsecond'),
        ${sql.json({ privateContext: privateSentinel })}, 999)`;
  }
  for (const fixture of fixtures) await insertFixture(fixture);
  await sql`INSERT INTO posts (community_id, author_id, type, content)
    VALUES (${otherCommunityId}, ${memberId}, 'moment', ${foreignSentinel})`;

  const app = new Hono();
  app.use('/api/*', authMiddleware);
  app.route('/api/community', community);
  const token = await signAccessToken(memberId);
  const otherToken = await signAccessToken(otherMemberId);
  const outsiderToken = await signAccessToken(outsiderId);
  function request(target = communityId, cursor, auth = token, extra = '') {
    const query = cursor === undefined ? '' : `cursor=${encodeURIComponent(cursor)}`;
    return app.request(`/api/community/${target}/feed?${query}${extra}`, {
      headers: auth ? { Authorization: `Bearer ${auth}` } : {},
    });
  }
  async function page(response) {
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    const text = await response.text();
    assert.equal(text.includes(privateSentinel), false);
    assert.equal(text.includes(foreignSentinel), false);
    const body = JSON.parse(text);
    assert.equal(body.pagination.pageSize, 6);
    assert.ok(body.posts.length <= 6);
    assert.equal(body.pagination.hasMore, body.pagination.nextCursor !== null);
    for (const post of body.posts) {
      assert.equal(post.communityId, communityId);
      for (const key of ['cursorCreatedAt', 'sensorOverlay', 'likeCount']) assert.equal(Object.hasOwn(post, key), false);
    }
    return body;
  }
  async function drain(cursor) {
    const ids = [];
    for (let count = 0; count < 10; count += 1) {
      const result = await page(await request(communityId, cursor));
      ids.push(...result.posts.map((post) => post.id));
      if (!result.pagination.hasMore) return ids;
      cursor = result.pagination.nextCursor;
    }
    assert.fail('Finite fixture did not reach an end');
  }

  await t.test('three six-row pages preserve UUID ties and PostgreSQL microseconds, with a real end', async () => {
    let cursor;
    const seen = [];
    for (let index = 0; index < 3; index += 1) {
      const result = await page(await request(communityId, cursor, token, '&limit=1000000'));
      assert.equal(result.posts.length, 6);
      assert.equal(result.pagination.hasMore, index < 2);
      seen.push(...result.posts.map((post) => post.id));
      cursor = result.pagination.nextCursor;
      if (cursor) {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString());
        const boundary = ordered[(index + 1) * 6 - 1];
        assert.equal(decoded.createdAt, boundary.createdAt);
        assert.equal(decoded.id, boundary.id);
      }
    }
    assert.equal(cursor, null, 'an exactly full last page does not advertise a phantom next page');
    assert.equal(new Set(seen).size, 18);
    assert.deepEqual(seen, ordered.map((row) => row.id));
  });

  await t.test('an authoritative empty query returns an immediate end', async () => {
    const result = await page(await request(emptyCommunityId));
    assert.deepEqual(result.posts, []);
    assert.deepEqual(result.pagination, { pageSize: 6, hasMore: false, nextCursor: null });
  });

  await t.test('deleting the cursor row and an unseen row cannot shift or duplicate subsequent pages', async () => {
    const first = await page(await request());
    const removed = [ordered[5], ordered[8]];
    try {
      for (const row of removed) await sql`DELETE FROM posts WHERE id = ${row.id}`;
      const remaining = await drain(first.pagination.nextCursor);
      assert.deepEqual(remaining, ordered.slice(6).filter((row) => row.id !== removed[1].id).map((row) => row.id));
      assert.equal(new Set(remaining).size, remaining.length);
    } finally {
      for (const row of removed) await insertFixture(row);
    }
  });

  await t.test('a newly created post waits for explicit refresh instead of moving an existing continuation', async () => {
    const first = await page(await request());
    let newId;
    try {
      const created = await app.request('/api/community/posts', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId, type: 'moment', content: 'Newer member post' }),
      });
      assert.equal(created.status, 201);
      newId = (await created.json()).post.id;
      assert.deepEqual(await drain(first.pagination.nextCursor), ordered.slice(6).map((row) => row.id));
      const refreshed = await page(await request());
      assert.equal(refreshed.posts[0].id, newId);
    } finally {
      if (newId) await sql`DELETE FROM posts WHERE id = ${newId}`;
    }
  });

  await t.test('cursor syntax and scope are strict but never replace membership authority', async () => {
    const first = await page(await request());
    const cursor = first.pagination.nextCursor;
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    const invalid = ['', 'not%base64', 'a'.repeat(769),
      Buffer.from(JSON.stringify({ ...decoded, createdAt: '2026-02-30T00:00:00.000000Z' })).toString('base64url')];
    const denied = [
      ...invalid.map((value) => request(communityId, value)),
      request(communityId, cursor, token, `&cursor=${cursor}`),
      request(otherCommunityId, cursor),
      request(communityId, cursor, otherToken),
    ];
    for (const response of await Promise.all(denied)) {
      assert.equal(response.status, 400);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.deepEqual(await response.json(), { error: 'Invalid feed cursor.', code: 'INVALID_FEED_CURSOR' });
    }
    // Unsigned state can be edited; even a cursor rewritten for the outsider
    // must not become a grant. Current database authority still wins.
    const forged = Buffer.from(JSON.stringify({ ...decoded, userId: outsiderId })).toString('base64url');
    assert.equal((await request(communityId, forged, outsiderToken)).status, 404);
    assert.equal((await request(communityId, cursor, null)).status, 401);
  });

  await t.test('each continuation rechecks current membership and current rules', async () => {
    const first = await page(await request());
    const cursor = first.pagination.nextCursor;
    await sql`DELETE FROM community_members WHERE community_id = ${communityId} AND user_id = ${memberId}`;
    try {
      assert.equal((await request(communityId, cursor)).status, 404);
    } finally {
      await sql`INSERT INTO community_members (community_id, user_id) VALUES (${communityId}, ${memberId})`;
    }
    await sql`UPDATE community_rules_acceptances SET rules_version = 'obsolete-fixture' WHERE user_id = ${memberId}`;
    try {
      const denied = await request(communityId, cursor);
      assert.equal(denied.status, 403);
      assert.equal((await denied.json()).code, 'COMMUNITY_RULES_REQUIRED');
    } finally {
      await sql`UPDATE community_rules_acceptances SET rules_version = ${COMMUNITY_RULES_VERSION} WHERE user_id = ${memberId}`;
    }
    assert.equal((await request(communityId, cursor)).status, 200);
  });

  await t.test('the composed index is valid and can satisfy the tuple seek without a sort', async () => {
    const [index] = await sql`SELECT pg_get_indexdef(indexrelid) AS definition, indisvalid, indisready
      FROM pg_index WHERE indexrelid = to_regclass('public.idx_posts_community_created_id')`;
    assert.ok(index);
    assert.equal(index.indisvalid, true);
    assert.equal(index.indisready, true);
    assert.match(index.definition, /\(community_id, created_at DESC(?: NULLS LAST)?, id DESC(?: NULLS LAST)?\)/);
    await sql.begin(async (tx) => {
      // A controlled eligibility probe, not a production planner benchmark.
      await tx`SET LOCAL enable_seqscan = off`;
      const [explain] = await tx`EXPLAIN (FORMAT JSON) SELECT id FROM posts
        WHERE community_id = ${communityId}
          AND (created_at, id) < (${ordered[5].createdAt}::timestamptz, ${ordered[5].id}::uuid)
        ORDER BY created_at DESC, id DESC LIMIT 7`;
      const nodes = [];
      function visit(node) { nodes.push(node); for (const child of node.Plans ?? []) visit(child); }
      visit(explain['QUERY PLAN'][0].Plan);
      assert.ok(nodes.some((node) => node['Index Name'] === 'idx_posts_community_created_id'));
      assert.equal(nodes.some((node) => node['Node Type'].includes('Sort')), false);
    });
  });
});
