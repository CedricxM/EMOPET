import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { Hono } from 'hono';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
const runtimeTest = databaseUrl ? test : test.skip;

runtimeTest('dog CRUD is durable, owner scoped, and erasure remains fail closed', async (t) => {
  const sql = postgres(databaseUrl, { max: 1 });
  const ownerA = randomUUID();
  const ownerB = randomUUID();
  const missingUser = randomUUID();
  let runtimeDb;

  t.after(async () => {
    try {
      await sql`delete from dogs where owner_id in (${ownerA}, ${ownerB})`;
      await sql`delete from users where id in (${ownerA}, ${ownerB})`;
    } finally {
      await Promise.allSettled([
        sql.end({ timeout: 2 }),
        runtimeDb?.$client?.end?.({ timeout: 2 }),
      ]);
    }
  });

  await sql`
    insert into users (id, email, password_hash, name)
    values
      (${ownerA}, ${`dog-a-${ownerA}@example.test`}, 'test-only', 'Owner A'),
      (${ownerB}, ${`dog-b-${ownerB}@example.test`}, 'test-only', 'Owner B')
  `;

  const [{ dogs, DOG_ERASURE_LIFECYCLE_CODE }, { db }] = await Promise.all([
    import('../dist/api/routes/dogs.js'),
    import('../dist/db/index.js'),
  ]);
  runtimeDb = db;

  let currentUserId = ownerA;
  const app = new Hono();
  app.use('/api/*', async (c, next) => {
    c.set('userId', currentUserId);
    await next();
  });
  app.route('/api/dogs', dogs);

  const createBody = {
    name: 'Nala',
    breed: 'Labrador Retriever',
    birthDate: '2022-04-12',
    sex: 'female',
    weight: 24.5,
    furClass: 'FC2',
    photo: 'https://example.test/nala.jpg',
  };

  currentUserId = 'not-a-canonical-user-id';
  const invalidIdentityCreate = await app.request('/api/dogs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...createBody, name: 'Invalid Identity' }),
  });
  assert.equal(invalidIdentityCreate.status, 401);

  currentUserId = missingUser;
  const missingUserCreate = await app.request('/api/dogs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...createBody, name: 'Missing User' }),
  });
  assert.equal(missingUserCreate.status, 401);

  const [{ count: rejectedCount }] = await sql`
    select count(*)::int as count
    from dogs
    where name in ('Invalid Identity', 'Missing User')
  `;
  assert.equal(rejectedCount, 0);

  currentUserId = ownerA;
  const createA = await app.request('/api/dogs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(createBody),
  });
  assert.equal(createA.status, 201);
  const createdA = await createA.json();
  const dogAId = createdA.dog.id;
  assert.equal(createdA.dog.ownerId, ownerA);
  assert.equal(createdA.dog.photo, createBody.photo);

  const [persistedA] = await sql`
    select owner_id, name, birth_date, photo_url
    from dogs
    where id = ${dogAId}
  `;
  assert.ok(persistedA);
  assert.equal(persistedA.owner_id, ownerA);
  assert.equal(persistedA.name, 'Nala');
  assert.equal(new Date(persistedA.birth_date).toISOString().slice(0, 10), '2022-04-12');
  assert.equal(persistedA.photo_url, createBody.photo);

  currentUserId = ownerB;
  const createB = await app.request('/api/dogs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...createBody, name: 'Rio', photo: 'https://example.test/rio.jpg' }),
  });
  assert.equal(createB.status, 201);
  const createdB = await createB.json();
  const dogBId = createdB.dog.id;

  currentUserId = ownerA;
  const listA = await app.request('/api/dogs');
  assert.equal(listA.status, 200);
  const listedA = await listA.json();
  assert.equal(listedA.dogs.some((dog) => dog.id === dogAId), true);
  assert.equal(listedA.dogs.some((dog) => dog.id === dogBId), false);

  const getA = await app.request(`/api/dogs/${dogAId}`);
  assert.equal(getA.status, 200);
  const fetchedA = await getA.json();
  assert.equal(fetchedA.dog.id, dogAId);
  assert.equal(fetchedA.dog.ownerId, ownerA);
  assert.equal(fetchedA.dog.photo, createBody.photo);

  const crossOwnerGet = await app.request(`/api/dogs/${dogBId}`);
  assert.equal(crossOwnerGet.status, 404);

  const [beforePatch] = await sql`
    select name, weight, updated_at
    from dogs
    where id = ${dogAId}
  `;
  assert.ok(beforePatch);

  const emptyPatch = await app.request(`/api/dogs/${dogAId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(emptyPatch.status, 400);
  assert.deepEqual(await emptyPatch.json(), { error: 'no_updates' });

  await new Promise((resolve) => setTimeout(resolve, 10));
  const patchA = await app.request(`/api/dogs/${dogAId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Nala Updated', weight: 25.2 }),
  });
  assert.equal(patchA.status, 200);
  const patchedA = await patchA.json();
  assert.equal(patchedA.dog.name, 'Nala Updated');
  assert.equal(patchedA.dog.weight, 25.2);

  const [afterPatch] = await sql`
    select name, weight, updated_at
    from dogs
    where id = ${dogAId}
  `;
  assert.equal(afterPatch.name, 'Nala Updated');
  assert.equal(Number(afterPatch.weight), 25.2);
  assert.ok(new Date(afterPatch.updated_at).getTime() > new Date(beforePatch.updated_at).getTime());

  currentUserId = ownerB;
  const crossOwnerPatch = await app.request(`/api/dogs/${dogAId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Hijacked' }),
  });
  assert.equal(crossOwnerPatch.status, 404);

  currentUserId = ownerA;
  const deleteA = await app.request(`/api/dogs/${dogAId}`, { method: 'DELETE' });
  assert.equal(deleteA.status, 409);
  assert.match(deleteA.headers.get('cache-control') ?? '', /no-store/);
  const deleteBody = await deleteA.json();
  assert.equal(deleteBody.code, DOG_ERASURE_LIFECYCLE_CODE);
  assert.equal(deleteBody.deleted, false);
  assert.equal(deleteBody.gate, 'G-PRIV-ERASURE');

  const [{ count: stillPresent }] = await sql`
    select count(*)::int as count from dogs where id = ${dogAId}
  `;
  assert.equal(stillPresent, 1);
});
