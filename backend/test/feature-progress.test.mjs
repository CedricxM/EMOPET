import test from 'node:test';
import assert from 'node:assert/strict';

import { Hono } from 'hono';

import {
  buildFeatureProgress,
  getConsentRecordsForUser,
  getUgcReports,
  getUserBlocks,
  hasAcceptedCommunityRules,
  recordConsent,
} from '../dist/api/services/feature-progress.js';
import { community } from '../dist/api/routes/community.js';

const COMMUNITY_ID = '11111111-1111-4111-8111-111111111111';
const POST_ID = '22222222-2222-4222-8222-222222222222';

test('feature-progress returns a stable visible-but-locked snapshot', () => {
  const payload = buildFeatureProgress('u_feature_progress');
  const copresence = payload.services.find((service) => service.serviceId === 'copresence');

  assert.ok(copresence);
  assert.equal(payload.userId, 'u_feature_progress');
  assert.equal(copresence.status, 'planned');
  assert.equal(copresence.locked, true);
  assert.equal(copresence.progress.steps.length, 3);
  assert.equal(copresence.progress.steps[0].key, 'community_opt_in');
});

test('recordConsent stores purpose and context for contextual prompts', () => {
  const record = recordConsent('u_consent', {
    purpose: 'location_nearby_temp',
    status: 'accepted',
    context: 'unlock_copresence',
  });
  const records = getConsentRecordsForUser('u_consent');

  assert.equal(record.context, 'unlock_copresence');
  assert.equal(records.at(-1)?.purpose, 'location_nearby_temp');
  assert.equal(records.at(-1)?.status, 'accepted');
});

test('community routes fail closed without identity before reading or mutating state', async () => {
  const app = new Hono();
  app.route('/api/community', community);

  const reportsBefore = getUgcReports().length;
  const blocksBefore = getUserBlocks().length;

  const jsonRequest = (path, body) => ({
    path,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  });

  const requests = [
    { path: '/api/community/' },
    { path: `/api/community/${COMMUNITY_ID}` },
    { path: `/api/community/${COMMUNITY_ID}/feed` },
    { path: `/api/community/${COMMUNITY_ID}/events` },
    { path: `/api/community/copresence/${POST_ID}` },
    jsonRequest('/api/community/rules/accept', { accepted: true }),
    jsonRequest('/api/community/reports', {
      contentId: POST_ID,
      reason: 'spam',
    }),
    jsonRequest('/api/community/blocks', {
      targetUserId: 'target-user',
      reason: 'test-only',
    }),
    jsonRequest('/api/community/posts', {
      communityId: COMMUNITY_ID,
      type: 'moment',
      content: 'Bonjour la communaute',
      mediaUrls: [],
    }),
    jsonRequest('/api/community/comments', {
      postId: POST_ID,
      content: 'Une reponse valide',
    }),
    jsonRequest('/api/community/events', {
      communityId: COMMUNITY_ID,
      title: 'Balade du dimanche',
      description: 'Rendez-vous au parc',
      location: 'Parc central',
      startsAt: '2026-09-06T10:00:00.000Z',
    }),
  ];

  for (const request of requests) {
    const response = await app.request(request.path, request.init);
    assert.equal(response.status, 401, request.path);
    assert.deepEqual(await response.json(), { error: 'unauthorized' });
  }

  assert.equal(hasAcceptedCommunityRules('demo-user'), false);
  assert.equal(getUgcReports().length, reportsBefore);
  assert.equal(getUserBlocks().length, blocksBefore);
});

test('community UGC permission does not imply persistence success', async () => {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('userId', 'u_rules');
    await next();
  });
  app.route('/api/community', community);

  const blockedResponse = await app.request('/api/community/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      communityId: COMMUNITY_ID,
      type: 'moment',
      content: 'Bonjour la communaute',
      mediaUrls: [],
    }),
  });

  assert.equal(blockedResponse.status, 403);

  const acceptedResponse = await app.request('/api/community/rules/accept', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accepted: true }),
  });

  assert.equal(acceptedResponse.status, 201);

  const postResponse = await app.request('/api/community/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      communityId: COMMUNITY_ID,
      type: 'moment',
      content: 'Bonjour la communaute',
      mediaUrls: [],
    }),
  });

  assert.equal(postResponse.status, 501);
  assert.deepEqual(await postResponse.json(), {
    error: 'community_post_persistence_not_implemented',
  });

  const commentResponse = await app.request('/api/community/comments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      postId: POST_ID,
      content: 'Une reponse valide',
    }),
  });

  assert.equal(commentResponse.status, 501);
  assert.deepEqual(await commentResponse.json(), {
    error: 'community_comment_persistence_not_implemented',
  });

  const eventResponse = await app.request('/api/community/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      communityId: COMMUNITY_ID,
      title: 'Balade du dimanche',
      description: 'Rendez-vous au parc',
      location: 'Parc central',
      startsAt: '2026-09-06T10:00:00.000Z',
    }),
  });

  assert.equal(eventResponse.status, 501);
  assert.deepEqual(await eventResponse.json(), {
    error: 'community_event_persistence_not_implemented',
  });
});
