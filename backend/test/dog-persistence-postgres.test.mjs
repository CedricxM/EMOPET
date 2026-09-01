import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.DOG_DB_INTEGRATION === '1';

const USER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const MISSING_USER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const MISSING_DOG = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

let app = null;
let sql = null;
let closeDatabase = null;

if (enabled) {
  const [
    { Hono },
    { dogs },
    { closeDatabase: closeSharedDatabase },
    { default: postgres },
  ] = await Promise.all([
    import('hono'),
    import('../dist/api/routes/dogs.js'),
    import('../dist/db/index.js'),
    import('postgres'),
  ]);

  app = new Hono();
  app.use('*', async (c, next) => {
    const userId = c.req.header('x-test-user-id');
    if (userId) c.set('userId', userId);
    await next();
  });
  app.route('/dogs', dogs);

  closeDatabase = closeSharedDatabase;
  sql = postgres(process.env.DATABASE_URL, { max: 2 });
}

after(async () => {
  if (sql) await sql.end({ timeout: 5 });
  if (closeDatabase) await closeDatabase();
});

async function request(method, path, userId, body) {
  const headers = {};
  if (userId) headers['x-test-user-id'] = userId;
  if (body !== undefined) headers['content-type'] = 'application/json';

  return app.request(`http://emopet.test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test('BACKEND-01 persists owner-scoped CREATE/PATCH and keeps DELETE blocked', {
  skip: !enabled,
}, async () => {
  await sql`DELETE FROM dogs WHERE owner_id IN (${USER_A}, ${USER_B})`;
  await sql`DELETE FROM users WHERE id IN (${USER_A}, ${USER_B})`;

  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES
      (${USER_A}, 'dog-owner-a@emopet.invalid', 'test-only-hash-a', 'Guardian A'),
      (${USER_B}, 'dog-owner-b@emopet.invalid', 'test-only-hash-b', 'Guardian B')
  `;

  const createBody = {
    name: 'Moka',
    breed: 'Border Collie',
    breedFciNumber: 297,
    birthDate: '2020-05-06',
    sex: 'female',
    weight: 24.5,
    furClass: 'FC2',
    photo: 'https://example.com/moka.jpg',
  };

  const createResponse = await request('POST', '/dogs', USER_A, createBody);
  assert.equal(createResponse.status, 201);
  const createdPayload = await createResponse.json();
  assert.match(createdPayload.dog.id, /^[0-9a-f-]{36}$/i);
  assert.equal(createdPayload.dog.ownerId, USER_A);
  assert.equal(createdPayload.dog.birthDate, '2020-05-06');
  assert.equal(createdPayload.dog.photo, 'https://example.com/moka.jpg');
  assert.equal('message' in createdPayload, false);

  const dogAId = createdPayload.dog.id;
  const [persistedCreate] = await sql`
    SELECT id, owner_id, name, breed, breed_fci_number, birth_date::text AS birth_date,
           sex, weight, fur_class, photo_url, created_at, updated_at
    FROM dogs
    WHERE id = ${dogAId}
  `;
  assert.equal(persistedCreate.owner_id, USER_A);
  assert.equal(persistedCreate.name, 'Moka');
  assert.equal(persistedCreate.birth_date, '2020-05-06');
  assert.equal(persistedCreate.photo_url, 'https://example.com/moka.jpg');

  const nonCanonicalCreate = await request('POST', '/dogs', 'guardian-a', {
    ...createBody,
    name: 'Must Not Exist',
  });
  assert.equal(nonCanonicalCreate.status, 401);

  const canonicalMissingUserCreate = await request('POST', '/dogs', MISSING_USER, {
    ...createBody,
    name: 'Missing Guardian',
  });
  assert.equal(canonicalMissingUserCreate.status, 401);

  const [invalidCreateCount] = await sql`
    SELECT count(*)::int AS count
    FROM dogs
    WHERE name IN ('Must Not Exist', 'Missing Guardian')
  `;
  assert.equal(invalidCreateCount.count, 0);

  const createDogB = await request('POST', '/dogs', USER_B, {
    ...createBody,
    name: 'Dog B',
    photo: 'https://example.com/dog-b.jpg',
  });
  assert.equal(createDogB.status, 201);
  const dogB = await createDogB.json();

  const crossOwnerPatch = await request('PATCH', `/dogs/${dogB.dog.id}`, USER_A, {
    name: 'Hijacked',
  });
  assert.equal(crossOwnerPatch.status, 404);

  const [dogBAfterAttack] = await sql`
    SELECT owner_id, name
    FROM dogs
    WHERE id = ${dogB.dog.id}
  `;
  assert.equal(dogBAfterAttack.owner_id, USER_B);
  assert.equal(dogBAfterAttack.name, 'Dog B');

  await new Promise((resolve) => setTimeout(resolve, 10));
  const patchResponse = await request('PATCH', `/dogs/${dogAId}`, USER_A, {
    name: 'Moka Updated',
    weight: 25.75,
    photo: 'https://example.com/moka-updated.jpg',
  });
  assert.equal(patchResponse.status, 200);
  const patchedPayload = await patchResponse.json();
  assert.equal(patchedPayload.dog.id, dogAId);
  assert.equal(patchedPayload.dog.ownerId, USER_A);
  assert.equal(patchedPayload.dog.name, 'Moka Updated');
  assert.equal(patchedPayload.dog.weight, 25.75);
  assert.equal(patchedPayload.dog.photo, 'https://example.com/moka-updated.jpg');
  assert.equal('message' in patchedPayload, false);

  const [persistedPatch] = await sql`
    SELECT name, weight, photo_url, updated_at
    FROM dogs
    WHERE id = ${dogAId}
  `;
  assert.equal(persistedPatch.name, 'Moka Updated');
  assert.equal(Number(persistedPatch.weight), 25.75);
  assert.equal(persistedPatch.photo_url, 'https://example.com/moka-updated.jpg');
  assert.ok(new Date(persistedPatch.updated_at).getTime() > new Date(persistedCreate.updated_at).getTime());

  const missingPatch = await request('PATCH', `/dogs/${MISSING_DOG}`, USER_A, {
    name: 'Ghost Dog',
  });
  assert.equal(missingPatch.status, 404);

  const emptyPatch = await request('PATCH', `/dogs/${dogAId}`, USER_A, {});
  assert.equal(emptyPatch.status, 400);
  assert.deepEqual(await emptyPatch.json(), { error: 'no_updates' });

  const blockedDelete = await request('DELETE', `/dogs/${dogAId}`, USER_A);
  assert.equal(blockedDelete.status, 501);
  assert.deepEqual(await blockedDelete.json(), {
    error: 'erasure_policy_pending',
    gate: 'PRIV-01',
  });

  const [afterBlockedDelete] = await sql`
    SELECT count(*)::int AS count
    FROM dogs
    WHERE id = ${dogAId}
  `;
  assert.equal(afterBlockedDelete.count, 1);
});
