import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

const integrationEnabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('health journal create/read is durable and owner scoped while reminder policy stays gated', { skip: !integrationEnabled }, async () => {
  const [
    {
      health,
      HEALTH_REMINDER_POLICY_NOT_READY,
    },
    { db },
    { dogs, healthEntries, users },
  ] = await Promise.all([
    import('../dist/api/routes/health.js'),
    import('../dist/db/index.js'),
    import('../dist/db/schema/index.js'),
  ]);

  const ownerId = randomUUID();
  const otherUserId = randomUUID();
  const dogId = randomUUID();
  const suffix = randomUUID();

  await db.insert(users).values([
    {
      id: ownerId,
      email: `health-owner-${suffix}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Health Owner',
    },
    {
      id: otherUserId,
      email: `health-other-${suffix}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Health Other',
    },
  ]);

  await db.insert(dogs).values({
    id: dogId,
    ownerId,
    name: 'Nala Health',
    breed: 'Labrador Retriever',
    birthDate: '2022-04-12',
    sex: 'female',
    weight: 24.5,
    furClass: 'FC2',
  });

  let currentUserId = ownerId;
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('userId', currentUserId);
    await next();
  });
  app.route('/api/health', health);

  let entryId;
  try {
    const createResponse = await app.request('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dogId,
        type: 'weight',
        date: '2026-09-10',
        title: 'Pesée volontaire du Guardian',
        details: 'Entrée de journal déclarative, sans interprétation clinique.',
        value: 24.7,
        nextDueDate: '2026-10-10',
      }),
    });

    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.headers.get('cache-control'), 'private, no-store');
    const createBody = await createResponse.json();
    entryId = createBody.entry.id;
    assert.equal(createBody.entry.dogId, dogId);
    assert.equal(createBody.entry.type, 'weight');
    assert.equal(createBody.entry.date, '2026-09-10');
    assert.equal(createBody.entry.title, 'Pesée volontaire du Guardian');
    assert.equal(createBody.entry.value, 24.7);
    assert.equal(createBody.entry.nextDueDate, '2026-10-10');

    const [stored] = await db
      .select()
      .from(healthEntries)
      .where(eq(healthEntries.id, entryId))
      .limit(1);
    assert.ok(stored);
    assert.equal(stored.dogId, dogId);
    assert.equal(stored.date, '2026-09-10');
    assert.equal(stored.value, 24.7);

    const listResponse = await app.request(`/api/health/${dogId}`);
    assert.equal(listResponse.status, 200);
    assert.equal(listResponse.headers.get('cache-control'), 'private, no-store');
    const listBody = await listResponse.json();
    assert.equal(listBody.dogId, dogId);
    assert.ok(listBody.entries.some((entry) => entry.id === entryId));

    currentUserId = otherUserId;

    const crossOwnerList = await app.request(`/api/health/${dogId}`);
    assert.equal(crossOwnerList.status, 404);

    const crossOwnerCreate = await app.request('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dogId,
        type: 'note',
        date: '2026-09-11',
        title: 'Must not persist',
      }),
    });
    assert.equal(crossOwnerCreate.status, 404);

    const rowsAfterDeniedWrite = await db
      .select()
      .from(healthEntries)
      .where(eq(healthEntries.dogId, dogId));
    assert.equal(rowsAfterDeniedWrite.length, 1);

    currentUserId = ownerId;

    const remindersResponse = await app.request(`/api/health/${dogId}/reminders`);
    assert.equal(remindersResponse.status, 503);
    assert.equal(remindersResponse.headers.get('cache-control'), 'private, no-store');
    const remindersBody = await remindersResponse.json();
    assert.equal(remindersBody.code, HEALTH_REMINDER_POLICY_NOT_READY);
    assert.equal(remindersBody.operation, 'list_reminders');
    assert.equal(remindersBody.retryable, false);
  } finally {
    await db.delete(healthEntries).where(eq(healthEntries.dogId, dogId));
    await db.delete(dogs).where(eq(dogs.id, dogId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, otherUserId));
  }
});
