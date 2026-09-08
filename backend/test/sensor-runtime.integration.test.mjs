import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

import {
  sensors as sensorRoutes,
  PRESENCE_PERSISTENCE_NOT_READY,
} from '../dist/api/routes/sensors.js';
import { db } from '../dist/db/index.js';
import { dogs, sensorSummaries, users } from '../dist/db/schema/index.js';

const integrationEnabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('sensor summaries persist while non-durable presence fails closed', { skip: !integrationEnabled }, async () => {
  const ownerId = randomUUID();
  const otherUserId = randomUUID();
  const dogId = randomUUID();
  const suffix = randomUUID();

  await db.insert(users).values([
    {
      id: ownerId,
      email: `sensor-owner-${suffix}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Sensor Owner',
    },
    {
      id: otherUserId,
      email: `sensor-other-${suffix}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Sensor Other',
    },
  ]);
  await db.insert(dogs).values({
    id: dogId,
    ownerId,
    name: 'Moka',
    breed: 'Mixed',
    birthDate: '2021-05-01',
    sex: 'male',
    weight: 18.4,
    furClass: 'FC2',
  });

  let currentUserId = ownerId;
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('userId', currentUserId);
    await next();
  });
  app.route('/api/sensors', sensorRoutes);

  try {
    const createResponse = await app.request('/api/sensors/summaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        dogId,
        source: 'TAG',
        activityMinutes: 12.5,
        vocalEvents: 2,
        agitationEvents: 1,
        temperatureC: 19.2,
        humidityPct: 63,
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    assert.equal(created.summary.dogId, dogId);
    assert.equal(created.summary.source, 'TAG');

    const listResponse = await app.request(`/api/sensors/summaries/${dogId}?range=24h`);
    assert.equal(listResponse.status, 200);
    const listed = await listResponse.json();
    assert.ok(listed.summaries.some((summary) => summary.id === created.summary.id));

    const latestEliResponse = await app.request(`/api/sensors/eli/${dogId}`);
    assert.equal(latestEliResponse.status, 200);
    const latestEli = await latestEliResponse.json();
    assert.equal(latestEli.eli, null);

    const presenceResponse = await app.request(`/api/sensors/presence/${dogId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dogId,
        phoneSeen: true,
        timestamp: new Date().toISOString(),
        source: 'phone_passive',
      }),
    });
    assert.equal(presenceResponse.status, 503);
    const presenceBody = await presenceResponse.json();
    assert.equal(presenceBody.code, PRESENCE_PERSISTENCE_NOT_READY);

    currentUserId = otherUserId;
    const crossOwnerResponse = await app.request(`/api/sensors/summaries/${dogId}?range=24h`);
    assert.equal(crossOwnerResponse.status, 404);
  } finally {
    await db.delete(sensorSummaries).where(eq(sensorSummaries.dogId, dogId));
    await db.delete(dogs).where(eq(dogs.id, dogId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, otherUserId));
  }
});
