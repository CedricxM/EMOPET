import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import postgres from 'postgres';

import {
  sensors as sensorRoutes,
  SENSOR_PROVENANCE_REQUIRED,
  SENSOR_SOURCE_FIELDS_INVALID,
} from '../dist/api/routes/sensors.js';
import { db } from '../dist/db/index.js';
import { devices, dogs, sensorSummaries, users } from '../dist/db/schema/index.js';

const integrationEnabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('fresh sensor-summary schema enforces canonical durable provenance', { skip: !integrationEnabled }, async () => {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    const columns = await sql`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sensor_summaries'
        AND column_name IN ('ingestion_id', 'device_id', 'firmware_version_at_ingest')
      ORDER BY column_name
    `;

    const byName = Object.fromEntries(columns.map((row) => [row.column_name, row.is_nullable]));
    assert.equal(byName.ingestion_id, 'NO');
    assert.equal(byName.device_id, 'NO');
    assert.equal(byName.firmware_version_at_ingest, 'YES');

    const [uniqueRow] = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM pg_index i
        JOIN pg_class t ON t.oid = i.indrelid
        JOIN pg_class idx ON idx.oid = i.indexrelid
        WHERE t.oid = 'public.sensor_summaries'::regclass
          AND i.indisunique
          AND pg_get_indexdef(idx.oid) LIKE '%(ingestion_id)%'
      ) AS present
    `;
    assert.equal(uniqueRow.present, true, 'ingestion_id must be structurally unique');

    const [deviceFk] = await sql`
      SELECT c.confdeltype
      FROM pg_constraint c
      JOIN pg_attribute a
        ON a.attrelid = c.conrelid
       AND a.attnum = ANY(c.conkey)
      WHERE c.contype = 'f'
        AND c.conrelid = 'public.sensor_summaries'::regclass
        AND c.confrelid = 'public.devices'::regclass
        AND a.attname = 'device_id'
      LIMIT 1
    `;
    assert.equal(deviceFk?.confdeltype, 'a', 'device provenance FK must fail closed with NO ACTION');
  } finally {
    await sql.end();
  }
});

test('sensor summaries persist only with canonical provenance and retry idempotently across firmware registry changes', {
  skip: !integrationEnabled,
}, async () => {
  const ownerId = randomUUID();
  const otherUserId = randomUUID();
  const dogId = randomUUID();
  const tagDeviceId = randomUUID();
  const matDeviceId = randomUUID();
  const ingestionId = randomUUID();
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

  await db.insert(devices).values([
    {
      id: tagDeviceId,
      dogId,
      type: 'TAG',
      macAddress: '02:00:00:00:03:01',
      firmwareVersion: '1.2.3',
    },
    {
      id: matDeviceId,
      dogId,
      type: 'MAT',
      macAddress: '02:00:00:00:03:02',
      firmwareVersion: '2.0.0',
    },
  ]);

  let currentUserId = ownerId;
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('userId', currentUserId);
    await next();
  });
  app.route('/api/sensors', sensorRoutes);

  const postSummary = (body) => app.request('/api/sensors/summaries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const validSummary = {
    timestamp: new Date().toISOString(),
    dogId,
    ingestionId,
    deviceId: tagDeviceId,
    source: 'TAG',
    activityMinutes: 12.5,
    vocalEvents: 2,
    vocalEnergyMean: 18.4,
    agitationEvents: 1,
    temperatureC: 19.2,
    humidityPct: 63,
  };

  try {
    for (const incomplete of [
      { ...validSummary, ingestionId: undefined },
      { ...validSummary, deviceId: undefined },
    ]) {
      const response = await postSummary(incomplete);
      assert.equal(response.status, 400);
      assert.equal((await response.json()).code, SENSOR_PROVENANCE_REQUIRED);
    }

    const crossSource = await postSummary({
      ...validSummary,
      ingestionId: randomUUID(),
      matPresenceMinutes: 5,
    });
    assert.equal(crossSource.status, 400);
    assert.equal((await crossSource.json()).code, SENSOR_SOURCE_FIELDS_INVALID);

    const unknownDevice = await postSummary({
      ...validSummary,
      ingestionId: randomUUID(),
      deviceId: randomUUID(),
    });
    assert.equal(unknownDevice.status, 400);
    assert.equal((await unknownDevice.json()).code, 'SENSOR_DEVICE_BINDING_INVALID');

    const mismatchedSource = await postSummary({
      ...validSummary,
      ingestionId: randomUUID(),
      deviceId: matDeviceId,
    });
    assert.equal(mismatchedSource.status, 400);
    assert.equal((await mismatchedSource.json()).code, 'SENSOR_DEVICE_BINDING_INVALID');

    const rejectedUnknownField = await postSummary({
      ...validSummary,
      ingestionId: randomUUID(),
      rawAudio: 'must-never-hitchhike',
    });
    assert.equal(rejectedUnknownField.status, 400);

    const createdResponse = await postSummary(validSummary);
    assert.equal(createdResponse.status, 201);
    assert.equal(createdResponse.headers.get('cache-control'), 'private, no-store');
    const created = await createdResponse.json();
    assert.equal(created.idempotentReplay, false);
    assert.equal(created.summary.dogId, dogId);
    assert.equal(created.summary.deviceId, tagDeviceId);
    assert.equal(created.summary.ingestionId, ingestionId);
    assert.equal(created.summary.firmwareVersionAtIngest, '1.2.3');
    assert.ok(created.summary.createdAt);
    assert.notEqual(created.summary.createdAt, validSummary.timestamp);

    await db.update(devices)
      .set({ firmwareVersion: '9.9.9' })
      .where(eq(devices.id, tagDeviceId));

    const retryResponse = await postSummary(validSummary);
    assert.equal(retryResponse.status, 200);
    const retried = await retryResponse.json();
    assert.equal(retried.idempotentReplay, true);
    assert.equal(retried.summary.id, created.summary.id);
    assert.equal(
      retried.summary.firmwareVersionAtIngest,
      '1.2.3',
      'retry must preserve the original server-side firmware snapshot',
    );

    const conflictingRetry = await postSummary({ ...validSummary, activityMinutes: 13.5 });
    assert.equal(conflictingRetry.status, 409);
    assert.equal((await conflictingRetry.json()).code, 'SENSOR_INGESTION_ID_CONFLICT');

    const listedResponse = await app.request(`/api/sensors/summaries/${dogId}?range=24h`);
    assert.equal(listedResponse.status, 200);
    const listed = await listedResponse.json();
    assert.ok(listed.summaries.some((summary) => summary.id === created.summary.id));

    const badRange = await app.request(`/api/sensors/summaries/${dogId}?range=forever`);
    assert.equal(badRange.status, 400);

    currentUserId = otherUserId;
    const crossOwner = await app.request(`/api/sensors/summaries/${dogId}?range=24h`);
    assert.equal(crossOwner.status, 404);

    const persisted = await db
      .select({ id: sensorSummaries.id })
      .from(sensorSummaries)
      .where(eq(sensorSummaries.dogId, dogId));
    assert.deepEqual(persisted.map((row) => row.id), [created.summary.id]);
  } finally {
    await db.delete(sensorSummaries).where(eq(sensorSummaries.dogId, dogId));
    await db.delete(devices).where(eq(devices.dogId, dogId));
    await db.delete(dogs).where(eq(dogs.id, dogId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, otherUserId));
  }
});
