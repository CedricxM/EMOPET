import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { Hono } from 'hono';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
const runtimeTest = databaseUrl ? test : test.skip;

runtimeTest('Owner-scoped canonical device registry excludes transport identity and detached devices', async (t) => {
  const sql = postgres(databaseUrl, { max: 1 });
  const ownerA = randomUUID();
  const ownerB = randomUUID();
  const dogA = randomUUID();
  const dogB = randomUUID();
  const tagA = randomUUID();
  const matA = randomUUID();
  const detachedTagA = randomUUID();
  const tagB = randomUUID();
  let runtimeDb;

  t.after(async () => {
    try {
      await sql`delete from devices where id in (${tagA}, ${matA}, ${detachedTagA}, ${tagB})`;
      await sql`delete from dogs where id in (${dogA}, ${dogB})`;
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
      (${ownerA}, ${`device-reg-a-${ownerA}@example.test`}, 'test-only', 'Owner A'),
      (${ownerB}, ${`device-reg-b-${ownerB}@example.test`}, 'test-only', 'Owner B')
  `;

  await sql`
    insert into dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    values
      (${dogA}, ${ownerA}, 'Registry A', 'Test', '2022-01-01', 'female', 20, 'FC2'),
      (${dogB}, ${ownerB}, 'Registry B', 'Test', '2022-01-01', 'male', 21, 'FC2')
  `;

  await sql`
    insert into devices (
      id, dog_id, unbound_at, type, mac_address, firmware_version,
      supports_v6_features
    )
    values
      (${tagA}, ${dogA}, null, 'TAG', '02:00:00:00:A1:01', '6.1.0', true),
      (${matA}, ${dogA}, null, 'MAT', '02:00:00:00:A1:02', '5.4.0', false),
      (${detachedTagA}, ${dogA}, now(), 'TAG', '02:00:00:00:A1:03', '6.0.0', true),
      (${tagB}, ${dogB}, null, 'TAG', '02:00:00:00:B1:01', '6.1.0', true)
  `;

  const [{ dogs }, { db }] = await Promise.all([
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

  const ownResponse = await app.request(`/api/dogs/${dogA}/devices`);
  assert.equal(ownResponse.status, 200);
  assert.equal(ownResponse.headers.get('cache-control'), 'private, no-store');

  const own = await ownResponse.json();
  assert.equal(own.schemaVersion, 'owner-dog-device-registry-v1');
  assert.equal(own.dogId, dogA);
  assert.equal(own.identityAuthority, 'BACKEND_REGISTRY_ONLY');
  assert.equal(own.bleTransportIdentifierIsCanonicalIdentity, false);
  assert.equal(own.physicalDeviceAuthenticationEstablished, false);

  assert.deepEqual(
    own.devices.map((device) => device.id).sort(),
    [tagA, matA].sort(),
  );
  assert.equal(own.devices.some((device) => device.id === detachedTagA), false);

  for (const device of own.devices) {
    assert.equal(device.dogId, dogA);
    assert.equal(device.bindingStatus, 'BOUND');
    assert.equal(device.physicalDeviceAuthentication, 'NOT_ESTABLISHED');
    assert.equal('macAddress' in device, false);
    assert.equal('credentials' in device, false);
  }

  currentUserId = ownerB;
  const crossOwner = await app.request(`/api/dogs/${dogA}/devices`);
  assert.equal(crossOwner.status, 404);

  const ownB = await app.request(`/api/dogs/${dogB}/devices`);
  assert.equal(ownB.status, 200);
  const jsonB = await ownB.json();
  assert.deepEqual(jsonB.devices.map((device) => device.id), [tagB]);
});
