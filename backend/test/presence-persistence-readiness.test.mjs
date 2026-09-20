import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Hono } from 'hono';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
const runtimeTest = databaseUrl ? test : test.skip;

test('Product V1 Presence routes do not expose the process-memory store as persistence authority', () => {
  const sensors = readFileSync(new URL('../api/routes/sensors.ts', import.meta.url), 'utf8');
  const dogs = readFileSync(new URL('../api/routes/dogs.ts', import.meta.url), 'utf8');

  assert.match(sensors, /PRESENCE_PERSISTENCE_NOT_READY/);
  assert.match(sensors, /presencePersistenceUnavailable\(c, 'create_presence_event'\)/);
  assert.match(sensors, /presencePersistenceUnavailable\(c, 'list_presence_events'\)/);
  assert.doesNotMatch(sensors, /presence_event_recorded/);
  assert.doesNotMatch(sensors, /appendPresenceEvents/);
  assert.doesNotMatch(sensors, /getPresenceEventsForDog/);

  assert.match(dogs, /ABSENCE_COMPARISON_PERSISTENCE_NOT_READY/);
  assert.doesNotMatch(dogs, /computePresenceComparison/);
  assert.doesNotMatch(dogs, /getPresenceEventsForDog/);
});

runtimeTest('owned Presence surfaces validate input then fail closed before volatile evidence semantics', async (t) => {
  const sql = postgres(databaseUrl, { max: 1 });
  const ownerId = randomUUID();
  const dogId = randomUUID();
  let runtimeDb;

  t.after(async () => {
    try {
      await sql`delete from dogs where id = ${dogId}`;
      await sql`delete from users where id = ${ownerId}`;
    } finally {
      await Promise.allSettled([
        sql.end({ timeout: 2 }),
        runtimeDb?.$client?.end?.({ timeout: 2 }),
      ]);
    }
  });

  await sql`insert into users (id,email,password_hash,name)
    values (${ownerId},${`presence-ready-${ownerId}@example.test`},'x','Presence Owner')`;
  await sql`insert into dogs (id,owner_id,name,breed,birth_date,sex,weight,fur_class)
    values (${dogId},${ownerId},'Presence Dog','Test','2020-01-01','female',20,'FC1')`;

  const [{ sensors }, { dogs }, { db }] = await Promise.all([
    import('../dist/api/routes/sensors.js'),
    import('../dist/api/routes/dogs.js'),
    import('../dist/db/index.js'),
  ]);
  runtimeDb = db;

  const app = new Hono();
  app.use('/api/*', async (c, next) => {
    c.set('userId', ownerId);
    await next();
  });
  app.route('/api/sensors', sensors);
  app.route('/api/dogs', dogs);

  const invalid = await app.request(`/api/sensors/presence/${dogId}/events?days=abc`);
  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { error: 'invalid_presence_window', parameter: 'days' });

  const getResponse = await app.request(`/api/sensors/presence/${dogId}/events?days=14`);
  assert.equal(getResponse.status, 503);
  assert.equal((await getResponse.json()).code, 'PRESENCE_PERSISTENCE_NOT_READY');

  const compareResponse = await app.request(`/api/dogs/${dogId}/absence-comparison?days=14`);
  assert.equal(compareResponse.status, 503);
  assert.equal((await compareResponse.json()).code, 'ABSENCE_COMPARISON_PERSISTENCE_NOT_READY');

  const postResponse = await app.request(`/api/sensors/presence/${dogId}/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      dogId,
      phoneSeen: true,
      timestamp: '2026-09-20T12:00:00.000Z',
      source: 'phone_passive',
      rssi: -55,
    }),
  });
  assert.equal(postResponse.status, 503);
  assert.equal((await postResponse.json()).code, 'PRESENCE_PERSISTENCE_NOT_READY');
});
