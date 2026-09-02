import test from 'node:test';
import assert from 'node:assert/strict';

import { Hono } from 'hono';
import { dataExport } from '../dist/api/routes/data-export.js';

const DOG_ID = '11111111-1111-4111-8111-111111111111';

function makeApp() {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('userId', '22222222-2222-4222-8222-222222222222');
    await next();
  });
  app.route('/data-export', dataExport);
  return app;
}

test('invalid from bound fails before export scope can widen', async () => {
  const response = await makeApp().request(
    `/data-export?dog_id=${DOG_ID}&from=not-a-date`,
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid_from' });
});

test('invalid to bound fails before export scope can widen', async () => {
  const response = await makeApp().request(
    `/data-export?dog_id=${DOG_ID}&to=definitely-not-a-date`,
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid_to' });
});

test('reversed export interval fails closed', async () => {
  const response = await makeApp().request(
    `/data-export?dog_id=${DOG_ID}&from=2026-09-02T12:00:00.000Z&to=2026-09-01T12:00:00.000Z`,
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: 'invalid_interval',
    reason: 'from_after_to',
  });
});
