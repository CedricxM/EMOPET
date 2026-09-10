import test from 'node:test';
import assert from 'node:assert/strict';

import { Hono } from 'hono';
import { dataExport } from '../dist/api/routes/data-export.js';

const DOG_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';

function makeApp() {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('userId', USER_ID);
    await next();
  });
  app.route('/data-export', dataExport);
  return app;
}

test('export router rejects missing identity before database access', async () => {
  const app = new Hono();
  app.route('/data-export', dataExport);
  for (const path of [`/data-export?dog_id=${DOG_ID}`, '/data-export/capabilities']) {
    const response = await app.request(path);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(await response.json(), { error: 'unauthorized' });
  }
});

test('malformed dog identity cannot reach PostgreSQL or an attachment filename', async () => {
  const response = await makeApp().request('/data-export?dog_id=not-a-uuid&format=csv');
  assert.equal(response.status, 400);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('content-disposition'), null);
  assert.deepEqual(await response.json(), { error: 'invalid_dog_id' });
});

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
