import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
const runtimeTest = databaseUrl ? test : test.skip;

test('health route only acknowledges journal creation after a durable PostgreSQL insert', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('../api/routes/health.ts', import.meta.url), 'utf8');

  assert.match(source, /\.insert\(healthEntries\)/);
  assert.match(source, /\.returning\(\)/);
  assert.match(source, /HEALTH_DATABASE_UNAVAILABLE/);
  assert.match(source, /databaseUnavailable\(c, 'create_entry'\)/);
  assert.doesNotMatch(source, /health_entry_persistence_not_implemented/);
  assert.doesNotMatch(source, /message:\s*['"]entry_created['"]/);
});

runtimeTest('validated owner health POST persists exactly one recoverable row before returning 201', async (t) => {
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
      details: 'Must be recoverable from PostgreSQL before the route acknowledges it.',
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const body = await response.json();
  assert.equal(body.entry.dogId, dogId);
  assert.equal(body.entry.type, 'note');
  assert.equal(body.entry.date, '2026-09-18');
  assert.equal(body.entry.title, 'Test-only journal entry');

  const rows = await sql`
    select id::text, dog_id::text, type, date::text, title, details
      from health_entries
     where dog_id = ${dogId}
  `;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, body.entry.id);
  assert.equal(rows[0].dog_id, dogId);
  assert.equal(rows[0].type, 'note');
  assert.equal(rows[0].date, '2026-09-18');
  assert.equal(rows[0].title, 'Test-only journal entry');
  assert.equal(
    rows[0].details,
    'Must be recoverable from PostgreSQL before the route acknowledges it.',
  );
});
