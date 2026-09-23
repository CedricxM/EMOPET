import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

const enabled = process.env.ELI_BEHAVIORAL_AUTHORITY_DB_INTEGRATION === '1';

const USER_ID = randomUUID();
const DOG_ID = randomUUID();
const ASSESSMENT_ID = randomUUID();
const OTHER_ASSESSMENT_ID = randomUUID();
const FACTOR_ID = randomUUID();
const OTHER_FACTOR_ID = randomUUID();

const HOLD_AUTHORITY_ID = randomUUID();
const GO_OTHER_AUTHORITY_ID = randomUUID();
const GO_EXACT_AUTHORITY_ID = randomUUID();

const CANDIDATE_PRIOR_ID = randomUUID();
const HOLD_PRIOR_ID = randomUUID();
const ACTIVE_PRIOR_ID = randomUUID();

let sql = null;

if (enabled) sql = postgres(process.env.DATABASE_URL, { max: 2 });

after(async () => {
  if (!sql) return;
  await sql`DELETE FROM eli_behavioral_priors WHERE id IN (
    ${CANDIDATE_PRIOR_ID}, ${HOLD_PRIOR_ID}, ${ACTIVE_PRIOR_ID}
  )`;
  await sql`DELETE FROM eli_behavioral_mapping_authorities WHERE id IN (
    ${HOLD_AUTHORITY_ID}, ${GO_OTHER_AUTHORITY_ID}, ${GO_EXACT_AUTHORITY_ID}
  )`;
  await sql`DELETE FROM behavioral_factor_scores WHERE id IN (${FACTOR_ID}, ${OTHER_FACTOR_ID})`;
  await sql`DELETE FROM behavioral_assessments WHERE id IN (${ASSESSMENT_ID}, ${OTHER_ASSESSMENT_ID})`;
  await sql`DELETE FROM dogs WHERE id = ${DOG_ID}`;
  await sql`DELETE FROM users WHERE id = ${USER_ID}`;
  await sql.end({ timeout: 5 });
});

async function expectViolation(action, expectedCode, constraintName) {
  await assert.rejects(action, (error) => {
    assert.equal(error?.code, expectedCode);
    if (constraintName) assert.equal(error?.constraint_name, constraintName);
    return true;
  });
}

