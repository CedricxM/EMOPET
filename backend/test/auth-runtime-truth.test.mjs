import test from 'node:test';
import assert from 'node:assert/strict';

import { Hono } from 'hono';
import {
  auth,
  AUTH_BACKEND_NOT_READY_CODE,
} from '../dist/api/routes/auth.js';

function buildApp() {
  const app = new Hono();
  app.route('/api/auth', auth);
  return app;
}

async function expectUnavailable(response, operation) {
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.code, AUTH_BACKEND_NOT_READY_CODE);
  assert.equal(body.operation, operation);
  assert.equal(body.maturity, 'NOT_IMPLEMENTED');
}

test('register does not return a synthetic success before auth backend integration', async () => {
  const response = await buildApp().request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'guardian@example.test',
      password: 'correct-horse-battery-staple',
      name: 'Guardian',
    }),
  });

  await expectUnavailable(response, 'register');
});

test('login does not return a synthetic success before auth backend integration', async () => {
  const response = await buildApp().request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'guardian@example.test',
      password: 'not-a-real-password',
    }),
  });

  await expectUnavailable(response, 'login');
});

test('refresh does not return a synthetic success before auth backend integration', async () => {
  const response = await buildApp().request('/api/auth/refresh', { method: 'POST' });
  await expectUnavailable(response, 'refresh');
});
