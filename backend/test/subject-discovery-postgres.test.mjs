import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

import postgres from 'postgres';

const enabled = process.env.SUBJECT_DISCOVERY_DB_INTEGRATION === '1';

const USER_A = randomUUID();
const USER_B = randomUUID();
const DOG_A = randomUUID();
const DOG_B = randomUUID();
const ASSESSMENT_A = randomUUID();
const RESPONSE_A = randomUUID();
const FACTOR_A = randomUUID();
const PRIOR_A = randomUUID();
const CONSENT_A = randomUUID();
const SESSION_A = randomUUID();
const MESSAGE_A = randomUUID();

let sql = null;
let lockConnection = null;
let discoverSubjectData = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgresModule }, discoveryModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/subject-discovery.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgresModule(process.env.DATABASE_URL, { max: 3 });
  lockConnection = postgresModule(process.env.DATABASE_URL, { max: 1 });
  discoverSubjectData = discoveryModule.discoverSubjectData;
  closeDatabase = dbModule.closeDatabase;
}

after(async () => {
  if (sql) {
    await sql`DELETE FROM eli_behavioral_priors WHERE id = ${PRIOR_A}`;
    await sql`DELETE FROM behavioral_factor_scores WHERE id = ${FACTOR_A}`;
    await sql`DELETE FROM behavioral_responses WHERE id = ${RESPONSE_A}`;
    await sql`DELETE FROM behavioral_assessments WHERE id = ${ASSESSMENT_A}`;
    await sql`DELETE FROM research_data_consents WHERE id = ${CONSENT_A}`;
    await sql`DELETE FROM auth_refresh_sessions WHERE id = ${SESSION_A}`;
    await sql`DELETE FROM ai_messages WHERE id = ${MESSAGE_A}`;
    await sql`DELETE FROM user_config WHERE user_id IN (${USER_A}, ${USER_B})`;
    await sql`DELETE FROM dogs WHERE id IN (${DOG_A}, ${DOG_B})`;
    await sql`DELETE FROM achievements WHERE user_id IN (${USER_A}, ${USER_B})`;
    await sql`DELETE FROM subscriptions WHERE user_id IN (${USER_A}, ${USER_B})`;
    await sql`DELETE FROM users WHERE id IN (${USER_A}, ${USER_B})`;
    await sql.end({ timeout: 5 });
  }
  if (lockConnection) await lockConnection.end({ timeout: 5 });
  if (closeDatabase) await closeDatabase();
});

async function waitForBlockedOperation(tx, blockerPid) {
  const deadline = Date.now() + 4_000;
  while (Date.now() < deadline) {
    await tx`SELECT pg_stat_clear_snapshot()`;
    const [row] = await tx`
      SELECT count(*)::int AS count
      FROM pg_stat_activity
      WHERE ${blockerPid} = ANY(pg_blocking_pids(pid))
    `;
    if (row.count >= 1) return;
    await delay(10);
  }
  assert.fail('Expected subject discovery to wait on the dog authority row lock');
}

async function snapshot() {
  const [row] = await sql`
    SELECT
      (SELECT count(*)::int FROM users WHERE id IN (${USER_A}, ${USER_B})) AS users,
      (SELECT count(*)::int FROM dogs WHERE id IN (${DOG_A}, ${DOG_B})) AS dogs,
      (SELECT count(*)::int FROM behavioral_assessments WHERE id = ${ASSESSMENT_A}) AS assessments,
      (SELECT count(*)::int FROM behavioral_responses WHERE id = ${RESPONSE_A}) AS responses,
      (SELECT count(*)::int FROM behavioral_factor_scores WHERE id = ${FACTOR_A}) AS factors,
      (SELECT count(*)::int FROM eli_behavioral_priors WHERE id = ${PRIOR_A}) AS priors,
      (SELECT count(*)::int FROM research_data_consents WHERE id = ${CONSENT_A}) AS consents,
      (SELECT count(*)::int FROM auth_refresh_sessions WHERE id = ${SESSION_A}) AS sessions
  `;
  return row;
}

