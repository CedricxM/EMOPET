import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

const integrationEnabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('Community core is durable, membership scoped and rules gated', { skip: !integrationEnabled }, async () => {
  const [
    {
      community,
      COMMUNITY_PERSISTENCE_CODE,
      COMMUNITY_RULES_VERSION,
    },
    { db },
    {
      comments,
      communities,
      communityEvents,
      communityMembers,
      communityReports,
      communityRulesAcceptances,
      posts,
      users,
    },
  ] = await Promise.all([
    import('../dist/api/routes/community.js'),
    import('../dist/db/index.js'),
    import('../dist/db/schema/index.js'),
  ]);

  const memberId = randomUUID();
  const outsiderId = randomUUID();
  const communityId = randomUUID();
  const suffix = randomUUID();

  await db.insert(users).values([
    {
      id: memberId,
      email: `community-member-${suffix}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Community Member',
    },
    {
      id: outsiderId,
      email: `community-outsider-${suffix}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Community Outsider',
    },
  ]);

  await db.insert(communities).values({
    id: communityId,
    name: 'Test Community',
    description: 'Durable Community candidate',
    type: 'activity',
    createdBy: memberId,
  });
  await db.insert(communityMembers).values({
    communityId,
    userId: memberId,
    role: 'member',
  });

  let currentUserId = memberId;
  const app = new Hono();
  app.use('*', async (c, next) => {
    if (currentUserId) c.set('userId', currentUserId);
    await next();
  });
  app.route('/api/community', community);

  let postId;
  let commentId;
  let eventId;
  let reportId;

  try {
    const listResponse = await app.request('/api/community');
    assert.equal(listResponse.status, 200);
    const listBody = await listResponse.json();
    assert.equal(listBody.communities.length, 1);
    assert.equal(listBody.communities[0].id, communityId);
    assert.equal(listBody.communities[0].membershipRole, 'member');

    const blockedPost = await app.request('/api/community/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communityId,
        type: 'moment',
        content: 'Must not persist before rules acceptance.',
        mediaUrls: [],
      }),
    });
    assert.equal(blockedPost.status, 403);
    assert.equal((await blockedPost.json()).code, 'COMMUNITY_RULES_REQUIRED');

    const rejectedAcceptance = await app.request('/api/community/rules/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accepted: false }),
    });
    assert.equal(rejectedAcceptance.status, 400);

    const acceptanceResponse = await app.request('/api/community/rules/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accepted: true }),
    });
    assert.equal(acceptanceResponse.status, 201);
    const acceptanceBody = await acceptanceResponse.json();
    assert.equal(acceptanceBody.acceptance.userId, memberId);
    assert.equal(acceptanceBody.acceptance.rulesVersion, COMMUNITY_RULES_VERSION);

    const [persistedAcceptance] = await db
      .select()
      .from(communityRulesAcceptances)
      .where(eq(communityRulesAcceptances.userId, memberId))
      .limit(1);
    assert.ok(persistedAcceptance);
    assert.equal(persistedAcceptance.rulesVersion, COMMUNITY_RULES_VERSION);

    const createPostResponse = await app.request('/api/community/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communityId,
        type: 'moment',
        content: 'Durable member-authored post.',
        mediaUrls: [],
      }),
    });
    assert.equal(createPostResponse.status, 201);
    const createdPost = await createPostResponse.json();
    postId = createdPost.post.id;
    assert.equal(createdPost.post.authorId, memberId);
    assert.equal(createdPost.post.communityId, communityId);

    const feedResponse = await app.request(`/api/community/${communityId}/feed`);
    assert.equal(feedResponse.status, 200);
    const feed = await feedResponse.json();
    assert.ok(feed.posts.some((post) => post.id === postId));

    const createCommentResponse = await app.request('/api/community/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, content: 'Durable reply.' }),
    });
    assert.equal(createCommentResponse.status, 201);
    const createdComment = await createCommentResponse.json();
    commentId = createdComment.comment.id;
    assert.equal(createdComment.comment.authorId, memberId);

    const createEventResponse = await app.request('/api/community/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communityId,
        title: 'Test walk',
        description: 'Candidate event',
        location: 'Test location',
        startsAt: '2099-01-01T10:00:00.000Z',
      }),
    });
    assert.equal(createEventResponse.status, 201);
    const createdEvent = await createEventResponse.json();
    eventId = createdEvent.event.id;
    assert.equal(createdEvent.event.createdBy, memberId);

    const eventsResponse = await app.request(`/api/community/${communityId}/events`);
    assert.equal(eventsResponse.status, 200);
    const eventsBody = await eventsResponse.json();
    assert.ok(eventsBody.events.some((event) => event.id === eventId));

    const missingReport = await app.request('/api/community/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId: randomUUID(), reason: 'unsafe' }),
    });
    assert.equal(missingReport.status, 404);

    const reportResponse = await app.request('/api/community/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentId: postId,
        reason: 'spam',
        details: 'Integration report evidence.',
      }),
    });
    assert.equal(reportResponse.status, 201);
    const reportBody = await reportResponse.json();
    reportId = reportBody.report.id;
    assert.equal(reportBody.report.contentType, 'post');
    assert.equal(reportBody.report.contentId, postId);
    assert.equal(reportBody.report.reason, 'spam');
    assert.equal(reportBody.report.status, 'open');
    assert.equal(reportResponse.headers.get('cache-control'), 'private, no-store');

    const [persistedReport] = await db
      .select()
      .from(communityReports)
      .where(eq(communityReports.id, reportId))
      .limit(1);
    assert.ok(persistedReport);
    assert.equal(persistedReport.reporterUserId, memberId);
    assert.equal(persistedReport.communityId, communityId);
    assert.equal(persistedReport.contentId, postId);

    currentUserId = outsiderId;
    const outsiderGet = await app.request(`/api/community/${communityId}`);
    assert.equal(outsiderGet.status, 404);

    const outsiderFeed = await app.request(`/api/community/${communityId}/feed`);
    assert.equal(outsiderFeed.status, 404);

    const outsiderPost = await app.request('/api/community/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communityId,
        type: 'moment',
        content: 'Must not cross membership boundary.',
        mediaUrls: [],
      }),
    });
    assert.equal(outsiderPost.status, 404);

    const outsiderReport = await app.request('/api/community/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId: postId, reason: 'harassment' }),
    });
    assert.equal(outsiderReport.status, 404);

    currentUserId = null;
    const unauthenticatedMalformedPost = await app.request('/api/community/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nonsense: true }),
    });
    assert.equal(unauthenticatedMalformedPost.status, 401);
    assert.equal((await unauthenticatedMalformedPost.json()).code, 'AUTHENTICATION_REQUIRED');

    currentUserId = memberId;
    const blockResponse = await app.request('/api/community/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: outsiderId, reason: 'integration test' }),
    });
    assert.equal(blockResponse.status, 503);
    assert.equal((await blockResponse.json()).code, COMMUNITY_PERSISTENCE_CODE);
  } finally {
    if (reportId) await db.delete(communityReports).where(eq(communityReports.id, reportId));
    if (commentId) await db.delete(comments).where(eq(comments.id, commentId));
    if (eventId) await db.delete(communityEvents).where(eq(communityEvents.id, eventId));
    if (postId) await db.delete(posts).where(eq(posts.id, postId));
    await db.delete(communityRulesAcceptances).where(eq(communityRulesAcceptances.userId, memberId));
    await db.delete(communityMembers).where(eq(communityMembers.communityId, communityId));
    await db.delete(communities).where(eq(communities.id, communityId));
    await db.delete(users).where(eq(users.id, memberId));
    await db.delete(users).where(eq(users.id, outsiderId));
  }
});
