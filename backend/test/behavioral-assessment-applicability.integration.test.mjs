import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import postgres from 'postgres';

const enabled = process.env.BEHAVIORAL_ASSESSMENT_DB_INTEGRATION === '1';

const USER_ID = randomUUID();
const DOG_ID = randomUUID();
const ASSESSMENT_ID = randomUUID();

let sql = null;

if (enabled) {
  sql = postgres(process.env.DATABASE_URL, { max: 1 });
}

after(async () => {
  if (!sql) return;
  await sql`DELETE FROM behavioral_responses WHERE assessment_id = ${ASSESSMENT_ID}`;
  await sql`DELETE FROM behavioral_assessments WHERE id = ${ASSESSMENT_ID}`;
  await sql`DELETE FROM dogs WHERE id = ${DOG_ID}`;
  await sql`DELETE FROM users WHERE id = ${USER_ID}`;
  await sql.end({ timeout: 5 });
});

test('BEHAV-DATA-01 preserves applicability states and household context without zero coercion', {
  skip: !enabled,
  timeout: 30_000,
}, async () => {
  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (${USER_ID}, ${'behav-' + USER_ID + '@example.test'}, 'test-only', 'Behavior Test')
  `;

  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES (${DOG_ID}, ${USER_ID}, 'Dog', 'Test', '2020-01-01', 'female', 20.0, 'FC2')
  `;

  await sql`
    INSERT INTO behavioral_assessments (
      id, dog_id, respondent_user_id, respondent_role,
      instrument_code, administration_mode, scientific_use_status, status,
      household_dog_count, household_context_version,
      household_context_captured_at, cohabitation_context
    ) VALUES (
      ${ASSESSMENT_ID}, ${DOG_ID}, ${USER_ID}, 'owner',
      'TEST', 'standardized', 'unreviewed', 'in_progress',
      1, 'household-context-v1', now(), '{"multiDog":false}'::jsonb
    )
  `;

  const [assessment] = await sql`
    SELECT household_dog_count, household_context_version,
           household_context_captured_at, cohabitation_context
    FROM behavioral_assessments
    WHERE id = ${ASSESSMENT_ID}
  `;

  assert.equal(assessment.household_dog_count, 1);
  assert.equal(assessment.household_context_version, 'household-context-v1');
  assert.equal(assessment.cohabitation_context.multiDog, false);
  assert.ok(assessment.household_context_captured_at);

  await sql`
    INSERT INTO behavioral_responses (
      id, assessment_id, item_key, response_status, response_value, scale_min, scale_max
    ) VALUES (
      ${randomUUID()}, ${ASSESSMENT_ID}, 'answered-zero', 'answered', 0, 0, 4
    )
  `;

  for (const status of ['not_applicable', 'not_observed', 'skipped', 'missing']) {
    await sql`
      INSERT INTO behavioral_responses (
        id, assessment_id, item_key, response_status, response_value, scale_min, scale_max
      ) VALUES (
        ${randomUUID()}, ${ASSESSMENT_ID}, ${'null-' + status}, ${status}, NULL, 0, 4
      )
    `;

    await assert.rejects(
      sql`
        INSERT INTO behavioral_responses (
          id, assessment_id, item_key, response_status, response_value, scale_min, scale_max
        ) VALUES (
          ${randomUUID()}, ${ASSESSMENT_ID}, ${'illegal-zero-' + status}, ${status}, 0, 0, 4
        )
      `,
      /chk_behavioral_response_scale/,
      status + ' must reject numeric zero because zero is a real answered value',
    );
  }

  await assert.rejects(
    sql`
      INSERT INTO behavioral_assessments (
        id, dog_id, respondent_user_id, respondent_role,
        instrument_code, administration_mode, scientific_use_status, status,
        household_dog_count, household_context_version, household_context_captured_at
      ) VALUES (
        ${randomUUID()}, ${DOG_ID}, ${USER_ID}, 'owner',
        'TEST', 'standardized', 'unreviewed', 'in_progress',
        0, 'household-context-v1', now()
      )
    `,
    /chk_behavioral_assessment_household_dog_count/,
    'household dog count zero must fail even when snapshot authority is otherwise complete',
  );

  await assert.rejects(
    sql`
      INSERT INTO behavioral_assessments (
        id, dog_id, respondent_user_id, respondent_role,
        instrument_code, administration_mode, scientific_use_status, status,
        household_dog_count
      ) VALUES (
        ${randomUUID()}, ${DOG_ID}, ${USER_ID}, 'owner',
        'TEST', 'standardized', 'unreviewed', 'in_progress',
        2
      )
    `,
    /chk_behavioral_assessment_context_authority/,
    'a household snapshot cannot be recorded without version + capture time',
  );

  const rows = await sql`
    SELECT item_key, response_status, response_value
    FROM behavioral_responses
    WHERE assessment_id = ${ASSESSMENT_ID}
    ORDER BY item_key
  `;

  const answeredZero = rows.find((row) => row.item_key === 'answered-zero');
  assert.equal(answeredZero.response_status, 'answered');
  assert.equal(answeredZero.response_value, 0);

  for (const row of rows.filter((row) => row.item_key.startsWith('null-'))) {
    assert.equal(row.response_value, null);
  }
});
