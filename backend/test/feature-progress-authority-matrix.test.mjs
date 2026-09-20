import test from 'node:test';
import assert from 'node:assert/strict';

import { Hono } from 'hono';

import {
  featureProgress,
  FEATURE_PROGRESS_PERSISTENCE_CODE,
} from '../dist/api/routes/feature-progress.js';

const AUTHENTICATION_REQUIRED = {
  error: 'Authentication required.',
  code: 'AUTHENTICATION_REQUIRED',
};

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

async function assertUnauthenticated(response) {
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), AUTHENTICATION_REQUIRED);
}

async function assertPersistenceUnavailable(response, operation) {
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.code, FEATURE_PROGRESS_PERSISTENCE_CODE);
  assert.equal(body.operation, operation);
  assert.equal(body.retryable, false);
  assert.equal(body.maturity, 'NOT_IMPLEMENTED');
  assert.equal(JSON.stringify(body).includes('demo-user'), false);
  assert.notEqual(response.status, 200);
  assert.notEqual(response.status, 201);
}

const VALID_CONSENT = {
  purpose: 'location_nearby_temp',
  status: 'accepted',
  context: 'unlock_copresence',
};

const VALID_WAITLIST = {
  serviceId: 'copresence',
  channel: 'in_app',
};

test('INT-06 feature-progress matrix requires authenticated identity on every release surface', async () => {
  const app = buildFeatureProgressApp();

  await assertUnauthenticated(await app.request('/api/feature-progress'));
  await assertUnauthenticated(await app.request('/api/feature-progress/consents'));
  await assertUnauthenticated(await app.request('/api/feature-progress/consents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(VALID_CONSENT),
  }));
  await assertUnauthenticated(await app.request('/api/feature-progress/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(VALID_WAITLIST),
  }));
});

test('INT-06 feature-progress release surfaces fail closed after authentication while persistence is unavailable', async () => {
  const app = buildFeatureProgressApp({ userId: 'u_feature_progress_matrix' });

  await assertPersistenceUnavailable(
    await app.request('/api/feature-progress'),
    'read_feature_progress',
  );
  await assertPersistenceUnavailable(
    await app.request('/api/feature-progress/consents'),
    'list_consents',
  );
  await assertPersistenceUnavailable(
    await app.request('/api/feature-progress/consents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_CONSENT),
    }),
    'record_consent',
  );
  await assertPersistenceUnavailable(
    await app.request('/api/feature-progress/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_WAITLIST),
    }),
    'join_waitlist',
  );
});
