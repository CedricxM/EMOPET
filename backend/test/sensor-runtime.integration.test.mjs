import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

import {
  sensors as sensorRoutes,
  PRESENCE_PERSISTENCE_NOT_READY,
  ELI_RUNTIME_NOT_IMPLEMENTED,
} from '../dist/api/routes/sensors.js';
import { db } from '../dist/db/index.js';
import { baselines, dogs, eliStates, sensorSummaries, users } from '../dist/db/schema/index.js';

const integrationEnabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('sensor summaries persist while raw payloads and non-durable presence fail closed', { skip: !integrationEnabled }, async () => {
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
    const validSummary = {
      timestamp: new Date().toISOString(),
      dogId,
      source: 'TAG',
      activityMinutes: 12.5,
      vocalEvents: 2,
      vocalEnergyMean: 18.4,
      agitationEvents: 1,
      temperatureC: 19.2,
      humidityPct: 63,
    };
    const createResponse = await app.request('/api/sensors/summaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validSummary),
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    assert.equal(created.summary.dogId, dogId);
    assert.equal(created.summary.source, 'TAG');

    const listResponse = await app.request(`/api/sensors/summaries/${dogId}?range=24h`);
    assert.equal(listResponse.status, 200);
    const listed = await listResponse.json();
    assert.ok(listed.summaries.some((summary) => summary.id === created.summary.id));

    const rawAudioSentinel = `raw-household-audio-${randomUUID()}`;
    for (const forbiddenPayload of [
      { rawAudio: rawAudioSentinel },
      { audioBase64: Buffer.from(rawAudioSentinel).toString('base64') },
      { pcm: [0, 1, -1, 32767] },
    ]) {
      const forbiddenResponse = await app.request('/api/sensors/summaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validSummary, ...forbiddenPayload }),
      });
      assert.equal(forbiddenResponse.status, 400, 'unknown raw sensor fields must be rejected at ingress');
    }

    const persistedAfterRejectedRawAudio = await db
      .select({ id: sensorSummaries.id })
      .from(sensorSummaries)
      .where(eq(sensorSummaries.dogId, dogId));
    assert.deepEqual(
      persistedAfterRejectedRawAudio.map((row) => row.id),
      [created.summary.id],
      'rejected raw-audio payloads must not create any sensor summary row',
    );

    // Historical persisted rows are not an authoritative live ELI producer.
    await db.insert(eliStates).values({
      dogId, timestamp: new Date(), arousal: 0.7, valence: -0.4,
      load: 72, confidence: 0.9, gateStatus: 'PUBLISH', sensorReliability: {},
    });
    for (const [path, operation] of [
      [`/api/sensors/eli/${dogId}`, 'get_latest_eli_state'],
      [`/api/sensors/eli/${dogId}/history`, 'list_eli_history'],
    ]) {
      const response = await app.request(path);
      assert.equal(response.status, 501);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.deepEqual(await response.json(), {
        error: 'eli_runtime_not_implemented', code: ELI_RUNTIME_NOT_IMPLEMENTED,
        dogId, operation, maturity: 'NOT_IMPLEMENTED', retryable: false,
      });
    }

    await db.insert(baselines).values({
      dogId, startedAt: new Date(), validHours: 24, established: 1,
      metrics: { valence: -0.4, nested: { internalOnly: 'must-not-be-disclosed' } },
    });
    const baselineResponse = await app.request(`/api/sensors/baseline/${dogId}`);
    assert.equal(baselineResponse.status, 200);
    const baselineBody = await baselineResponse.json();
    assert.equal(baselineBody.baseline.dogId, dogId);
    assert.equal(baselineBody.baseline.validHours, 24);
    assert.equal(baselineBody.baseline.metricsStatus, 'WITHHELD_PENDING_DISCLOSURE_AUTHORITY');
    assert.equal('metrics' in baselineBody.baseline, false);
    assert.equal(JSON.stringify(baselineBody).includes('must-not-be-disclosed'), false);

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
    for (const path of [
      `/api/sensors/eli/${dogId}`, `/api/sensors/eli/${dogId}/history`,
      `/api/sensors/baseline/${dogId}`,
    ]) {
      assert.equal((await app.request(path)).status, 404);
    }
  } finally {
    await db.delete(baselines).where(eq(baselines.dogId, dogId));
    await db.delete(eliStates).where(eq(eliStates.dogId, dogId));
    await db.delete(sensorSummaries).where(eq(sensorSummaries.dogId, dogId));
    await db.delete(dogs).where(eq(dogs.id, dogId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, otherUserId));
  }
});
