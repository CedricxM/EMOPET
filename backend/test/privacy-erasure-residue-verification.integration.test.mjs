import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const enabled = process.env.ERASURE_RESIDUE_DB_INTEGRATION === '1';

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
const COPRESENCE_A = randomUUID();

let sql = null;
let closeDatabase = null;
let captureErasureVerificationSnapshot = null;
let verifyErasureResidue = null;

if (enabled) {
  const [{ default: postgresModule }, service, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/erasure-residue-verification.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgresModule(process.env.DATABASE_URL, { max: 2 });
  closeDatabase = dbModule.closeDatabase;
  captureErasureVerificationSnapshot = service.captureErasureVerificationSnapshot;
  verifyErasureResidue = service.verifyErasureResidue;
}

async function cleanup() {
  if (!sql) return;

  await sql`DELETE FROM eli_behavioral_priors WHERE id = ${PRIOR_A}`;
  await sql`DELETE FROM behavioral_factor_scores WHERE id = ${FACTOR_A}`;
  await sql`DELETE FROM behavioral_responses WHERE id = ${RESPONSE_A}`;
  await sql`DELETE FROM behavioral_assessments WHERE id = ${ASSESSMENT_A}`;
  await sql`DELETE FROM research_data_consents WHERE id = ${CONSENT_A}`;
  await sql`DELETE FROM auth_refresh_sessions WHERE id = ${SESSION_A}`;
  await sql`DELETE FROM ai_messages WHERE id = ${MESSAGE_A}`;
  await sql`DELETE FROM copresence_events WHERE id = ${COPRESENCE_A}`;
  await sql`DELETE FROM user_config WHERE user_id IN (${USER_A}, ${USER_B})`;
  await sql`DELETE FROM achievements WHERE user_id IN (${USER_A}, ${USER_B})`;
  await sql`DELETE FROM subscriptions WHERE user_id IN (${USER_A}, ${USER_B})`;
  await sql`DELETE FROM dogs WHERE id IN (${DOG_A}, ${DOG_B})`;
  await sql`DELETE FROM users WHERE id IN (${USER_A}, ${USER_B})`;
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('erasure residue service contains no destructive persistence capability', async () => {
  const source = await readFile(
    new URL('../api/services/erasure-residue-verification.ts', import.meta.url),
    'utf8',
  );

  for (const forbidden of [
    '.delete(',
    '.update(',
    '.insert(',
    'DELETE FROM',
    'UPDATE ',
    'INSERT INTO',
    'fetch(',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }

  assert.equal(source.includes("mode: 'VERIFY_ONLY'"), true);
  assert.equal(source.includes('destructiveActionAuthorized: false'), true);
  assert.equal(source.includes('claimsCompleteErasure: false'), true);
});

test('non-SQL verification surfaces remain exactly aligned with the canonical residue contract', async () => {
  const contract = JSON.parse(await readFile(
    new URL('../../config/privacy/erasure-residue-verification-contract.json', import.meta.url),
    'utf8',
  ));

  assert.deepEqual(
    contract.nonSqlProbes.map((row) => row.surface).sort(),
    [
      'ANALYTICS_TELEMETRY',
      'BACKUPS',
      'CACHES_SEARCH_INDEXES',
      'OBJECT_MEDIA_STORAGE',
      'PROVIDER_HELD_COPIES',
    ],
  );
  assert.equal(contract.claimsExecutableErasure, false);
  assert.equal(contract.claimsCompleteErasure, false);
});

test('snapshot capture and residue verification survive parent deletion without claiming complete erasure', {
  skip: !enabled,
  timeout: 30_000,
}, async () => {
  await cleanup();

  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES
      (${USER_A}, ${`erase-a-${USER_A}@example.test`}, 'test-only-a', 'Guardian A'),
      (${USER_B}, ${`erase-b-${USER_B}@example.test`}, 'test-only-b', 'Guardian B')
  `;

  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES
      (${DOG_A}, ${USER_A}, 'Dog A', 'Test', '2020-01-01', 'female', 20.0, 'FC2'),
      (${DOG_B}, ${USER_B}, 'Dog B', 'Test', '2021-01-01', 'male', 21.0, 'FC2')
  `;

  await sql`
    INSERT INTO subscriptions (user_id, plan, status)
    VALUES (${USER_A}, 'monthly', 'active')
  `;
  await sql`
    INSERT INTO achievements (user_id, type)
    VALUES (${USER_A}, 'erasure-test')
  `;
  await sql`
    INSERT INTO user_config (user_id, dog_id, config_key, config_value)
    VALUES (${USER_A}, ${DOG_A}, 'erasure-test', '{}'::jsonb)
  `;
  await sql`
    INSERT INTO ai_messages (id, category, target_user_id, dog_id, content)
    VALUES (${MESSAGE_A}, 'system', ${USER_A}, ${DOG_A}, 'erasure-test')
  `;
  await sql`
    INSERT INTO auth_refresh_sessions (
      id, user_id, family_id, token_hash, expires_at
    ) VALUES (
      ${SESSION_A}, ${USER_A}, ${randomUUID()},
      ${'b'.repeat(64)}, now() + interval '1 day'
    )
  `;
  await sql`
    INSERT INTO behavioral_assessments (
      id, dog_id, respondent_user_id, respondent_role,
      instrument_code, administration_mode, scientific_use_status, status
    ) VALUES (
      ${ASSESSMENT_A}, ${DOG_A}, ${USER_A}, 'owner',
      'ERASURE_TEST', 'standardized', 'unreviewed', 'in_progress'
    )
  `;
  await sql`
    INSERT INTO behavioral_responses (
      id, assessment_id, item_key, response_status, response_value, scale_min, scale_max
    ) VALUES (
      ${RESPONSE_A}, ${ASSESSMENT_A}, 'test-item', 'answered', 1, 0, 4
    )
  `;
  await sql`
    INSERT INTO behavioral_factor_scores (
      id, assessment_id, factor_key, score, scoring_method
    ) VALUES (
      ${FACTOR_A}, ${ASSESSMENT_A}, 'test-factor', 0.4, 'test-only'
    )
  `;
  await sql`
    INSERT INTO eli_behavioral_priors (
      id, dog_id, assessment_id, factor_score_id,
      source_factor_key, target_prior_key, prior_value, confidence,
      algorithm_version, status
    ) VALUES (
      ${PRIOR_A}, ${DOG_A}, ${ASSESSMENT_A}, ${FACTOR_A},
      'test-factor', 'test-prior', 0.2, 0.8, 'test-v1', 'candidate'
    )
  `;
  await sql`
    INSERT INTO research_data_consents (
      id, user_id, dog_id, consent_version, scope
    ) VALUES (
      ${CONSENT_A}, ${USER_A}, ${DOG_A}, 'test-v1', 'aggregate'
    )
  `;
  await sql`
    INSERT INTO copresence_events (id, dog_a_id, dog_b_id, occurred_at)
    VALUES (${COPRESENCE_A}, ${DOG_A}, ${DOG_B}, now())
  `;

  const captured = await captureErasureVerificationSnapshot(USER_A);
  assert.equal(captured.ok, true);
  assert.deepEqual(captured.snapshot, {
    schemaVersion: 'emopet-erasure-verification-snapshot-v1',
    scope: 'ACCOUNT',
    accountId: USER_A,
    dogIds: [DOG_A],
    assessmentIds: [ASSESSMENT_A],
    factorScoreIds: [FACTOR_A],
  });

  const before = await verifyErasureResidue(captured.snapshot);
  assert.equal(before.ok, true);
  assert.equal(before.mode, 'VERIFY_ONLY');
  assert.equal(before.status, 'SQL_RESIDUE_PRESENT');
  assert.equal(before.destructiveActionAuthorized, false);
  assert.equal(before.claimsCompleteErasure, false);
  assert.equal(before.nonSqlProbes.length, 5);
  assert.equal(before.nonSqlProbes.every((row) => row.status === 'UNVERIFIED'), true);

  const probesBefore = Object.fromEntries(
    [
      ...before.rootProbes,
      ...before.accountRelationProbes,
      ...before.dogRelationProbes,
      ...before.transitiveRelationProbes,
    ].map((row) => [row.key, row.count]),
  );
  assert.equal(probesBefore['users.id'], 1);
  assert.equal(probesBefore['dogs.id'], 1);
  assert.equal(probesBefore['subscriptions.user_id'], 1);
  assert.equal(probesBefore['ai_messages.target_user_id'], 1);
  assert.equal(probesBefore['ai_messages.dog_id'], 1);
  assert.equal(probesBefore['behavioral_assessments.dog_id'], 1);
  assert.equal(probesBefore['behavioral_responses.assessment_id'], 1);
  assert.equal(probesBefore['behavioral_factor_scores.assessment_id'], 1);
  assert.equal(probesBefore['eli_behavioral_priors.factor_score_id'], 1);
  assert.equal(probesBefore['copresence_events.dog_a_id'], 1);

  const dogOnly = await captureErasureVerificationSnapshot(USER_A, DOG_A);
  assert.equal(dogOnly.ok, true);
  assert.equal(dogOnly.snapshot.scope, 'DOG');
  const dogBefore = await verifyErasureResidue(dogOnly.snapshot);
  assert.equal(dogBefore.ok, true);
  assert.deepEqual(dogBefore.accountRelationProbes, []);
  assert.deepEqual(dogBefore.rootProbes.map((row) => row.key), ['dogs.id']);
  assert.equal(dogBefore.status, 'SQL_RESIDUE_PRESENT');

  assert.deepEqual(
    await captureErasureVerificationSnapshot(USER_A, DOG_B),
    { ok: false, error: 'dog_not_found' },
  );
  assert.deepEqual(
    await captureErasureVerificationSnapshot('not-a-uuid'),
    { ok: false, error: 'invalid_user_id' },
  );

  // Test-only simulation of a future external executor. The service above
  // itself has no destructive capability.
  await sql`DELETE FROM eli_behavioral_priors WHERE id = ${PRIOR_A}`;
  await sql`DELETE FROM behavioral_factor_scores WHERE id = ${FACTOR_A}`;
  await sql`DELETE FROM behavioral_responses WHERE id = ${RESPONSE_A}`;
  await sql`DELETE FROM behavioral_assessments WHERE id = ${ASSESSMENT_A}`;
  await sql`DELETE FROM research_data_consents WHERE id = ${CONSENT_A}`;
  await sql`DELETE FROM auth_refresh_sessions WHERE id = ${SESSION_A}`;
  await sql`DELETE FROM ai_messages WHERE id = ${MESSAGE_A}`;
  await sql`DELETE FROM copresence_events WHERE id = ${COPRESENCE_A}`;
  await sql`DELETE FROM user_config WHERE user_id = ${USER_A}`;
  await sql`DELETE FROM achievements WHERE user_id = ${USER_A}`;
  await sql`DELETE FROM subscriptions WHERE user_id = ${USER_A}`;
  await sql`DELETE FROM dogs WHERE id = ${DOG_A}`;
  await sql`DELETE FROM users WHERE id = ${USER_A}`;

  const after = await verifyErasureResidue(captured.snapshot);
  assert.equal(after.ok, true);
  assert.equal(after.status, 'SQL_CLEAR_NON_SQL_UNVERIFIED');
  assert.equal(after.nonZeroSqlProbeCount, 0);
  assert.equal(after.claimsCompleteErasure, false);
  assert.equal(after.destructiveActionAuthorized, false);
  assert.equal(
    [
      ...after.rootProbes,
      ...after.accountRelationProbes,
      ...after.dogRelationProbes,
      ...after.transitiveRelationProbes,
    ].every((row) => row.count === 0),
    true,
  );
  assert.equal(after.nonSqlProbes.every((row) => row.status === 'UNVERIFIED'), true);
});
