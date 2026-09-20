import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';

const enabled = Boolean(process.env.DATABASE_URL);

test('auth middleware preserves downstream error ownership', { skip: !enabled }, async () => {
  process.env.NODE_ENV = 'test';

  const { authMiddleware, signAccessToken } = await import('../dist/api/middleware/auth.js');

  const app = new Hono();
  app.onError((_error, c) => c.json({ error: 'internal_server_error' }, 500));
  app.use('/api/*', authMiddleware);
  app.get('/api/downstream-failure', () => {
    throw new Error('test-only downstream detail');
  });

  const validToken = await signAccessToken('11111111-1111-4111-8111-111111111111');

  const downstreamFailure = await app.request('/api/downstream-failure', {
    headers: { Authorization: `Bearer ${validToken}` },
  });

  assert.equal(downstreamFailure.status, 500);
  assert.deepEqual(await downstreamFailure.json(), { error: 'internal_server_error' });

  const invalidToken = await app.request('/api/downstream-failure', {
    headers: { Authorization: 'Bearer invalid-token' },
  });

  assert.equal(invalidToken.status, 401);
  assert.deepEqual(await invalidToken.json(), { error: 'Invalid or expired token' });

  const missingToken = await app.request('/api/downstream-failure');
  assert.equal(missingToken.status, 401);
  assert.deepEqual(await missingToken.json(), { error: 'Missing or invalid Authorization header' });
});
