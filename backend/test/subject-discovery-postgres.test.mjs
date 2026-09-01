import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.SUBJECT_DISCOVERY_DB_INTEGRATION === '1';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const MISSING_USER = '33333333-3333-4333-8333-333333333333';
const DOG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DOG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const COMMUNITY_A = '44444444-4444-4444-8444-444444444444';
const POST_A = '55555555-5555-4555-8555-555555555555';

let sql = null;
let closeDatabase = null;
let discoverSubjectData = null;
let dataExport = null;
let Hono = null;

if (enabled) {
  const [
    { default: postgres },
    discoveryModule,
    dbModule,
    exportModule,
    honoModule,
  ] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/subject-discovery.js'),
    import('../dist/db/index.js'),
    import('../dist/api/routes/data-export.js'),
    import('hono'),
  ]);

  sql = postgres(process.env.DATABASE_URL, { max: 2 });
  discoverSubjectData = discoveryModule.discoverSubjectData;
  closeDatabase = dbModule.closeDatabase;
  dataExport = exportModule.dataExport;
  Hono = honoModule.Hono;
}

after(async () => {
  if (sql) await sql.end({ timeout: 5 });
  if (closeDatabase) await closeDatabase();
});

async function stateSnapshot() {
  const [row] = await sql`
    SELECT
      (SELECT count(*)::int FROM users) AS users,
      (SELECT count(*)::int FROM dogs) AS dogs,
      (SELECT count(*)::int FROM subscriptions) AS subscriptions,
      (SELECT count(*)::int FROM achievements) AS achievements,
      (SELECT count(*)::int FROM communities) AS communities,
      (SELECT count(*)::int FROM community_members) AS community_members,
      (SELECT count(*)::int FROM posts) AS posts,
      (SELECT count(*)::int FROM comments) AS comments,
      (SELECT count(*)::int FROM community_events) AS community_events,
      (SELECT count(*)::int FROM copresence_events) AS copresence_events,
      (SELECT count(*)::int FROM ai_messages) AS ai_messages,
      (SELECT count(*)::int FROM devices) AS devices,
      (SELECT count(*)::int FROM health_entries) AS health_entries,
      (SELECT count(*)::int FROM sensor_summaries) AS sensor_summaries,
      (SELECT count(*)::int FROM eli_states) AS eli_states,
      (SELECT count(*)::int FROM baselines) AS baselines
  `;
  return row;
}

function makeExportApp(userId) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('userId', userId);
    await next();
  });
  app.route('/export', dataExport);
  return app;
}

