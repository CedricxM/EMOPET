import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import postgres from 'postgres';

const enabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';
const postKeys = ['id', 'communityId', 'authorId', 'type', 'content', 'mediaUrls', 'mediaStatus', 'createdAt'].sort();
const communityKeys = ['id', 'name', 'description', 'type', 'createdBy', 'createdAt', 'locationDisclosure'].sort();
const eventKeys = ['id', 'communityId', 'createdBy', 'title', 'description', 'startsAt', 'createdAt', 'locationDisclosure'].sort();
const locationWithheld = 'WITHHELD_PENDING_LOCATION_AUTHORITY';

test('Community publishes bounded social data without inheriting private disclosure authority', {
  skip: !enabled, timeout: 30_000,
}, async (t) => {
  const [{ community, COMMUNITY_RULES_VERSION }, { authMiddleware, signAccessToken }, { closeDatabase }] = await Promise.all([
    import('../dist/api/routes/community.js'),
    import('../dist/api/middleware/auth.js'),
    import('../dist/db/index.js'),
  ]);
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const hostId = randomUUID();
  const memberId = randomUUID();
  const outsiderId = randomUUID();
  const communityId = randomUUID();
  const postId = randomUUID();
  const legacyMediaPostId = randomUUID();
  const eventId = randomUUID();
  const publicMedia = ['https://example.test/chosen-photo.jpg'];
  const privateAddress = `PRIVATE-MEETING-POINT-${randomUUID()}`;
  const privateSentinel = `PRIVATE-CROSS-SURFACE-${randomUUID()}`;
  const overlay = {
    eliStatus: privateSentinel, arousal: 0.72, valence: -0.93, rawTelemetry: [501, 502],
    privateMemory: `${privateSentinel}-memory`, breizConversation: `${privateSentinel}-conversation`,
    preciseLocation: { latitude: 47.75, longitude: -3.36 },
  };

  t.after(async () => {
    try {
      await sql`DELETE FROM comments WHERE author_id IN (${hostId}, ${memberId})`;
      await sql`DELETE FROM posts WHERE community_id = ${communityId}`;
      await sql`DELETE FROM community_events WHERE community_id = ${communityId}`;
      await sql`DELETE FROM community_members WHERE community_id = ${communityId}`;
      await sql`DELETE FROM community_rules_acceptances WHERE user_id IN (${hostId}, ${memberId})`;
      await sql`DELETE FROM communities WHERE id = ${communityId}`;
      await sql`DELETE FROM users WHERE id IN (${hostId}, ${memberId}, ${outsiderId})`;
    } finally {
      await sql.end({ timeout: 5 });
      await closeDatabase();
    }
  });

  for (const id of [hostId, memberId, outsiderId]) {
    await sql`INSERT INTO users (id, email, password_hash, name)
      VALUES (${id}, ${`community-disclosure-${id}@example.test`}, 'test-only', 'Disclosure fixture')`;
  }
  await sql`INSERT INTO communities (id, name, description, type, created_by, latitude, longitude, radius_m)
    VALUES (${communityId}, 'Fixture Circle', 'Chosen social description', 'activity', ${hostId}, 47.75, -3.36, 250)`;
  for (const [id, role] of [[hostId, 'moderator'], [memberId, 'member']]) {
    await sql`INSERT INTO community_members (community_id, user_id, role) VALUES (${communityId}, ${id}, ${role})`;
    await sql`INSERT INTO community_rules_acceptances (user_id, rules_version) VALUES (${id}, ${COMMUNITY_RULES_VERSION})`;
  }
  await sql`INSERT INTO posts (id, community_id, author_id, type, content, media_urls, sensor_overlay, like_count)
    VALUES (${postId}, ${communityId}, ${hostId}, 'moment', 'Chosen social text', ${sql.json(publicMedia)}, ${sql.json(overlay)}, 9876)`;
  await sql`INSERT INTO posts (id, community_id, author_id, type, content, media_urls)
    VALUES (${legacyMediaPostId}, ${communityId}, ${hostId}, 'moment', 'Legacy attachment fixture', '[]')`;
  await sql`INSERT INTO community_events (id, community_id, created_by, title, description, location, latitude, longitude, starts_at)
    VALUES (${eventId}, ${communityId}, ${hostId}, 'Chosen social event', 'Event description', ${privateAddress}, 47.75, -3.36, '2099-01-01')`;

  const app = new Hono();
  app.use('/api/*', authMiddleware);
  app.route('/api/community', community);
  const hostToken = await signAccessToken(hostId);
  const memberToken = await signAccessToken(memberId);
  const outsiderToken = await signAccessToken(outsiderId);
  function request(path, body, token = memberToken) {
    return app.request(`/api/community${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  async function socialJson(response, expectedStatus = 200) {
    assert.equal(response.status, expectedStatus);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    const text = await response.text();
    assert.equal(text.includes(privateSentinel), false, 'no private sensor/ELI/Memory/Breiz metadata');
    assert.equal(text.includes(privateAddress), false, 'no exact meeting point');
    return JSON.parse(text);
  }

  await t.test('feed omits legacy sensor context and popularity fields while preserving chosen content', async () => {
    for (const token of [memberToken, hostToken]) {
      const feed = await socialJson(await request(`/${communityId}/feed?include=sensorOverlay&include=location&role=owner`, undefined, token));
      const post = feed.posts.find((value) => value.id === postId);
      assert.deepEqual(Object.keys(post).sort(), postKeys);
      assert.equal(post.authorId, hostId);
      assert.equal(post.content, 'Chosen social text');
      assert.deepEqual(post.mediaUrls, publicMedia);
      assert.equal(post.mediaStatus, 'URL_REFERENCES_ONLY');
    }
    const [stored] = await sql`SELECT sensor_overlay, like_count FROM posts WHERE id = ${postId}`;
    assert.deepEqual(stored.sensor_overlay, overlay, 'the disclosure fix preserves historical evidence');
    assert.equal(stored.like_count, 9876);
  });

  await t.test('arbitrary legacy media JSON is explicitly withheld without losing the post or altering storage', async () => {
    for (const invalid of [
      { privateContext: overlay }, [overlay], [publicMedia[0], { secret: privateSentinel }],
      ['not-a-url'], ['javascript:alert(1)'], ['data:text/plain,private'],
      ['https://private-user:private-password@example.test/photo'], null,
      Array.from({ length: 10 }, () => publicMedia[0]),
    ]) {
      await sql`UPDATE posts SET media_urls = ${sql.json(invalid)} WHERE id = ${legacyMediaPostId}`;
      const feed = await socialJson(await request(`/${communityId}/feed`));
      const post = feed.posts.find((value) => value.id === legacyMediaPostId);
      assert.deepEqual(Object.keys(post).sort(), postKeys);
      assert.equal(post.content, 'Legacy attachment fixture');
      assert.deepEqual(post.mediaUrls, []);
      assert.equal(post.mediaStatus, 'WITHHELD_INVALID_METADATA');
      const [stored] = await sql`SELECT media_urls FROM posts WHERE id = ${legacyMediaPostId}`;
      assert.deepEqual(stored.media_urls, invalid);
      assert.equal(feed.posts.find((value) => value.id === postId).mediaStatus, 'URL_REFERENCES_ONLY');
    }
  });

  await t.test('create and recovery share one post projection and server-controlled authorship', async () => {
    const created = await socialJson(await request('/posts', {
      communityId, type: 'moment', content: 'Member-authored social content', mediaUrls: publicMedia,
      authorId: outsiderId, sensorOverlay: overlay, likeCount: 9000,
    }), 201);
    assert.deepEqual(Object.keys(created.post).sort(), postKeys);
    assert.equal(created.post.authorId, memberId);
    assert.deepEqual(created.post.mediaUrls, publicMedia);
    const [stored] = await sql`SELECT author_id, sensor_overlay, like_count FROM posts WHERE id = ${created.post.id}`;
    assert.equal(stored.author_id, memberId);
    assert.equal(stored.sensor_overlay, null);
    assert.equal(stored.like_count, 0);
    const feed = await socialJson(await request(`/${communityId}/feed`, undefined, hostToken));
    assert.deepEqual(feed.posts.find((post) => post.id === created.post.id), created.post);

    const comment = await socialJson(await request('/comments', {
      postId: created.post.id, content: 'Member-authored reply', authorId: outsiderId,
    }), 201);
    assert.deepEqual(Object.keys(comment.comment).sort(), ['id', 'postId', 'authorId', 'content', 'createdAt'].sort());
    assert.equal(comment.comment.authorId, memberId);
    const [persistedComment] = await sql`SELECT content FROM comments WHERE id = ${comment.comment.id}`;
    assert.equal(persistedComment.content, 'Member-authored reply');
  });

  await t.test('Circle membership, creation and moderator role do not release its stored precise location', async () => {
    for (const token of [hostToken, memberToken]) {
      const list = await socialJson(await request('', undefined, token));
      assert.equal(list.communities.length, 1);
      const entry = list.communities[0];
      assert.deepEqual(Object.keys(entry).sort(), [...communityKeys, 'membershipRole', 'joinedAt'].sort());
      assert.equal(entry.locationDisclosure, locationWithheld);
      const detail = await socialJson(await request(`/${communityId}?include=location&location_opt_in=true`, undefined, token));
      assert.deepEqual(Object.keys(detail.community).sort(), communityKeys);
      assert.equal(detail.community.name, 'Fixture Circle');
      assert.equal(detail.community.locationDisclosure, locationWithheld);
    }
    const [stored] = await sql`SELECT latitude, longitude, radius_m FROM communities WHERE id = ${communityId}`;
    assert.equal(stored.latitude, 47.75);
    assert.ok(Math.abs(stored.longitude + 3.36) < 0.00001);
    assert.equal(stored.radius_m, 250);
  });

  await t.test('event location remains withheld on create and read until participant disclosure authority exists', async () => {
    const created = await socialJson(await request('/events', {
      communityId, title: 'New social event', description: 'Chosen event text', location: privateAddress,
      latitude: 47.75, longitude: -3.36, startsAt: '2099-02-01T10:00:00Z',
      createdBy: outsiderId, participantStatus: 'CONFIRMED', locationConsent: true,
    }), 201);
    assert.deepEqual(Object.keys(created.event).sort(), eventKeys);
    assert.equal(created.event.createdBy, memberId);
    assert.equal(created.event.locationDisclosure, locationWithheld);
    for (const token of [hostToken, memberToken]) {
      const events = await socialJson(await request(`/${communityId}/events?participantStatus=CONFIRMED&include=location`, undefined, token));
      assert.equal(events.events.length, 2);
      for (const event of events.events) {
        assert.deepEqual(Object.keys(event).sort(), eventKeys);
        assert.equal(event.locationDisclosure, locationWithheld);
      }
      assert.deepEqual(events.events.find((event) => event.id === created.event.id), created.event);
    }
    for (const id of [eventId, created.event.id]) {
      const [stored] = await sql`SELECT location, latitude, longitude FROM community_events WHERE id = ${id}`;
      assert.equal(stored.location, privateAddress);
      assert.equal(stored.latitude, 47.75);
      assert.ok(Math.abs(stored.longitude + 3.36) < 0.00001);
    }
  });

  await t.test('invalid incoming media is rejected before persistence, including malformed URLs', async () => {
    const [before] = await sql`SELECT count(*)::int AS count FROM posts WHERE community_id = ${communityId}`;
    for (const mediaUrls of [['not-a-url'], ['javascript:alert(1)'], ['data:text/plain,private'],
      ['https://user:pass@example.test/photo'], [overlay], { secret: privateSentinel }]) {
      const response = await request('/posts', { communityId, type: 'moment', content: 'Invalid media', mediaUrls });
      assert.equal(response.status, 400);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
    }
    const [after] = await sql`SELECT count(*)::int AS count FROM posts WHERE community_id = ${communityId}`;
    assert.equal(after.count, before.count);
  });

  await t.test('bounded projections preserve membership and anonymous denial boundaries', async () => {
    for (const suffix of ['', '/feed', '/events']) {
      const denied = await request(`/${communityId}${suffix}`, undefined, outsiderToken);
      const missing = await request(`/${randomUUID()}${suffix}`, undefined, outsiderToken);
      assert.equal(denied.status, 404);
      assert.equal(missing.status, 404);
      assert.deepEqual(await denied.json(), await missing.json());
      assert.equal((await request(`/${communityId}${suffix}`, undefined, null)).status, 401);
    }
    const list = await socialJson(await request('', undefined, outsiderToken));
    assert.deepEqual(list.communities, []);
  });
});
