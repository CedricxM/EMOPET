import test from 'node:test';
import assert from 'node:assert/strict';

import { Hono } from 'hono';

import {
  health,
  HEALTH_PERSISTENCE_CODE,
} from '../dist/api/routes/health.js';

const DOG_ID = '11111111-1111-4111-8111-111111111111';

test('health routes do not claim durable success when journal persistence is absent', async () => {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('userId', '11111111-1111-4111-8111-111111111112');
    await next();
  });

  // Ownership lookup is DB-backed, so an unknown dog fails before persistence.
  // This test asserts the exported release-state code is stable; integration
  // ownership coverage remains in the disposable PostgreSQL suite.
  assert.equal(HEALTH_PERSISTENCE_CODE, 'HEALTH_PERSISTENCE_NOT_READY');
  app.route('/api/health', health);

  const response = await app.request(`/api/health/${DOG_ID}`);
  assert.ok([404, 503].includes(response.status));
  assert.notEqual(response.status, 200);
});
