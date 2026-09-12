import test from 'node:test';
import assert from 'node:assert/strict';

import { Hono } from 'hono';

import {
  buildFeatureProgress,
  getConsentRecordsForUser,
  recordConsent,
} from '../dist/api/services/feature-progress.js';
import {
  community,
  COMMUNITY_PERSISTENCE_CODE,
} from '../dist/api/routes/community.js';
import {
  featureProgress,
  FEATURE_PROGRESS_PERSISTENCE_CODE,
} from '../dist/api/routes/feature-progress.js';

const COMMUNITY_ID = '11111111-1111-4111-8111-111111111111';

function buildCommunityApp({ userId } = {}) {
  const app = new Hono();
  if (userId) {
    app.use('*', async (c, next) => {
      c.set('userId', userId);
      await next();
    });
  }
  app.route('/api/community', community);
  return app;
}

function buildFeatureProgressApp({ userId } = {}) {
  const app = new Hono();
  if (userId) {
    app.use('*', async (c, next) => {
      c.set('userId', userId);
      await next();
    });
  }
  app.route('/api/feature-progress', featureProgress);
  return app;
}

test('feature-progress prototype service returns a stable visible-but-locked snapshot', () => {
  const payload = buildFeatureProgress('u_feature_progress');
  const copresence = payload.services.find((service) => service.serviceId === 'copresence');

  assert.ok(copresence);
  assert.equal(payload.userId, 'u_feature_progress');
  assert.equal(copresence.status, 'planned');
  assert.equal(copresence.locked, true);
  assert.equal(copresence.progress.steps.length, 3);
  assert.equal(copresence.progress.steps[0].key, 'community_opt_in');
});

test('Community feature progress separates durable reporting from unavailable block enforcement', () => {
  const payload = buildFeatureProgress('u_community_safety_truth');

  for (const serviceId of ['thematic_communities', 'direct_messages', 'service_reviews']) {
    const service = payload.services.find((entry) => entry.serviceId === serviceId);
    assert.ok(service, `${serviceId} must stay visible in feature progress`);

    const byKey = new Map(service.progress.steps.map((step) => [step.key, step]));
    assert.equal(byKey.get('report_durable')?.state, 'done');
    assert.equal(byKey.get('block_enforcement')?.state, 'blocked');
    assert.equal(byKey.has('report_block'), false, 'report and block readiness must never be collapsed into one done step');
  }
});

test('prototype consent service preserves purpose/context for non-release tests', () => {
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

test('feature-progress route never invents a demo identity', async () => {
  const app = buildFeatureProgressApp();
  const response = await app.request('/api/feature-progress');

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.code, 'AUTHENTICATION_REQUIRED');
});

test('feature-progress route fails closed until durable state exists', async () => {
  const app = buildFeatureProgressApp({ userId: 'u_runtime_truth' });
  const response = await app.request('/api/feature-progress');

  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.code, FEATURE_PROGRESS_PERSISTENCE_CODE);
  assert.equal(body.operation, 'read_feature_progress');
});

test('consent mutation never claims durable success while persistence is unavailable', async () => {
  const app = buildFeatureProgressApp({ userId: 'u_runtime_truth' });
  const response = await app.request('/api/feature-progress/consents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      purpose: 'location_nearby_temp',
      status: 'accepted',
      context: 'unlock_copresence',
    }),
  });

  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.code, FEATURE_PROGRESS_PERSISTENCE_CODE);
  assert.equal(body.operation, 'record_consent');
});

test('community mutation never invents a demo identity when auth context is missing', async () => {
  const app = buildCommunityApp();

  const response = await app.request('/api/community/posts', {
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

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.code, 'AUTHENTICATION_REQUIRED');
});

test('community router rejects unauthenticated malformed writes before validation', async () => {
  const app = buildCommunityApp();
  const response = await app.request('/api/community/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ malformed: true }),
  });

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.code, 'AUTHENTICATION_REQUIRED');
});

test('community user block authority remains fail-closed while enforcement is not implemented', async () => {
  const app = buildCommunityApp({ userId: '22222222-2222-4222-8222-222222222222' });
  const response = await app.request('/api/community/blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetUserId: '33333333-3333-4333-8333-333333333333',
      reason: 'runtime truth boundary',
    }),
  });

  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.code, COMMUNITY_PERSISTENCE_CODE);
  assert.equal(body.operation, 'create_block');
  assert.notEqual(response.status, 201);
});
