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

test('sensor-summary ingestion bounds authority waits and preserves concurrent retry semantics', {
  skip: !integrationEnabled,
  timeout: 25_000,
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
  const dogId = randomUUID();
  const deviceId = randomUUID();
  const lockConnection = postgres(process.env.DATABASE_URL, { max: 1 });
  const pendingRequests = [];

  t.after(async () => {
    await Promise.allSettled(pendingRequests);
    await lockConnection.end();
    await db.delete(sensorSummaries).where(eq(sensorSummaries.dogId, dogId));
    await db.delete(devices).where(eq(devices.id, deviceId));
    await db.delete(dogs).where(eq(dogs.id, dogId));
    await db.delete(users).where(eq(users.id, ownerId));
  });

  await db.insert(users).values({
    id: ownerId,
    email: `sensor-liveness-${ownerId}@example.test`,
    passwordHash: 'integration-test-only',
    name: 'Sensor liveness Owner',
  });
  await db.insert(dogs).values({
    id: dogId,
    ownerId,
    name: 'Pixel',
    breed: 'Mixed',
    birthDate: '2022-03-01',
    sex: 'female',
    weight: 15.5,
    furClass: 'FC2',
  });
  await db.insert(devices).values({
    id: deviceId,
    dogId,
    type: 'TAG',
    macAddress: '02:00:00:00:92:01',
    firmwareVersion: '4.0.0',
  });

  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('userId', ownerId);
    await next();
  });
  app.route('/api/sensors', sensorRoutes);

  const makeSummary = (ingestionId, activityMinutes = 8) => ({
    timestamp: '2026-09-14T04:00:00.000Z',
    dogId,
    ingestionId,
    deviceId,
    source: 'TAG',
    activityMinutes,
    temperatureC: 20,
  });
  const post = (body) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  await t.test('a stale authority lock cannot strand ingestion indefinitely', async () => {
    const ingestionId = randomUUID();
    const payload = makeSummary(ingestionId);
    let pending;

    await lockConnection.begin(async (tx) => {
      const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
      await tx`SELECT id FROM dogs WHERE id = ${dogId} FOR UPDATE`;

      const startedAt = Date.now();
      pending = app.request('/api/sensors/summaries', post(payload));
      pendingRequests.push(pending);
      await waitForBlockedOperation(tx, pid);

      const response = await pending;
      const elapsedMs = Date.now() - startedAt;
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), {
        error: 'Product V1 database operation unavailable.',
        code: 'PRODUCT_DATABASE_OPERATION_UNAVAILABLE',
        operation: 'create_sensor_summary',
        retryable: true,
      });
      assert.ok(elapsedMs < 9_000, `authority wait should be bounded, observed ${elapsedMs}ms`);
    });

    const persisted = await db
      .select({ id: sensorSummaries.id })
      .from(sensorSummaries)
      .where(eq(sensorSummaries.ingestionId, ingestionId));
    assert.equal(persisted.length, 0, 'timed-out authority wait must not persist a summary');
  });

  await t.test('identical concurrent retries produce one row and one replay', async () => {
    const ingestionId = randomUUID();
    const payload = makeSummary(ingestionId);
    const requests = [
      app.request('/api/sensors/summaries', post(payload)),
      app.request('/api/sensors/summaries', post(payload)),
    ];
    pendingRequests.push(...requests);

    const responses = await Promise.all(requests);
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 201]);
    const bodies = await Promise.all(responses.map((response) => response.json()));
    assert.equal(new Set(bodies.map((body) => body.summary.id)).size, 1);
    assert.deepEqual(bodies.map((body) => body.idempotentReplay).sort(), [false, true]);

    const persisted = await db
      .select({ id: sensorSummaries.id })
      .from(sensorSummaries)
      .where(eq(sensorSummaries.ingestionId, ingestionId));
    assert.equal(persisted.length, 1);
  });

  await t.test('conflicting concurrent reuse produces one row and one explicit conflict', async () => {
    const ingestionId = randomUUID();
    const requests = [
      app.request('/api/sensors/summaries', post(makeSummary(ingestionId, 8))),
      app.request('/api/sensors/summaries', post(makeSummary(ingestionId, 9))),
    ];
    pendingRequests.push(...requests);

    const responses = await Promise.all(requests);
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
    const conflictResponse = responses.find((response) => response.status === 409);
    assert.ok(conflictResponse);
    assert.equal((await conflictResponse.json()).code, 'SENSOR_INGESTION_ID_CONFLICT');

    const persisted = await db
      .select({ id: sensorSummaries.id })
      .from(sensorSummaries)
      .where(eq(sensorSummaries.ingestionId, ingestionId));
    assert.equal(persisted.length, 1);
  });
});