test('PRIV-DISC-01 enumerates only owned subject data and performs no mutation', {
  skip: !enabled,
}, async () => {
  await sql`
    INSERT INTO users (id, email, password_hash, name, avatar_url)
    VALUES
      (${USER_A}, 'privacy-a@emopet.invalid', 'test-only-a', 'Guardian A', 'https://objects.invalid/avatar-a.jpg'),
      (${USER_B}, 'privacy-b@emopet.invalid', 'test-only-b', 'Guardian B', NULL)
  `;

  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class, photo_url)
    VALUES
      (${DOG_A}, ${USER_A}, 'Dog A', 'Test Breed', '2020-01-01', 'female', 20.0, 'FC2', 'https://objects.invalid/dog-a.jpg'),
      (${DOG_B}, ${USER_B}, 'Dog B', 'Test Breed', '2021-01-01', 'male', 22.0, 'FC2', NULL)
  `;

  await sql`INSERT INTO subscriptions (user_id, plan) VALUES (${USER_A}, 'monthly')`;
  await sql`INSERT INTO achievements (user_id, type) VALUES (${USER_A}, 'privacy-test')`;

  await sql`
    INSERT INTO communities (id, name, type, created_by)
    VALUES (${COMMUNITY_A}, 'Privacy Test Community', 'activity', ${USER_A})
  `;
  await sql`
    INSERT INTO community_members (community_id, user_id)
    VALUES (${COMMUNITY_A}, ${USER_A}), (${COMMUNITY_A}, ${USER_B})
  `;
  await sql`
    INSERT INTO posts (id, community_id, author_id, type, content, media_urls)
    VALUES (
      ${POST_A},
      ${COMMUNITY_A},
      ${USER_A},
      'post',
      'privacy discovery test',
      '["https://objects.invalid/post-a.jpg","https://objects.invalid/post-b.jpg"]'::jsonb
    )
  `;
  await sql`
    INSERT INTO comments (post_id, author_id, content)
    VALUES (${POST_A}, ${USER_A}, 'privacy discovery comment')
  `;
  await sql`
    INSERT INTO community_events (community_id, created_by, title, location, starts_at)
    VALUES (${COMMUNITY_A}, ${USER_A}, 'Privacy Event', 'Coarse test area', now() + interval '1 day')
  `;

  await sql`
    INSERT INTO devices (dog_id, type, mac_address)
    VALUES (${DOG_A}, 'TAG', '02:00:00:00:00:01')
  `;
  await sql`
    INSERT INTO health_entries (dog_id, type, date, title)
    VALUES (${DOG_A}, 'note', '2026-01-01', 'Test note')
  `;
  await sql`
    INSERT INTO sensor_summaries (dog_id, timestamp, source)
    VALUES (${DOG_A}, now(), 'TAG')
  `;
  await sql`
    INSERT INTO eli_states (dog_id, timestamp, arousal, valence, load, confidence, gate_status, sensor_reliability)
    VALUES (${DOG_A}, now(), 0.2, 0.1, 0.3, 0.9, 'PUBLISH', '{}'::jsonb)
  `;
  await sql`
    INSERT INTO baselines (dog_id, started_at, metrics)
    VALUES (${DOG_A}, now(), '{}'::jsonb)
  `;
  await sql`
    INSERT INTO ai_messages (category, target_user_id, dog_id, content)
    VALUES ('privacy-test', ${USER_A}, ${DOG_A}, 'test-only message')
  `;

  // Two directions prove discovery searches both dog_a_id and dog_b_id.
  await sql`
    INSERT INTO copresence_events (dog_a_id, dog_b_id, occurred_at)
    VALUES
      (${DOG_A}, ${DOG_B}, now()),
      (${DOG_B}, ${DOG_A}, now() + interval '1 minute')
  `;

  const before = await stateSnapshot();

  const first = await discoverSubjectData(USER_A, DOG_A);
  assert.equal(first.ok, true);
  assert.deepEqual(first.subject.selectedDogIds, [DOG_A]);
  assert.equal(first.guardian.account.count, 1);
  assert.equal(first.guardian.ownedDogs.count, 1);
  assert.deepEqual(first.guardian.ownedDogs.ids, [DOG_A]);
  assert.equal(first.guardian.subscriptions.count, 1);
  assert.equal(first.guardian.achievements.count, 1);
  assert.equal(first.guardian.communityMemberships.count, 1);
  assert.equal(first.guardian.communitiesCreated.count, 1);
  assert.equal(first.guardian.postsAuthored.count, 1);
  assert.equal(first.guardian.commentsAuthored.count, 1);
  assert.equal(first.guardian.communityEventsCreated.count, 1);
  assert.equal(first.guardian.aiMessagesTargetingUser.count, 1);

  assert.equal(first.dog.profiles.count, 1);
  assert.equal(first.dog.devices.count, 1);
  assert.equal(first.dog.healthEntries.count, 1);
  assert.equal(first.dog.sensorSummaries.count, 1);
  assert.equal(first.dog.coreEliStates.count, 1);
  assert.equal(first.dog.baselines.count, 1);
  assert.equal(first.dog.aiMessagesTargetingDog.count, 1);
  assert.equal(first.dog.copresenceEvents.count, 2);

  assert.equal(first.unresolved.eliV5SharedIdentity.status, 'UNRESOLVED_IDENTITY_MAPPING');
  assert.equal(first.unresolved.contactJsonStore.status, 'UNRESOLVED_IDENTITY_MAPPING');
  assert.equal(first.unresolved.journalJsonStore.status, 'UNRESOLVED_IDENTITY_MAPPING');
  assert.equal(first.unresolved.profileMediaObjects.status, 'EXTERNAL_DELETION_NOT_PROVEN');
  assert.equal(first.unresolved.profileMediaObjects.externalReferenceCount, 2);
  assert.equal(first.unresolved.communityPostMediaObjects.externalReferenceCount, 2);
  assert.equal(first.unresolved.providerHeldCopies.status, 'EXTERNAL_DELETION_NOT_PROVEN');
  assert.equal(first.unresolved.backups.status, 'EXTERNAL_DELETION_NOT_PROVEN');
  assert.equal(first.unresolved.vetReportShareGrants.status, 'EXTERNAL_DELETION_NOT_PROVEN');
  assert.equal(first.unresolved.rawHighRateSensorStreams.status, 'NOT_PERSISTED_BY_CURRENT_BACKEND');

  const second = await discoverSubjectData(USER_A, DOG_A);
  assert.deepEqual(second, first);

  const after = await stateSnapshot();
  assert.deepEqual(after, before, 'subject discovery must be read-only and idempotent');

  const crossGuardian = await discoverSubjectData(USER_A, DOG_B);
  assert.deepEqual(crossGuardian, { ok: false, error: 'dog_not_found' });

  const invalidUser = await discoverSubjectData('guardian-a', DOG_A);
  assert.deepEqual(invalidUser, { ok: false, error: 'invalid_user_id' });

  const missingUser = await discoverSubjectData(MISSING_USER, DOG_A);
  assert.deepEqual(missingUser, { ok: false, error: 'user_not_found' });

  const guardianB = await discoverSubjectData(USER_B, DOG_B);
  assert.equal(guardianB.ok, true);
  assert.equal(guardianB.dog.copresenceEvents.count, 2);
  assert.equal(guardianB.dog.devices.count, 0);

  // DATA-01 ownership must remain fail-closed after extracting the shared lookup.
  const exportAsA = makeExportApp(USER_A);
  const crossExport = await exportAsA.request(`http://emopet.test/export?dog_id=${DOG_B}`);
  assert.equal(crossExport.status, 404);

  const validExport = await exportAsA.request(`http://emopet.test/export?dog_id=${DOG_A}`);
  assert.equal(validExport.status, 200);
  const exported = await validExport.json();
  assert.equal(exported.subject.userId, USER_A);
  assert.equal(exported.subject.dogId, DOG_A);
  assert.equal(exported.devices.length, 1);
});
