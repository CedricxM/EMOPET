import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

const integrationEnabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('dog CRUD persists and remains scoped to the authenticated owner', { skip: !integrationEnabled }, async () => {
  const [
    { dogs: dogRoutes, ABSENCE_COMPARISON_PERSISTENCE_CODE },
    { health: healthRoutes, HEALTH_PERSISTENCE_CODE },
    { db },
    { dogs: dogsTable, users },
  ] = await Promise.all([
    import('../dist/api/routes/dogs.js'),
    import('../dist/api/routes/health.js'),
    import('../dist/db/index.js'),
    import('../dist/db/schema/index.js'),
  ]);

  const ownerId = randomUUID();
  const otherUserId = randomUUID();
  const suffix = randomUUID();

  await db.insert(users).values([
    {
      id: ownerId,
      email: `dog-owner-${suffix}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Dog Owner',
    },
    {
      id: otherUserId,
      email: `other-owner-${suffix}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Other Owner',
    },
  ]);

  let currentUserId = ownerId;
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('userId', currentUserId);
    await next();
  });
  app.route('/api/dogs', dogRoutes);
  app.route('/api/health', healthRoutes);

  let dogId;
  try {
    const createResponse = await app.request('/api/dogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Nala',
        breed: 'Labrador Retriever',
        birthDate: '2022-04-12',
        sex: 'female',
        weight: 24.5,
        furClass: 'FC2',
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    dogId = created.dog.id;
    assert.equal(created.dog.ownerId, ownerId);
    assert.equal(created.dog.name, 'Nala');

    const listResponse = await app.request('/api/dogs');
    assert.equal(listResponse.status, 200);
    const listed = await listResponse.json();
    assert.ok(listed.dogs.some((dog) => dog.id === dogId));

    const getResponse = await app.request(`/api/dogs/${dogId}`);
    assert.equal(getResponse.status, 200);
    const fetched = await getResponse.json();
    assert.equal(fetched.dog.id, dogId);

    const absenceResponse = await app.request(`/api/dogs/${dogId}/absence-comparison?days=14`);
    assert.equal(absenceResponse.status, 503);
    const absenceBody = await absenceResponse.json();
    assert.equal(absenceBody.code, ABSENCE_COMPARISON_PERSISTENCE_CODE);
    assert.equal(absenceBody.operation, 'absence_comparison');

    const healthResponse = await app.request(`/api/health/${dogId}`);
    assert.equal(healthResponse.status, 503);
    const healthBody = await healthResponse.json();
    assert.equal(healthBody.code, HEALTH_PERSISTENCE_CODE);
    assert.equal(healthBody.operation, 'list_entries');

    const patchResponse = await app.request(`/api/dogs/${dogId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight: 25.2 }),
    });
    assert.equal(patchResponse.status, 200);
    const patched = await patchResponse.json();
    assert.equal(patched.dog.weight, 25.2);

    currentUserId = otherUserId;
    const crossOwnerResponse = await app.request(`/api/dogs/${dogId}`);
    assert.equal(crossOwnerResponse.status, 404);

    currentUserId = ownerId;
    const deleteResponse = await app.request(`/api/dogs/${dogId}`, { method: 'DELETE' });
    assert.equal(deleteResponse.status, 200);
    const deleted = await deleteResponse.json();
    assert.equal(deleted.deleted, true);
    dogId = undefined;
  } finally {
    if (dogId) {
      await db.delete(dogsTable).where(eq(dogsTable.id, dogId));
    }
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, otherUserId));
  }
});
