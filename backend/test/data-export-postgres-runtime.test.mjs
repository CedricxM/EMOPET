import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
const runtimeTest = databaseUrl ? test : test.skip;

async function loadRoute() {
  return (await import('../dist/api/routes/data-export.js')).dataExport;
}

function appFor(dataExport, userId) {
  const app = new Hono();
  app.use('/api/data-export/*', async (c, next) => {
    c.set('userId', userId);
    await next();
  });
  app.route('/api/data-export', dataExport);
  return app;
}

runtimeTest('INT-04A runtime export enforces ownership, publication projection, CSV parity and temporal fail-closed behavior', async (t) => {
  const sql = postgres(databaseUrl, { max: 1 });
  t.after(async () => { await sql.end({ timeout: 1 }); });

  const ownerA = randomUUID();
  const ownerB = randomUUID();
  const dogA = randomUUID();
  const dogB = randomUUID();
  const publishEli = randomUUID();
  const degradeEli = randomUUID();
  const baselineId = randomUUID();
  const now = new Date('2026-09-18T08:00:00.000Z');

  await sql.begin(async (tx) => {
    await tx`insert into users (id,email,password_hash,name) values
      (${ownerA},${`int04a-${ownerA}@example.test`},'x','Owner A'),
      (${ownerB},${`int04a-${ownerB}@example.test`},'x','Owner B')`;
    await tx`insert into dogs (id,owner_id,name,breed,birth_date,sex,weight,fur_class) values
      (${dogA},${ownerA},'A','Test','2020-01-01','female',20,'FC1'),
      (${dogB},${ownerB},'B','Test','2020-01-01','male',21,'FC1')`;
    await tx`insert into eli_states
      (id,dog_id,timestamp,arousal,valence,load,confidence,gate_status,sensor_reliability)
      values
      (${publishEli},${dogA},${now},0.91,-0.77,0.63,0.88,'PUBLISH',${tx.json({ mat: 0.97 })}),
      (${degradeEli},${dogA},${new Date(now.getTime()+1000)},0.82,-0.66,0.52,0.77,'DEGRADE',${tx.json({ tag: 0.76 })})`;
    await tx`insert into baselines
      (id,dog_id,started_at,valid_hours,established,metrics)
      values (${baselineId},${dogA},${now},24,1,${tx.json({ opaqueSecretMetric: 123.456 })})`;
  });

  t.after(async () => {
    await sql`delete from baselines where dog_id = ${dogA}`;
    await sql`delete from eli_states where dog_id = ${dogA}`;
    await sql`delete from dogs where id in (${dogA}, ${dogB})`;
    await sql`delete from users where id in (${ownerA}, ${ownerB})`;
  });

  const dataExport = await loadRoute();
  const app = appFor(dataExport, ownerA);

  const jsonRes = await app.request(`/api/data-export?dog_id=${dogA}`);
  assert.equal(jsonRes.status, 200);
  const payload = await jsonRes.json();
  assert.equal(payload.inferred.length, 2);

  const published = payload.inferred.find((row) => row.id === publishEli);
  const degraded = payload.inferred.find((row) => row.id === degradeEli);
  for (const row of payload.inferred) {
    assert.equal(Object.hasOwn(row, 'valence'), false);
    assert.equal(Object.hasOwn(row, 'arousal'), false);
    assert.equal(Object.hasOwn(row, 'sensorReliability'), false);
  }
  assert.equal(published.load, 0.63);
  assert.equal(Object.hasOwn(degraded, 'load'), false);
  assert.equal(payload.baselines[0].metricsStatus, 'WITHHELD_PENDING_DISCLOSURE_AUTHORITY');
  assert.equal(Object.hasOwn(payload.baselines[0], 'metrics'), false);
  assert.doesNotMatch(JSON.stringify(payload), /opaqueSecretMetric|123\.456|-0\.77|0\.91/);

  const csvRes = await app.request(`/api/data-export?dog_id=${dogA}&format=csv`);
  assert.equal(csvRes.status, 200);
  const csv = await csvRes.text();
  assert.doesNotMatch(csv, /valence|arousal|sensorReliability|opaqueSecretMetric|123\.456|-0\.77|0\.91/);

  const bola = await app.request(`/api/data-export?dog_id=${dogB}`);
  assert.equal(bola.status, 404);

  for (const suffix of ['from=garbage', 'to=garbage']) {
    const res = await app.request(`/api/data-export?dog_id=${dogA}&${suffix}`);
    assert.equal(res.status, 400);
  }
  const reversed = await app.request(
    `/api/data-export?dog_id=${dogA}&from=2026-09-19T00:00:00Z&to=2026-09-18T00:00:00Z`,
  );
  assert.equal(reversed.status, 400);
});