test('PRIV-DISC-01 transactionally discovers current subject-linked persistence without mutation', {
  skip: !enabled,
  timeout: 30_000,
}, async (t) => {
  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES
      (${USER_A}, ${`disc-a-${USER_A}@example.test`}, 'test-only-a', 'Guardian A'),
      (${USER_B}, ${`disc-b-${USER_B}@example.test`}, 'test-only-b', 'Guardian B')
  `;

  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES
      (${DOG_A}, ${USER_A}, 'Dog A', 'Test', '2020-01-01', 'female', 20.0, 'FC2'),
      (${DOG_B}, ${USER_B}, 'Dog B', 'Test', '2021-01-01', 'male', 22.0, 'FC2')
  `;

  await sql`
    INSERT INTO subscriptions (user_id, plan, status)
    VALUES (${USER_A}, 'monthly', 'active')
  `;
  await sql`
    INSERT INTO achievements (user_id, type)
    VALUES (${USER_A}, 'discovery-test')
  `;
  await sql`
    INSERT INTO user_config (user_id, dog_id, config_key, config_value)
    VALUES (${USER_A}, ${DOG_A}, 'discovery-test', '{}'::jsonb)
  `;
  await sql`
    INSERT INTO ai_messages (id, category, target_user_id, dog_id, content)
    VALUES (${MESSAGE_A}, 'system', ${USER_A}, ${DOG_A}, 'discovery-test')
  `;
  await sql`
    INSERT INTO auth_refresh_sessions (
      id, user_id, family_id, token_hash, expires_at
    ) VALUES (
      ${SESSION_A}, ${USER_A}, ${randomUUID()},
      ${'a'.repeat(64)}, now() + interval '1 day'
    )
  `;
  await sql`
    INSERT INTO behavioral_assessments (
      id, dog_id, respondent_user_id, respondent_role,
      instrument_code, administration_mode, scientific_use_status, status
    ) VALUES (
      ${ASSESSMENT_A}, ${DOG_A}, ${USER_A}, 'owner',
      'TEST', 'standardized', 'unreviewed', 'in_progress'
    )
  `;
  await sql`
    INSERT INTO behavioral_responses (
      id, assessment_id, item_key, response_status, response_value, scale_min, scale_max
    ) VALUES (
      ${RESPONSE_A}, ${ASSESSMENT_A}, 'opaque-test-item', 'answered', 2, 0, 4
    )
  `;
  await sql`
    INSERT INTO behavioral_factor_scores (
      id, assessment_id, factor_key, score, scoring_method
    ) VALUES (
      ${FACTOR_A}, ${ASSESSMENT_A}, 'test-factor', 0.5, 'test-only'
    )
  `;
  await sql`
    INSERT INTO eli_behavioral_priors (
      id, dog_id, assessment_id, factor_score_id,
      source_factor_key, target_prior_key, prior_value, confidence,
      algorithm_version, status
    ) VALUES (
      ${PRIOR_A}, ${DOG_A}, ${ASSESSMENT_A}, ${FACTOR_A},
      'test-factor', 'test-prior', 0.25, 0.8, 'test-v1', 'candidate'
    )
  `;
  await sql`
    INSERT INTO research_data_consents (
      id, user_id, dog_id, consent_version, scope
    ) VALUES (
      ${CONSENT_A}, ${USER_A}, ${DOG_A}, 'test-v1', 'aggregate'
    )
  `;

  await t.test('stable discovery counts current core, AUTH and behavioral surfaces and marks later slices deferred', async () => {
    const before = await snapshot();
    const first = await discoverSubjectData(USER_A, DOG_A);

    assert.equal(first.ok, true);
    assert.deepEqual(first.subject.selectedDogIds, [DOG_A]);
    assert.equal(first.guardian.ownedDogs.count, 1);
    assert.equal(first.guardian.subscriptions.count, 1);
    assert.equal(first.guardian.achievements.count, 1);
    assert.equal(first.guardian.aiMessagesTargetingUser.count, 1);
    assert.equal(first.guardian.authRefreshSessions.count, 1);
    assert.equal(first.guardian.behavioralAssessmentsAsRespondent.count, 1);
    assert.equal(first.guardian.researchDataConsents.count, 1);
    assert.equal(first.guardian.userConfig.count, 1);

    assert.equal(first.dog.aiMessagesTargetingDog.count, 1);
    assert.equal(first.dog.eliUserConfig.count, 1);
    assert.equal(first.dog.behavioralAssessments.count, 1);
    assert.equal(first.dog.behavioralResponses.count, 1);
    assert.equal(first.dog.behavioralFactorScores.count, 1);
    assert.equal(first.dog.eliBehavioralPriors.count, 1);
    assert.equal(first.dog.researchDataConsents.count, 1);

    assert.equal(first.externalOrUnresolved.community.status, 'INTEGRATION_DEFERRED');
    assert.equal(first.externalOrUnresolved.professionalSharing.status, 'INTEGRATION_DEFERRED');
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

  await t.test('account-wide discovery selects only the current locked owned-dog set', async () => {
    const result = await discoverSubjectData(USER_A);
    assert.equal(result.ok, true);
    assert.deepEqual(result.subject.selectedDogIds, [DOG_A]);
    assert.deepEqual(result.guardian.ownedDogs.ids, [DOG_A]);
  });

  await t.test('ownership transfer that wins before discovery authority denies the former Owner', async () => {
    let pending;
    try {
      await lockConnection.begin(async (tx) => {
        const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
        await tx`UPDATE dogs SET owner_id = ${USER_B} WHERE id = ${DOG_A}`;

        pending = discoverSubjectData(USER_A, DOG_A);
        await waitForBlockedOperation(tx, pid);
      });

      const transferResult = await pending;
      assert.equal(transferResult.ok, false);
      assert.ok(
        transferResult.error === 'dog_not_found' || transferResult.error === 'database_unavailable',
        `former Owner must fail closed after transfer, got ${transferResult.error}`,
      );
    } finally {
      if (pending) await Promise.allSettled([pending]);
      await sql`UPDATE dogs SET owner_id = ${USER_A} WHERE id = ${DOG_A}`;
    }
  });

  await t.test('authority lock timeout fails closed instead of returning stale discovery', async () => {
    let result;

    await lockConnection.begin(async (tx) => {
      const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
      await tx`UPDATE dogs SET owner_id = ${USER_A} WHERE id = ${DOG_A}`;

      const pending = discoverSubjectData(USER_A, DOG_A);
      await waitForBlockedOperation(tx, pid);

      result = await Promise.race([
        pending,
        delay(8_000).then(() => assert.fail('subject discovery exceeded bounded lock timeout')),
      ]);

      assert.deepEqual(result, {
        ok: false,
        error: 'database_unavailable',
        retryable: true,
      });
    });

    assert.deepEqual(await snapshot(), {
      users: 2,
      dogs: 2,
      assessments: 1,
      responses: 1,
      factors: 1,
      priors: 1,
      consents: 1,
      sessions: 1,
    });
  });
});
