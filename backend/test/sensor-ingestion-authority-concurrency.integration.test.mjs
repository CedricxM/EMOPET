import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import postgres from 'postgres';

const integrationEnabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

async function waitForBlockedOperation(tx, blockerPid) {
  const deadline = Date.now() + 4_000;
  while (Date.now() < deadline) {
    await tx`SELECT pg_stat_clear_snapshot()`;
    const [row] = await tx`
      SELECT count(*)::int AS count
      FROM pg_stat_activity
      WHERE ${blockerPid} = ANY(pg_blocking_pids(pid))
    `;
    if (row.count >= 1) return;
    await delay(10);
  }
  assert.fail('Expected sensor ingestion to wait on the authority row lock');
}

test('sensor-summary mutation holds current Owner and device binding authority through persistence', {
  skip: !integrationEnabled,
  timeout: 20_000,
}, async (t) => {
  const [
    { db },
    { devices, dogs, sensorSummaries, users },
    { sensors: sensorRoutes },
  ] = await Promise.all([
    import('../dist/db/index.js'),
    import('../dist/db/schema/index.js'),
    import('../dist/api/routes/sensors.js'),
  ]);

  const ownerId = randomUUID();
  const nextOwnerId = randomUUID();
  const dogId = randomUUID();
  const otherDogId = randomUUID();
  const deviceId = randomUUID();
  const lockConnection = postgres(process.env.DATABASE_URL, { max: 1 });
  const pendingRequests = [];

  t.after(async () => {
    await Promise.allSettled(pendingRequests);
    await lockConnection.end();
    await db.delete(sensorSummaries).where(eq(sensorSummaries.dogId, dogId));
    await db.delete(sensorSummaries).where(eq(sensorSummaries.dogId, otherDogId));
    await db.delete(devices).where(eq(devices.id, deviceId));
    await db.delete(dogs).where(eq(dogs.id, dogId));
    await db.delete(dogs).where(eq(dogs.id, otherDogId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, nextOwnerId));
  });

  await db.insert(users).values([
    {
      id: ownerId,
      email: `sensor-race-owner-${ownerId}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Sensor race Owner',
    },
    {
      id: nextOwnerId,
      email: `sensor-race-next-${nextOwnerId}@example.test`,
      passwordHash: 'integration-test-only',
      name: 'Sensor race next Owner',
    },
  ]);
  await db.insert(dogs).values([
    {
      id: dogId,
      ownerId,
      name: 'Nala',
      breed: 'Mixed',
      birthDate: '2021-05-01',
      sex: 'female',
      weight: 20,
      furClass: 'FC2',
    },
    {
      id: otherDogId,
      ownerId: nextOwnerId,
      name: 'Milo',
      breed: 'Mixed',
      birthDate: '2020-06-01',
      sex: 'male',
      weight: 17,
      furClass: 'FC2',
    },
  ]);
  await db.insert(devices).values({
    id: deviceId,
    dogId,
    type: 'TAG',
    macAddress: '02:00:00:00:91:01',
    firmwareVersion: '3.1.4',
  });

  let currentUserId = ownerId;
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('userId', currentUserId);
    await next();
  });
  app.route('/api/sensors', sensorRoutes);

  const summary = () => ({
    timestamp: new Date().toISOString(),
    dogId,
    ingestionId: randomUUID(),
    deviceId,
    source: 'TAG',
    activityMinutes: 8,
    temperatureC: 20,
  });
  const post = (body) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  await t.test('ownership transfer that wins the row lock denies the former Owner before insert', async () => {
    const payload = summary();
    let pending;
    try {
      await lockConnection.begin(async (tx) => {
        const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
        await tx`UPDATE dogs SET owner_id = ${nextOwnerId} WHERE id = ${dogId}`;

        pending = app.request('/api/sensors/summaries', post(payload));
        pendingRequests.push(pending);
        await waitForBlockedOperation(tx, pid);
      });

      const response = await pending;
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { error: 'not_found' });

      const persisted = await db
        .select({ id: sensorSummaries.id })
        .from(sensorSummaries)
        .where(eq(sensorSummaries.ingestionId, payload.ingestionId));
      assert.equal(persisted.length, 0, 'former Owner request must not persist after transfer wins');
    } finally {
      await Promise.allSettled(pending ? [pending] : []);
      await db.update(dogs).set({ ownerId }).where(eq(dogs.id, dogId));
    }
  });

  await t.test('device rebinding that wins the row lock invalidates the stale device attribution', async () => {
    const payload = summary();
    let pending;
    try {
      await lockConnection.begin(async (tx) => {
        const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
        await tx`UPDATE devices SET dog_id = ${otherDogId} WHERE id = ${deviceId}`;

        pending = app.request('/api/sensors/summaries', post(payload));
        pendingRequests.push(pending);
        await waitForBlockedOperation(tx, pid);
      });

      const response = await pending;
      assert.equal(response.status, 400);
      const body = await response.json();
      assert.equal(body.code, 'SENSOR_DEVICE_BINDING_INVALID');

      const persisted = await db
        .select({ id: sensorSummaries.id })
        .from(sensorSummaries)
        .where(eq(sensorSummaries.ingestionId, payload.ingestionId));
      assert.equal(persisted.length, 0, 'stale device binding must not be persisted');
    } finally {
      await Promise.allSettled(pending ? [pending] : []);
      await db.update(devices).set({ dogId }).where(eq(devices.id, deviceId));
    }
  });

  await t.test('authority lock held beyond the route timeout fails closed without persistence', async () => {
    const payload = summary();
    let response;

    await lockConnection.begin(async (tx) => {
      const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
      await tx`UPDATE dogs SET owner_id = ${ownerId} WHERE id = ${dogId}`;

      const pending = app.request('/api/sensors/summaries', post(payload));
      pendingRequests.push(pending);
      await waitForBlockedOperation(tx, pid);

      response = await Promise.race([
        pending,
        delay(8_000).then(() => {
          assert.fail('sensor ingestion exceeded bounded lock/statement timeout');
        }),
      ]);

      assert.equal(response.status, 503);
      const body = await response.json();
      assert.equal(body.code, 'PRODUCT_DATABASE_OPERATION_UNAVAILABLE');
      assert.equal(body.operation, 'create_sensor_summary');
      assert.equal(body.retryable, true);
    });

    const persisted = await db
      .select({ id: sensorSummaries.id })
      .from(sensorSummaries)
      .where(eq(sensorSummaries.ingestionId, payload.ingestionId));
    assert.equal(persisted.length, 0, 'timed-out authority wait must persist nothing');
  });

  await t.test('stable authority still persists and snapshots server-side firmware', async () => {
    const payload = summary();
    const response = await app.request('/api/sensors/summaries', post(payload));
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.summary.dogId, dogId);
    assert.equal(body.summary.deviceId, deviceId);
    assert.equal(body.summary.firmwareVersionAtIngest, '3.1.4');
    assert.equal(body.idempotentReplay, false);
  });
});
