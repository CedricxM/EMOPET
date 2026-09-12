import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

const {
  DEFAULT_LOOKBACK_DAYS,
  parseLookbackWindow,
} = await import('../dist/api/utils/temporal-window.js');

const FIXED_NOW = new Date('2026-09-12T12:00:00.000Z');

test('presence lookback defaults to 14 days without selecting a product maximum', () => {
  const window = parseLookbackWindow(undefined, FIXED_NOW);
  assert.ok(window);
  assert.equal(DEFAULT_LOOKBACK_DAYS, 14);
  assert.equal(window.days, 14);
});

for (const [rawValue, expectedDays] of [
  ['1', 1],
  ['31', 31],
  ['365', 365],
  ['001', 1],
]) {
  test(`presence lookback accepts representable positive decimal days=${rawValue}`, () => {
    const window = parseLookbackWindow(rawValue, FIXED_NOW);
    assert.ok(window);
    assert.equal(window.days, expectedDays);
    assert.ok(Number.isFinite(window.since.getTime()));
  });
}

for (const invalidDays of [
  '0',
  '-1',
  '1.5',
  '1e2',
  'not-a-number',
  '',
  '   ',
  '9007199254740992',
  String(Number.MAX_SAFE_INTEGER),
]) {
  test(`presence lookback rejects invalid or unrepresentable days=${JSON.stringify(invalidDays)}`, () => {
    assert.equal(parseLookbackWindow(invalidDays, FIXED_NOW), null);
  });
}

const integrationEnabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('absence comparison preserves open lookback authority while runtime remains fail-closed', { skip: !integrationEnabled }, async () => {
  const [
    { dogs: dogRoutes, ABSENCE_COMPARISON_PERSISTENCE_CODE },
    { db },
    { dogs: dogsTable, users },
  ] = await Promise.all([
    import('../dist/api/routes/dogs.js'),
    import('../dist/db/index.js'),
    import('../dist/db/schema/index.js'),
  ]);

  const ownerId = randomUUID();
  const suffix = randomUUID();
  let dogId;

  await db.insert(users).values({
    id: ownerId,
    email: `presence-window-${suffix}@example.test`,
    passwordHash: 'integration-test-only',
    name: 'Presence Window Owner',
  });

  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('userId', ownerId);
    await next();
  });
  app.route('/api/dogs', dogRoutes);

  try {
    const createResponse = await app.request('/api/dogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Window',
        breed: 'Mixed',
        birthDate: '2022-01-01',
        sex: 'female',
        weight: 20,
        furClass: 'FC2',
      }),
    });
    assert.equal(createResponse.status, 201);
    dogId = (await createResponse.json()).dog.id;

    const longWindowResponse = await app.request(`/api/dogs/${dogId}/absence-comparison?days=31`);
    assert.equal(longWindowResponse.status, 503);
    assert.match(longWindowResponse.headers.get('cache-control') ?? '', /private/);
    assert.match(longWindowResponse.headers.get('cache-control') ?? '', /no-store/);
    const longWindowBody = await longWindowResponse.json();
    assert.equal(longWindowBody.code, ABSENCE_COMPARISON_PERSISTENCE_CODE);
    assert.equal(longWindowBody.operation, 'absence_comparison');
    assert.equal(longWindowBody.maturity, 'NOT_IMPLEMENTED');

    const invalidWindowResponse = await app.request(`/api/dogs/${dogId}/absence-comparison?days=0`);
    assert.equal(invalidWindowResponse.status, 400);
    const invalidWindowBody = await invalidWindowResponse.json();
    assert.equal(invalidWindowBody.error, 'invalid_presence_window');
    assert.equal(invalidWindowBody.parameter, 'days');
  } finally {
    if (dogId) {
      await db.delete(dogsTable).where(eq(dogsTable.id, dogId));
    }
    await db.delete(users).where(eq(users.id, ownerId));
  }
});