test('ELI-BEHAV-01 requires exact reviewed GO authority before an active behavioural prior can exist', {
  skip: !enabled,
  timeout: 20_000,
}, async (t) => {
  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (${USER_ID}, ${`eli-behav-${USER_ID}@example.test`}, 'test-only', 'ELI Behaviour Fixture')
  `;

  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES (${DOG_ID}, ${USER_ID}, 'Fixture Dog', 'Test', '2020-01-01', 'female', 20.0, 'FC2')
  `;

  await sql`
    INSERT INTO behavioral_assessments (
      id, dog_id, respondent_user_id, respondent_role,
      instrument_code, instrument_version,
      administration_mode, scientific_use_status, status
    ) VALUES
      (
        ${ASSESSMENT_ID}, ${DOG_ID}, ${USER_ID}, 'owner',
        'TEST-BEHAV', 'v1', 'standardized', 'scoring_allowed', 'complete'
      ),
      (
        ${OTHER_ASSESSMENT_ID}, ${DOG_ID}, ${USER_ID}, 'owner',
        'TEST-BEHAV', 'v1', 'standardized', 'scoring_allowed', 'complete'
      )
  `;

  await sql`
    INSERT INTO behavioral_factor_scores (
      id, assessment_id, factor_key, score, scoring_method,
      scoring_version, eligible_for_eli_prior
    ) VALUES
      (
        ${FACTOR_ID}, ${ASSESSMENT_ID}, 'test-factor', 0.5, 'test-only',
        'score-v1', true
      ),
      (
        ${OTHER_FACTOR_ID}, ${OTHER_ASSESSMENT_ID}, 'other-factor', 0.6, 'test-only',
        'score-v1', true
      )
  `;

  await t.test('candidate prior may exist without mapping authority', async () => {
    await sql`
      INSERT INTO eli_behavioral_priors (
        id, dog_id, assessment_id, factor_score_id,
        source_instrument_code, source_instrument_version,
        source_factor_key, target_prior_key, prior_value, confidence,
        algorithm_version, status
      ) VALUES (
        ${CANDIDATE_PRIOR_ID}, ${DOG_ID}, ${ASSESSMENT_ID}, ${FACTOR_ID},
        'TEST-BEHAV', 'v1',
        'test-factor', 'test-prior', 0.25, 0.8,
        'map-v1', 'candidate'
      )
    `;
  });

  await t.test('eligible factor alone cannot create an active prior', async () => {
    await expectViolation(
      () => sql`
        INSERT INTO eli_behavioral_priors (
          dog_id, assessment_id, factor_score_id,
          source_instrument_code, source_instrument_version,
          source_factor_key, target_prior_key, prior_value, confidence,
          algorithm_version, status
        ) VALUES (
          ${DOG_ID}, ${ASSESSMENT_ID}, ${FACTOR_ID},
          'TEST-BEHAV', 'v1',
          'test-factor', 'test-prior', 0.25, 0.8,
          'map-v1', 'active'
        )
      `,
      '23514',
      'chk_eli_behavioral_prior_active_authority',
    );
  });

  await t.test('factor score must match the same assessment and source factor', async () => {
    await expectViolation(
      () => sql`
        INSERT INTO eli_behavioral_priors (
          dog_id, assessment_id, factor_score_id,
          source_instrument_code, source_instrument_version,
          source_factor_key, target_prior_key, prior_value, confidence,
          algorithm_version, status
        ) VALUES (
          ${DOG_ID}, ${ASSESSMENT_ID}, ${OTHER_FACTOR_ID},
          'TEST-BEHAV', 'v1',
          'test-factor', 'test-prior', 0.25, 0.8,
          'map-v1', 'candidate'
        )
      `,
      '23503',
      'fk_eli_behavioral_prior_factor_binding',
    );
  });

  await t.test('HOLD authority can back governance evidence but not active state', async () => {
    await sql`
      INSERT INTO eli_behavioral_mapping_authorities (
        id, instrument_code, instrument_version,
        source_factor_key, target_prior_key, algorithm_version,
        authority_version, evidence_reference, disposition, reason
      ) VALUES (
        ${HOLD_AUTHORITY_ID}, 'TEST-BEHAV', 'v1',
        'test-factor', 'test-prior', 'map-v1',
        'auth-v1', 'controlled://test/hold-evidence', 'HOLD',
        'Synthetic HOLD authority for integration testing only.'
      )
    `;

    await sql`
      INSERT INTO eli_behavioral_priors (
        id, dog_id, assessment_id, factor_score_id,
        source_instrument_code, source_instrument_version,
        source_factor_key, target_prior_key, prior_value, confidence,
        algorithm_version, status,
        mapping_authority_id, mapping_authority_disposition
      ) VALUES (
        ${HOLD_PRIOR_ID}, ${DOG_ID}, ${ASSESSMENT_ID}, ${FACTOR_ID},
        'TEST-BEHAV', 'v1',
        'test-factor', 'test-prior', 0.25, 0.8,
        'map-v1', 'candidate',
        ${HOLD_AUTHORITY_ID}, 'HOLD'
      )
    `;

    await expectViolation(
      () => sql`
        UPDATE eli_behavioral_priors
        SET status = 'active'
        WHERE id = ${HOLD_PRIOR_ID}
      `,
      '23514',
      'chk_eli_behavioral_prior_active_authority',
    );
  });

  await t.test('GO authority itself requires explicit review evidence', async () => {
    await expectViolation(
      () => sql`
        INSERT INTO eli_behavioral_mapping_authorities (
          instrument_code, instrument_version,
          source_factor_key, target_prior_key, algorithm_version,
          authority_version, evidence_reference, disposition, reason
        ) VALUES (
          'TEST-BEHAV', 'v1',
          'test-factor', 'test-prior', 'map-v1',
          'invalid-go-v1', 'controlled://test/incomplete-go', 'GO',
          'Synthetic incomplete GO must fail.'
        )
      `,
      '23514',
      'chk_eli_behavioral_mapping_authority_go_review',
    );
  });

  await t.test('GO authority for a different mapping cannot be reused', async () => {
    await sql`
      INSERT INTO eli_behavioral_mapping_authorities (
        id, instrument_code, instrument_version,
        source_factor_key, target_prior_key, algorithm_version,
        authority_version, evidence_reference, disposition,
        reviewed_at, reviewer_role, reason
      ) VALUES (
        ${GO_OTHER_AUTHORITY_ID}, 'TEST-BEHAV', 'v1',
        'test-factor', 'other-prior', 'map-v1',
        'auth-other-v1', 'controlled://test/other-go', 'GO',
        now(), 'TEST_SCIENCE_REVIEWER',
        'Synthetic GO for another target only.'
      )
    `;

    await expectViolation(
      () => sql`
        INSERT INTO eli_behavioral_priors (
          dog_id, assessment_id, factor_score_id,
          source_instrument_code, source_instrument_version,
          source_factor_key, target_prior_key, prior_value, confidence,
          algorithm_version, status,
          mapping_authority_id, mapping_authority_disposition
        ) VALUES (
          ${DOG_ID}, ${ASSESSMENT_ID}, ${FACTOR_ID},
          'TEST-BEHAV', 'v1',
          'test-factor', 'test-prior', 0.25, 0.8,
          'map-v1', 'active',
          ${GO_OTHER_AUTHORITY_ID}, 'GO'
        )
      `,
      '23503',
      'fk_eli_behavioral_prior_mapping_authority',
    );
  });

  await t.test('prior instrument/version must match its assessment', async () => {
    await sql`
      INSERT INTO eli_behavioral_mapping_authorities (
        id, instrument_code, instrument_version,
        source_factor_key, target_prior_key, algorithm_version,
        authority_version, evidence_reference, disposition,
        reviewed_at, reviewer_role, reason
      ) VALUES (
        ${GO_EXACT_AUTHORITY_ID}, 'TEST-BEHAV', 'v1',
        'test-factor', 'test-prior', 'map-v1',
        'auth-exact-v1', 'controlled://test/exact-go', 'GO',
        now(), 'TEST_SCIENCE_REVIEWER',
        'Synthetic exact GO authority for integration testing only.'
      )
    `;

    await expectViolation(
      () => sql`
        INSERT INTO eli_behavioral_priors (
          dog_id, assessment_id, factor_score_id,
          source_instrument_code, source_instrument_version,
          source_factor_key, target_prior_key, prior_value, confidence,
          algorithm_version, status,
          mapping_authority_id, mapping_authority_disposition
        ) VALUES (
          ${DOG_ID}, ${ASSESSMENT_ID}, ${FACTOR_ID},
          'OTHER-INSTRUMENT', 'v1',
          'test-factor', 'test-prior', 0.25, 0.8,
          'map-v1', 'active',
          ${GO_EXACT_AUTHORITY_ID}, 'GO'
        )
      `,
      '23503',
      'fk_eli_behavioral_prior_assessment_instrument',
    );
  });

  await t.test('only exact reviewed GO authority allows active prior', async () => {
    await sql`
      INSERT INTO eli_behavioral_priors (
        id, dog_id, assessment_id, factor_score_id,
        source_instrument_code, source_instrument_version,
        source_factor_key, target_prior_key, prior_value, confidence,
        algorithm_version, status,
        mapping_authority_id, mapping_authority_disposition
      ) VALUES (
        ${ACTIVE_PRIOR_ID}, ${DOG_ID}, ${ASSESSMENT_ID}, ${FACTOR_ID},
        'TEST-BEHAV', 'v1',
        'test-factor', 'test-prior', 0.25, 0.8,
        'map-v1', 'active',
        ${GO_EXACT_AUTHORITY_ID}, 'GO'
      )
    `;

    const [row] = await sql`
      SELECT status, mapping_authority_id, mapping_authority_disposition
      FROM eli_behavioral_priors
      WHERE id = ${ACTIVE_PRIOR_ID}
    `;

    assert.equal(row.status, 'active');
    assert.equal(row.mapping_authority_id, GO_EXACT_AUTHORITY_ID);
    assert.equal(row.mapping_authority_disposition, 'GO');
  });
});
