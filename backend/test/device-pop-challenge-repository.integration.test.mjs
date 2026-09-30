import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.DEVICE_POP_CHALLENGE_DB_INTEGRATION === '1';

const OWNER = 'd6630000-0000-4000-8000-000000000001';
const DOG = 'd6630000-0000-4000-8000-000000000002';
const TAG = 'd6630000-0000-4000-8000-000000000003';
const CHALLENGE_A = 'd6630000-0000-4000-8000-000000000004';
const CHALLENGE_B = 'd6630000-0000-4000-8000-000000000005';

let sql = null;
let store = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, repoModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/security/device-pop-challenge-repository.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 2 });
  store = repoModule.durableDevicePopChallengeRepository;
  closeDatabase = dbModule.closeDatabase;
}

function challenge({
  challengeId = CHALLENGE_A,
  deviceId = TAG,
  credentialVersion = 1,
  nonce = Buffer.alloc(32, 0x5a).toString('base64url'),
  issuedAt = '2026-09-29T10:00:00.000Z',
  expiresAt = '2026-09-29T10:05:00.000Z',
  purpose = 'DEVICE_DATA_TELEMETRY_INGRESS',
} = {}) {
  return {
    schemaVersion: 'device-pop-challenge-v1',
    protocolVersion: 1,
    deviceId,
    credentialVersion,
    purpose,
    challengeId,
    nonce,
    issuedAt,
    expiresAt,
    signingContract: 'EMOPET_DEVICE_POP_FIXED_BINARY_V1',
  };
}

async function cleanup() {
  if (!sql) return;
  await sql`DELETE FROM device_pop_challenges WHERE device_id = ${TAG}`;
  await sql`DELETE FROM devices WHERE id = ${TAG}`;
  await sql`DELETE FROM dogs WHERE id = ${DOG}`;
  await sql`DELETE FROM users WHERE id = ${OWNER}`;
}

async function seedDevice() {
  await cleanup();
  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (${OWNER}, 'device-pop-663@emopet.invalid', 'test-only', 'PoP Owner')
  `;
  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES (${DOG}, ${OWNER}, 'PoP Dog', 'Test', '2020-01-01', 'female', 20.0, 'FC2')
  `;
  await sql`
    INSERT INTO devices (id, dog_id, type, mac_address, firmware_version)
    VALUES (${TAG}, ${DOG}, 'TAG', '02:00:00:66:30:01', '6.1.0')
  `;
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('challenge store persists exact server challenge and duplicate id is atomic', {
  skip: !enabled,
}, async () => {
  await seedDevice();

  const first = challenge();
  assert.equal(await store.createIfAbsent({ challenge: first, consumedAt: null }), true);
  assert.equal(await store.createIfAbsent({ challenge: first, consumedAt: null }), false);

  const stored = await store.findByChallengeId(CHALLENGE_A);
  assert.deepEqual(stored, {
    challenge: first,
    consumedAt: null,
  });

  const [row] = await sql`
    SELECT *
    FROM device_pop_challenges
    WHERE challenge_id = ${CHALLENGE_A}
  `;
  assert.equal(row.device_id, TAG);
  assert.equal(row.credential_version, '1');
  assert.equal(row.purpose, 'DEVICE_DATA_TELEMETRY_INGRESS');
  assert.equal(row.nonce, first.nonce);
  assert.equal(row.signing_contract, 'EMOPET_DEVICE_POP_FIXED_BINARY_V1');
  assert.equal(row.consumed_at, null);
  assert.equal('signature' in row, false);
  assert.equal('public_key' in row, false);
  assert.equal('private_key' in row, false);
});

test('challenge store round-trips credential-activation purpose without relabeling it', {
  skip: !enabled,
}, async () => {
  await seedDevice();

  const activation = challenge({
    challengeId: CHALLENGE_B,
    purpose: 'DEVICE_CREDENTIAL_ACTIVATION',
  });

  assert.equal(
    await store.createIfAbsent({ challenge: activation, consumedAt: null }),
    true,
  );

  const stored = await store.findByChallengeId(CHALLENGE_B);
  assert.deepEqual(stored, {
    challenge: activation,
    consumedAt: null,
  });

  const [row] = await sql`
    SELECT purpose
    FROM device_pop_challenges
    WHERE challenge_id = ${CHALLENGE_B}
  `;
  assert.equal(row.purpose, 'DEVICE_CREDENTIAL_ACTIVATION');
});

test('canonical device FK and challenge invariants fail closed', {
  skip: !enabled,
}, async () => {
  await seedDevice();

  await assert.rejects(
    store.createIfAbsent({
      challenge: challenge({
        challengeId: CHALLENGE_B,
        deviceId: 'd6630000-0000-4000-8000-000000009999',
      }),
      consumedAt: null,
    }),
  );

  await assert.rejects(
    store.createIfAbsent({
      challenge: challenge({
        challengeId: CHALLENGE_B,
        expiresAt: '2026-09-29T09:59:59.000Z',
      }),
      consumedAt: null,
    }),
  );

  await assert.rejects(
    store.createIfAbsent({
      challenge: challenge({
        challengeId: CHALLENGE_B,
        nonce: 'A'.repeat(42) + 'B',
      }),
      consumedAt: null,
    }),
  );

  await assert.rejects(
    store.createIfAbsent({
      challenge: challenge({ challengeId: CHALLENGE_B }),
      consumedAt: '2026-09-29T10:01:00.000Z',
    }),
  );
});

test('consume is one-time and exactly one concurrent caller wins', {
  skip: !enabled,
}, async () => {
  await seedDevice();

  const first = challenge();
  assert.equal(await store.createIfAbsent({ challenge: first, consumedAt: null }), true);

  const at = '2026-09-29T10:01:00.000Z';
  const results = await Promise.all([
    store.consumeIfUnconsumed(CHALLENGE_A, at),
    store.consumeIfUnconsumed(CHALLENGE_A, at),
  ]);

  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(results.filter((value) => !value).length, 1);

  const stored = await store.findByChallengeId(CHALLENGE_A);
  assert.equal(stored.consumedAt, at);
});

test('consume rejects malformed, early and expired timestamps without mutation', {
  skip: !enabled,
}, async () => {
  await seedDevice();

  const first = challenge();
  assert.equal(await store.createIfAbsent({ challenge: first, consumedAt: null }), true);

  assert.equal(await store.consumeIfUnconsumed(CHALLENGE_A, 'not-a-date'), false);
  assert.equal(
    await store.consumeIfUnconsumed(CHALLENGE_A, '2026-09-29T09:59:59.999Z'),
    false,
  );
  assert.equal(
    await store.consumeIfUnconsumed(CHALLENGE_A, '2026-09-29T10:05:00.000Z'),
    false,
  );
  assert.equal(
    await store.consumeIfUnconsumed(CHALLENGE_A, '2026-09-29T12:01:00+02:00'),
    false,
  );

  const stored = await store.findByChallengeId(CHALLENGE_A);
  assert.equal(stored.consumedAt, null);
});
