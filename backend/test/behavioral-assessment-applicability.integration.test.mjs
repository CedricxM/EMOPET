import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

const enabled = process.env.BEHAVIORAL_ASSESSMENT_DB_INTEGRATION === '1';

test('behavioural response applicability states remain distinct and fail closed', { skip: !enabled }, async () => {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const userId = randomUUID();
  const dogId = randomUUID();
  const assessmentId = randomUUID();
  const historicalAssessmentId = randomUUID();
  const email = `behav-${randomUUID()}@example.test`;

  try {
    await sql`
      INSERT INTO users (id, email, password_hash, name)
      VALUES (${userId}, ${email}, 'not-a-real-hash', 'Behaviour QA')
    `;
    await sql`
      INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
      VALUES (${dogId}, ${userId}, 'QA Dog', 'Mixed', '2020-01-01', 'female', 20, 'FC2')
    `;

    await sql`
      INSERT INTO behavioral_assessments (
        id, dog_id, instrument_code, household_dog_count, multi_dog_household,
        cohabitation_context, administration_context_version, context_captured_at
      ) VALUES (
        ${assessmentId}, ${dogId}, 'qa-instrument', 1, FALSE,
        ${sql.json({ household: 'single-dog' })}, 'ctx-v1', NOW()
      )
    `;

    await sql`
      INSERT INTO behavioral_assessments (id, dog_id, instrument_code)
      VALUES (${historicalAssessmentId}, ${dogId}, 'legacy-qa-instrument')
    `;

    const historical = await sql`
      SELECT household_dog_count, multi_dog_household, context_captured_at
      FROM behavioral_assessments
      WHERE id = ${historicalAssessmentId}
    `;
    assert.equal(historical[0].household_dog_count, null);
    assert.equal(historical[0].multi_dog_household, null);
    assert.equal(historical[0].context_captured_at, null);

    const accepted = [
      ['answered', 0],
      ['not_applicable', null],
      ['not_observed', null],
      ['skipped', null],
      ['missing', null],
    ];

    for (const [status, value] of accepted) {
      await sql`
        INSERT INTO behavioral_responses (assessment_id, item_key, response_status, response_value)
        VALUES (${assessmentId}, ${`item-${status}`}, ${status}, ${value})
      `;
    }

    const rows = await sql`
      SELECT response_status, response_value
      FROM behavioral_responses
      WHERE assessment_id = ${assessmentId}
      ORDER BY response_status
    `;
    const byStatus = Object.fromEntries(rows.map((row) => [row.response_status, row.response_value]));
    assert.equal(byStatus.answered, 0);
    assert.equal(byStatus.not_applicable, null);
    assert.equal(byStatus.not_observed, null);
    assert.equal(byStatus.skipped, null);
    assert.equal(byStatus.missing, null);

    await assert.rejects(
      () => sql`
        INSERT INTO behavioral_responses (assessment_id, item_key, response_status, response_value)
        VALUES (${assessmentId}, 'invalid-not-observed-zero', 'not_observed', 0)
      `,
      /chk_behavioral_response_scale|check constraint/i,
    );

    await assert.rejects(
      () => sql`
        INSERT INTO behavioral_assessments (
          id, dog_id, instrument_code, household_dog_count, multi_dog_household
        ) VALUES (${randomUUID()}, ${dogId}, 'bad-single', 1, TRUE)
      `,
      /chk_behavioral_assessment_multi_dog_consistency|check constraint/i,
    );

    await assert.rejects(
      () => sql`
        INSERT INTO behavioral_assessments (
          id, dog_id, instrument_code, household_dog_count, multi_dog_household
        ) VALUES (${randomUUID()}, ${dogId}, 'bad-multi', 2, FALSE)
      `,
      /chk_behavioral_assessment_multi_dog_consistency|check constraint/i,
    );
  } finally {
    await sql`DELETE FROM behavioral_responses WHERE assessment_id IN (${assessmentId}, ${historicalAssessmentId})`;
    await sql`DELETE FROM behavioral_assessments WHERE dog_id = ${dogId}`;
    await sql`DELETE FROM dogs WHERE id = ${dogId}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;
    await sql.end({ timeout: 5 });
  }
});
