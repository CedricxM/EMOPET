import test from 'node:test';
import assert from 'node:assert/strict';

import { Hono } from 'hono';
import { featureProgress } from '../dist/api/routes/feature-progress.js';

function makeApp(userId) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    if (userId) c.set('userId', userId);
    await next();
  });
  app.route('/feature-progress', featureProgress);
  return app;
}

test('feature-progress routes fail closed without an authenticated identity', async () => {
  const app = makeApp(null);

  const progress = await app.request('/feature-progress');
  assert.equal(progress.status, 401);
  assert.deepEqual(await progress.json(), { error: 'unauthorized' });

  const consents = await app.request('/feature-progress/consents');
  assert.equal(consents.status, 401);
  assert.deepEqual(await consents.json(), { error: 'unauthorized' });

  const createConsent = await app.request('/feature-progress/consents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      purpose: 'community_opt_in',
      status: 'accepted',
      context: 'test_only',
    }),
  });
  assert.equal(createConsent.status, 401);
  assert.deepEqual(await createConsent.json(), { error: 'unauthorized' });

  const waitlist = await app.request('/feature-progress/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceId: 'meetups' }),
  });
  assert.equal(waitlist.status, 401);
  assert.deepEqual(await waitlist.json(), { error: 'unauthorized' });
});

test('feature-progress state remains isolated by explicit user identity', async () => {
  const appA = makeApp('user-a');
  const appB = makeApp('user-b');

  const accepted = await appA.request('/feature-progress/consents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      purpose: 'community_opt_in',
      status: 'accepted',
      context: 'test_only',
    }),
  });
  assert.equal(accepted.status, 201);
  const acceptedPayload = await accepted.json();
  assert.equal(acceptedPayload.userId, 'user-a');

  const recordsA = await appA.request('/feature-progress/consents');
  assert.equal(recordsA.status, 200);
  const payloadA = await recordsA.json();
  assert.equal(payloadA.userId, 'user-a');
  assert.equal(payloadA.consents.length, 1);

  const recordsB = await appB.request('/feature-progress/consents');
  assert.equal(recordsB.status, 200);
  const payloadB = await recordsB.json();
  assert.equal(payloadB.userId, 'user-b');
  assert.equal(payloadB.consents.length, 0);
});
