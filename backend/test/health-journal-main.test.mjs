import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
const runtimeTest = databaseUrl ? test : test.skip;

test('health route source does not acknowledge discarded journal entries', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('../api/routes/health.ts', import.meta.url), 'utf8');

  assert.match(source, /health_entry_persistence_not_implemented/);
  assert.match(source, /},\s*501\s*\);/s);
  assert.doesNotMatch(source, /message:\s*['"]entry_created['"]/);
});

runtimeTest('validated owner health POST fails honestly and persists no row', async (t) => {
  const sql = postgres(databaseUrl, { max: 1 });
  const ownerId = randomUUID();
  const dogId = randomUUID();
  let runtimeDb;

  t.after(async () => {
    try {
      await sql`delete from health_entries where dog_id = ${dogId}`;
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
    values (${ownerId},${`health-ack-${ownerId}@example.test`},'x','Health Owner')`;
  await sql`insert into dogs (id,owner_id,name,breed,birth_date,sex,weight,fur_class)
    values (${dogId},${ownerId},'Health Dog','Test','2020-01-01','female',20,'FC1')`;

  const [{ health }, { db }] = await Promise.all([
    import('../dist/api/routes/health.js'),
    import('../dist/db/index.js'),
  ]);
  runtimeDb = db;

  const app = new Hono();
  app.use('/api/*', async (c, next) => {
    c.set('userId', ownerId);
    await next();
  });
  app.route('/api/health', health);

  const response = await app.request('/api/health', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      dogId,
      type: 'note',
      date: '2026-09-18T00:00:00.000Z',
      title: 'Test-only journal entry',
      details: 'Must not be acknowledged as persisted.',
    }),
  });

  assert.equal(response.status, 501);
  assert.deepEqual(await response.json(), {
    error: 'health_entry_persistence_not_implemented',
    dogId,
  });

  const [{ count }] = await sql`
    select count(*)::int as count from health_entries where dog_id = ${dogId}
  `;
  assert.equal(count, 0);
});
