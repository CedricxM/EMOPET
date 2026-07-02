import test from 'node:test';
import assert from 'node:assert/strict';

import { Hono } from 'hono';

import {
  buildFeatureProgress,
  getConsentRecordsForUser,
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

test('community UGC creation is blocked until rules are accepted', async () => {
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

  const allowedResponse = await app.request('/api/community/posts', {
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

  assert.equal(allowedResponse.status, 201);
});
