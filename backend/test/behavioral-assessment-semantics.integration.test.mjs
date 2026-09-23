import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

const enabled = process.env.BEHAVIORAL_ASSESSMENT_DB_INTEGRATION === '1';

const USER_ID = randomUUID();
const DOG_ID = randomUUID();
const ASSESSMENT_UNKNOWN = randomUUID();
const ASSESSMENT_MULTI = randomUUID();
const RESPONSE_NOT_OBSERVED = randomUUID();
const RESPONSE_ANSWERED = randomUUID();

let sql = null;

if (enabled) {
  sql = postgres(process.env.DATABASE_URL, { max: 2 });
}

after(async () => {
  if (!sql) return;
  await sql`DELETE FROM behavioral_responses WHERE id IN (${RESPONSE_NOT_OBSERVED}, ${RESPONSE_ANSWERED})`;
  await sql`DELETE FROM behavioral_assessments WHERE id IN (${ASSESSMENT_UNKNOWN}, ${ASSESSMENT_MULTI})`;
  await sql`DELETE FROM dogs WHERE id = ${DOG_ID}`;
  await sql`DELETE FROM users WHERE id = ${USER_ID}`;
  await sql.end({ timeout: 5 });
});

async function expectConstraintViolation(action, constraintName) {
  await assert.rejects(action, (error) => {
    assert.equal(error?.code, '23514');
    if (constraintName) assert.equal(error?.constraint_name, constraintName);
    return true;
  });
}

test('BEHAV-DATA-01 preserves response applicability and household context semantics', {
  skip: !enabled,
  timeout: 20_000,
}, async (t) => {
  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (${USER_ID}, ${`behav-${USER_ID}@example.test`}, 'test-only', 'Behaviour Fixture')
  `;

  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES (${DOG_ID}, ${USER_ID}, 'Fixture Dog', 'Test', '2020-01-01', 'female', 20.0, 'FC2')
  `;

  await t.test('unknown household context remains nullable without inventing a dog count', async () => {
    await sql`
      INSERT INTO behavioral_assessments (
        id, dog_id, respondent_user_id, respondent_role,
        instrument_code, administration_mode, scientific_use_status, status
      ) VALUES (
        ${ASSESSMENT_UNKNOWN}, ${DOG_ID}, ${USER_ID}, 'owner',
        'TEST', 'standardized', 'unreviewed', 'in_progress'
      )
    `;

    const [row] = await sql`
      SELECT household_dog_count, household_context_source, household_context_recorded_at
      FROM behavioral_assessments
      WHERE id = ${ASSESSMENT_UNKNOWN}
    `;

    assert.equal(row.household_dog_count, null);
    assert.equal(row.household_context_source, 'unknown');
    assert.equal(row.household_context_recorded_at, null);
  });

  await t.test('known multi-dog household context is snapshotted with provenance', async () => {
    await sql`
      INSERT INTO behavioral_assessments (
        id, dog_id, respondent_user_id, respondent_role,
        instrument_code, administration_mode, scientific_use_status, status,
        household_dog_count, household_context_source, household_context_recorded_at
      ) VALUES (
        ${ASSESSMENT_MULTI}, ${DOG_ID}, ${USER_ID}, 'owner',
        'TEST', 'standardized', 'unreviewed', 'in_progress',
        2, 'respondent_reported', now()
      )
    `;

    const [row] = await sql`
      SELECT household_dog_count, household_context_source
      FROM behavioral_assessments
      WHERE id = ${ASSESSMENT_MULTI}
    `;

    assert.equal(row.household_dog_count, 2);
    assert.equal(row.household_context_source, 'respondent_reported');
  });

  await t.test('zero or negative household counts fail closed', async () => {
    await expectConstraintViolation(
      () => sql`
        INSERT INTO behavioral_assessments (
          dog_id, respondent_user_id, respondent_role,
          instrument_code, administration_mode, scientific_use_status, status,
          household_dog_count, household_context_source, household_context_recorded_at
        ) VALUES (
          ${DOG_ID}, ${USER_ID}, 'owner',
          'TEST-ZERO', 'standardized', 'unreviewed', 'in_progress',
          0, 'respondent_reported', now()
        )
      `,
      'chk_behavioral_assessment_household_context',
    );

    await expectConstraintViolation(
      () => sql`
        INSERT INTO behavioral_assessments (
          dog_id, respondent_user_id, respondent_role,
          instrument_code, administration_mode, scientific_use_status, status,
          household_dog_count, household_context_source, household_context_recorded_at
        ) VALUES (
          ${DOG_ID}, ${USER_ID}, 'owner',
          'TEST-NEG', 'standardized', 'unreviewed', 'in_progress',
          -1, 'respondent_reported', now()
        )
      `,
      'chk_behavioral_assessment_household_context',
    );
  });

  await t.test('not_observed is distinct from an observed zero', async () => {
    await sql`
      INSERT INTO behavioral_responses (
        id, assessment_id, item_key, response_status, response_value, scale_min, scale_max
      ) VALUES (
        ${RESPONSE_NOT_OBSERVED}, ${ASSESSMENT_MULTI}, 'opaque-not-observed',
        'not_observed', NULL, 0, 4
      )
    `;

    const [row] = await sql`
      SELECT response_status, response_value
      FROM behavioral_responses
      WHERE id = ${RESPONSE_NOT_OBSERVED}
    `;

    assert.equal(row.response_status, 'not_observed');
    assert.equal(row.response_value, null);

    await expectConstraintViolation(
      () => sql`
        INSERT INTO behavioral_responses (
          assessment_id, item_key, response_status, response_value, scale_min, scale_max
        ) VALUES (
          ${ASSESSMENT_MULTI}, 'opaque-invalid-not-observed',
          'not_observed', 0, 0, 4
        )
      `,
      'chk_behavioral_response_scale',
    );
  });

  await t.test('answered responses still require an in-range numeric value', async () => {
    await sql`
      INSERT INTO behavioral_responses (
        id, assessment_id, item_key, response_status, response_value, scale_min, scale_max
      ) VALUES (
        ${RESPONSE_ANSWERED}, ${ASSESSMENT_MULTI}, 'opaque-answered',
        'answered', 0, 0, 4
      )
    `;

    await expectConstraintViolation(
      () => sql`
        INSERT INTO behavioral_responses (
          assessment_id, item_key, response_status, response_value, scale_min, scale_max
        ) VALUES (
          ${ASSESSMENT_MULTI}, 'opaque-answered-null',
          'answered', NULL, 0, 4
        )
      `,
      'chk_behavioral_response_scale',
    );

    await expectConstraintViolation(
      () => sql`
        INSERT INTO behavioral_responses (
          assessment_id, item_key, response_status, response_value, scale_min, scale_max
        ) VALUES (
          ${ASSESSMENT_MULTI}, 'opaque-answered-out-of-range',
          'answered', 5, 0, 4
        )
      `,
      'chk_behavioral_response_scale',
    );
  });
});
