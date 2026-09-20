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
    { path: '/api/community/copresence/11111111-1111-4111-8111-111111111112' },
    jsonRequest('/api/community/rules/accept', { accepted: true }),
    jsonRequest('/api/community/reports', {
      contentId: '11111111-1111-4111-8111-111111111113',
      reason: 'spam',
    }),
    jsonRequest('/api/community/blocks', {
      targetUserId: '11111111-1111-4111-8111-111111111114',
      reason: 'test-only',
    }),
    jsonRequest('/api/community/posts', {
      communityId: COMMUNITY_ID,
      type: 'moment',
      content: 'Bonjour la communaute',
      mediaUrls: [],
    }),
    jsonRequest('/api/community/comments', {
      postId: '11111111-1111-4111-8111-111111111115',
      content: 'Une reponse valide',
    }),
    jsonRequest('/api/community/events', {
      communityId: COMMUNITY_ID,
      title: 'Balade du dimanche',
      description: 'Rendez-vous au parc',
      location: 'Parc central',
      startsAt: '2026-09-20T10:00:00.000Z',
    }),
  ];

  for (const request of requests) {
    const response = await app.request(request.path, request.init);
    assert.equal(response.status, 401, request.path);
    assert.deepEqual(await response.json(), { error: 'Authentication required.', code: 'AUTHENTICATION_REQUIRED' });
  }

  assert.equal(hasAcceptedCommunityRules('demo-user'), false);
  assert.equal(getUgcReports().length, reportsBefore);
  assert.equal(getUserBlocks().length, blocksBefore);
});

test('feature-progress memory state does not grant durable Community authority', async () => {
  const { readFileSync } = await import('node:fs');
  const routeSource = readFileSync(new URL('../api/routes/community.ts', import.meta.url), 'utf8');

  assert.match(routeSource, /communityRulesAcceptances/);
  assert.match(routeSource, /requireCurrentRulesAcceptance/);
  assert.match(routeSource, /\.insert\(communityRulesAcceptances\)/);
  assert.match(routeSource, /\.insert\(posts\)/);
  assert.match(routeSource, /\.insert\(comments\)/);
  assert.match(routeSource, /\.insert\(communityEvents\)/);

  assert.doesNotMatch(routeSource, /hasAcceptedCommunityRules/);
  assert.doesNotMatch(routeSource, /acceptCommunityRules/);
  assert.doesNotMatch(routeSource, /createUgcReport/);
  assert.doesNotMatch(routeSource, /createUserBlock/);
  assert.doesNotMatch(routeSource, /feature-progress\.js/);

  assert.equal(hasAcceptedCommunityRules('u_rules'), false);
});
