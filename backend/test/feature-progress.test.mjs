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

test('community create-post fails closed until durable Product V1 persistence exists', async () => {
  const app = buildCommunityApp({ userId: 'u_runtime_truth' });

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

  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.code, COMMUNITY_PERSISTENCE_CODE);
  assert.equal(body.operation, 'create_post');
  assert.notEqual(response.status, 201);
});

test('community rules acceptance does not claim durable success while persistence is unavailable', async () => {
  const app = buildCommunityApp({ userId: 'u_runtime_truth' });

  const response = await app.request('/api/community/rules/accept', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accepted: true }),
  });

  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.code, COMMUNITY_PERSISTENCE_CODE);
  assert.equal(body.operation, 'accept_rules');
});

test('community reads fail closed instead of returning placeholder empty success', async () => {
  const app = buildCommunityApp({ userId: 'u_runtime_truth' });

  const response = await app.request(`/api/community/${COMMUNITY_ID}/feed`);

  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.code, COMMUNITY_PERSISTENCE_CODE);
  assert.equal(body.operation, 'read_feed');
});
