import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
const runtimeTest = databaseUrl ? test : test.skip;

test('presence lookback parser defaults deliberately and does not invent a product maximum', async () => {
  const { parseLookbackWindow } = await import('../dist/api/utils/temporal-window.js');
  const now = new Date('2026-09-18T12:00:00.000Z');

  assert.equal(parseLookbackWindow(undefined, now)?.days, 14);
  assert.equal(parseLookbackWindow('31', now)?.days, 31);
  assert.equal(parseLookbackWindow('365', now)?.days, 365);

  for (const raw of ['0', '-1', '1.5', '1e2', '', 'not-a-number', String(Number.MAX_SAFE_INTEGER + 1)]) {
    assert.equal(parseLookbackWindow(raw, now), null, raw);
  }
});

runtimeTest('presence routes reject malformed days after ownership without entering evidence semantics', async (t) => {
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
    values (${ownerId},${`presence-window-${ownerId}@example.test`},'x','Presence Owner')`;
  await sql`insert into dogs (id,owner_id,name,breed,birth_date,sex,weight,fur_class)
    values (${dogId},${ownerId},'Window Dog','Test','2020-01-01','female',20,'FC1')`;

  const [{ dogs }, { sensors }, { db }] = await Promise.all([
    import('../dist/api/routes/dogs.js'),
    import('../dist/api/routes/sensors.js'),
    import('../dist/db/index.js'),
  ]);
  runtimeDb = db;

  const app = new Hono();
  app.use('/api/*', async (c, next) => {
    c.set('userId', ownerId);
    await next();
  });
  app.route('/api/dogs', dogs);
  app.route('/api/sensors', sensors);

  for (const raw of ['0', '-1', '1.5', 'not-a-number', '']) {
    for (const path of [
      `/api/dogs/${dogId}/absence-comparison?days=${encodeURIComponent(raw)}`,
      `/api/sensors/presence/${dogId}/events?days=${encodeURIComponent(raw)}`,
    ]) {
      const response = await app.request(path);
      assert.equal(response.status, 400, `${path} should fail closed`);
      assert.deepEqual(await response.json(), {
        error: 'invalid_presence_window',
        parameter: 'days',
      });
    }
  }
});
