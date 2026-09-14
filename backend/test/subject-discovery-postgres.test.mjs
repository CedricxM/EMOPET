import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.SUBJECT_DISCOVERY_DB_INTEGRATION === '1';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const DOG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DOG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

let sql = null;
let discoverSubjectData = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, discoveryModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/subject-discovery.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 2 });
  discoverSubjectData = discoveryModule.discoverSubjectData;
  closeDatabase = dbModule.closeDatabase;
}

after(async () => {
  if (sql) await sql.end({ timeout: 5 });
  if (closeDatabase) await closeDatabase();
});

async function snapshot() {
  const [row] = await sql`
    SELECT
      (SELECT count(*)::int FROM users) AS users,
      (SELECT count(*)::int FROM dogs) AS dogs,
      (SELECT count(*)::int FROM contact_requests) AS contact_requests,
      (SELECT count(*)::int FROM professional_share_grants) AS professional_share_grants,
      (SELECT count(*)::int FROM dog_sub_baselines) AS dog_sub_baselines,
      (SELECT count(*)::int FROM user_config) AS user_config
  `;
  return row;
}

test('PRIV-DISC-01 composed dry-run discovers canonical ELI/contact/grants without mutation', {
  skip: !enabled,
}, async () => {
  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES
      (${USER_A}, 'disc-a@emopet.invalid', 'test-only-a', 'Guardian A'),
      (${USER_B}, 'disc-b@emopet.invalid', 'test-only-b', 'Guardian B')
  `;

  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES
      (${DOG_A}, ${USER_A}, 'Dog A', 'Test', '2020-01-01', 'female', 20.0, 'FC2'),
      (${DOG_B}, ${USER_B}, 'Dog B', 'Test', '2021-01-01', 'male', 22.0, 'FC2')
  `;

  await sql`
    INSERT INTO contact_requests (requester_user_id, reason, message, consent_at)
    VALUES (${USER_A}, 'support', 'test-only contact request', now())
  `;

  await sql`
    INSERT INTO dog_sub_baselines (dog_id, slot)
    VALUES (${DOG_A}, 'deep_rest_mat')
  `;

  await sql`
    INSERT INTO user_config (user_id, dog_id, config_key, config_value)
    VALUES (${USER_A}, ${DOG_A}, 'discovery-test', '{}'::jsonb)
  `;

  await sql`
    INSERT INTO professional_share_grants (
      owner_user_id,
      dog_id,
      recipient_display_name,
      recipient_type,
      recipient_email,
      purpose,
      scopes,
      data_from,
      data_to,
      access_expires_at
    )
    VALUES (
      ${USER_A},
      ${DOG_A},
      'Test Vet',
      'VETERINARIAN',
      'vet@example.invalid',
      'VETERINARY_CONSULTATION',
      '["HEALTH_SUMMARY"]'::jsonb,
      now() - interval '1 day',
      now(),
      now() + interval '1 day'
    )
  `;

  await sql`
    INSERT INTO copresence_events (dog_a_id, dog_b_id, occurred_at)
    VALUES
      (${DOG_A}, ${DOG_B}, now()),
      (${DOG_B}, ${DOG_A}, now() + interval '1 minute')
  `;

  const before = await snapshot();
  const first = await discoverSubjectData(USER_A, DOG_A);

  assert.equal(first.ok, true);
  assert.deepEqual(first.subject.selectedDogIds, [DOG_A]);
  assert.equal(first.guardian.contactRequests.count, 1);
  assert.equal(first.guardian.professionalShareGrantsOwned.count, 1);
  assert.equal(first.guardian.userConfig.count, 1);
  assert.equal(first.dog.professionalShareGrants.count, 1);
  assert.equal(first.dog.eliDogSubBaselines.count, 1);
  assert.equal(first.dog.eliUserConfig.count, 1);
  assert.equal(first.dog.copresenceEvents.count, 2);
  assert.equal(first.externalOrUnresolved.journal.status, 'NOT_PERSISTED_BY_CURRENT_BACKEND');
  assert.equal(first.externalOrUnresolved.erasureDisposition.status, 'POLICY_AUTHORITY_OPEN');

  const second = await discoverSubjectData(USER_A, DOG_A);
  assert.deepEqual(second, first);
  assert.deepEqual(await snapshot(), before, 'discovery must remain read-only and idempotent');

  assert.deepEqual(
    await discoverSubjectData(USER_A, DOG_B),
    { ok: false, error: 'dog_not_found' },
    'cross-owner dog discovery must fail closed',
  );

  assert.deepEqual(
    await discoverSubjectData('not-a-uuid', DOG_A),
    { ok: false, error: 'invalid_user_id' },
  );
});
