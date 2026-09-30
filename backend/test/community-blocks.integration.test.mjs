import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { eq, inArray, or } from 'drizzle-orm';
import { Hono } from 'hono';

const enabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('WORLD-SOCIAL-01 blocks make two Community members mutually and silently invisible', { skip: !enabled }, async (t) => {
  const [{ community, COMMUNITY_RULES_VERSION }, { db, closeDatabase }, schema] = await Promise.all([
    import('../dist/api/routes/community.js'),
    import('../dist/db/index.js'),
    import('../dist/db/schema/index.js'),
  ]);
  const { comments, communities, communityEvents, communityMembers, communityReports, communityRulesAcceptances, posts, userBlocks, users } = schema;
  const [a, b, communityId] = [randomUUID(), randomUUID(), randomUUID()];
  t.after(async () => {
    await db.delete(userBlocks).where(or(inArray(userBlocks.blockerUserId, [a, b]), inArray(userBlocks.blockedUserId, [a, b])));
    await db.delete(communityReports).where(inArray(communityReports.reporterUserId, [a, b]));
    await db.delete(comments).where(inArray(comments.authorId, [a, b]));
    await db.delete(posts).where(eq(posts.communityId, communityId));
    await db.delete(communityEvents).where(eq(communityEvents.communityId, communityId));
    await db.delete(communityRulesAcceptances).where(inArray(communityRulesAcceptances.userId, [a, b]));
    await db.delete(communityMembers).where(eq(communityMembers.communityId, communityId));
    await db.delete(communities).where(eq(communities.id, communityId));
    await db.delete(users).where(inArray(users.id, [a, b]));
    await closeDatabase();
  });
  await db.insert(users).values([a, b].map((id) => ({ id, email: `${id}@example.test`, passwordHash: 'test-only', name: 'Synthetic' })));
  await db.insert(communities).values({ id: communityId, name: 'Blocks', description: 'test', type: 'activity', createdBy: a });
  await db.insert(communityMembers).values([a, b].map((userId) => ({ communityId, userId, role: 'member' })));
  await db.insert(communityRulesAcceptances).values([a, b].map((userId) => ({ userId, rulesVersion: COMMUNITY_RULES_VERSION, acceptedAt: new Date() })));

  let actor = a;
  const app = new Hono();
  app.use('*', async (c, next) => { c.set('userId', actor); await next(); });
  app.route('/api/community', community);
  const call = async (as, method, path, body) => {
    actor = as;
    const response = await app.request(`/api/community${path}`, { method, headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  };
  const post = async (as, content) => (await call(as, 'POST', '/posts', { communityId, type: 'moment', content, mediaUrls: [] })).body.post;
  const feed = async (as) => (await call(as, 'GET', `/${communityId}/feed`)).body.posts.map((p) => p.content);
  const events = async (as) => (await call(as, 'GET', `/${communityId}/events`)).body.events.map((e) => e.title);

  const fromA = await post(a, 'post by a');
  const fromB = await post(b, 'post by b');
  assert.equal((await call(b, 'POST', '/events', { communityId, title: 'walk by b', description: 'x', location: 'park', startsAt: '2026-10-01T10:00:00.000Z' })).status, 201);
  assert.deepEqual((await feed(a)).sort(), ['post by a', 'post by b']);
  assert.deepEqual(await events(a), ['walk by b']);

  // A blocks B through the Community alias.
  const blocked = await call(a, 'POST', '/blocks', { targetUserId: b, reason: 'free text is not stored' });
  assert.equal(blocked.status, 201);
  assert.equal(blocked.body.reasonStored, false);
  assert.equal(blocked.body.enforcement.community, 'ENFORCED');
  const [row] = await db.select().from(userBlocks).where(eq(userBlocks.blockerUserId, a));
  assert.deepEqual(Object.keys(row).sort(), ['blockedUserId', 'blockerUserId', 'createdAt', 'id'], 'no reason column exists');

  // Mutual invisibility on the feed and events; comments behave like a missing post.
  assert.deepEqual(await feed(a), ['post by a']);
  assert.deepEqual(await feed(b), ['post by b']);
  assert.deepEqual(await events(a), []);
  const commentOnB = await call(a, 'POST', '/comments', { postId: fromB.id, content: 'hello' });
  const commentOnMissing = await call(a, 'POST', '/comments', { postId: randomUUID(), content: 'hello' });
  assert.equal(commentOnB.status, 404);
  assert.deepEqual(commentOnB.body, commentOnMissing.body, 'same answer as a missing post');
  assert.equal((await call(b, 'POST', '/comments', { postId: fromA.id, content: 'hello' })).status, 404);
  // Reporting stays available across a block.
  assert.equal((await call(a, 'POST', '/reports', { contentId: fromB.id, reason: 'harassment' })).status, 201,
    'reporting stays available across a block');

  // Unblocking restores visibility.
  await db.delete(userBlocks).where(eq(userBlocks.blockerUserId, a));
  assert.deepEqual((await feed(a)).sort(), ['post by a', 'post by b']);
  assert.equal((await call(a, 'POST', '/comments', { postId: fromB.id, content: 'hello again' })).status, 201);
});
