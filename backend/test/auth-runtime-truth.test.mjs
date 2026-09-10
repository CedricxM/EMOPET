import test from 'node:test';
import assert from 'node:assert/strict';

import { Hono } from 'hono';
import { auth } from '../dist/api/routes/auth.js';

function buildApp() {
  const app = new Hono();
  app.route('/api/auth', auth);
  return app;
}

async function expectRejectedWithoutSession(response, expectedStatus = 400) {
  assert.equal(response.status, expectedStatus);
  const body = await response.json();
  assert.equal(body.accessToken, undefined);
  assert.equal(body.refreshToken, undefined);
}

test('register rejects malformed input before any account/session success', async () => {
  const response = await buildApp().request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email', password: 'short', name: '' }),
  });

  await expectRejectedWithoutSession(response);
});

test('login rejects malformed input before any authenticated-session success', async () => {
  const response = await buildApp().request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email', password: '' }),
  });

  await expectRejectedWithoutSession(response);
});

test('refresh rejects a missing refresh credential without rotating a session', async () => {
  const response = await buildApp().request('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  await expectRejectedWithoutSession(response);
});

test('logout rejects a malformed refresh credential before revocation', async () => {
  const response = await buildApp().request('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: 'too-short' }),
  });

  await expectRejectedWithoutSession(response);
});

test('logout-all remains protected by the bearer access-token boundary', async () => {
  const response = await buildApp().request('/api/auth/logout-all', { method: 'POST' });

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.match(body.error, /Authorization/i);
});
