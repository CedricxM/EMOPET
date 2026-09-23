import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.BEHAVIORAL_RESPONSE_SEMANTICS_DB_INTEGRATION === '1';

let sql = null;

if (enabled) {
  const { default: postgres } = await import('postgres');
  sql = postgres(process.env.DATABASE_URL, { max: 1 });
}

after(async () => {
  if (sql) await sql.end({ timeout: 5 });
});

async function insertResponse({ assessmentId, itemKey, status, value }) {
  return sql`
    INSERT INTO behavioral_responses (
      assessment_id,
      item_key,
      response_status,
      response_value,
      scale_min,
      scale_max
    )
    VALUES (
      ${assessmentId},
      ${itemKey},
      ${status},
      ${value},
      0,
      4
    )
    RETURNING item_key, response_status, response_value
  `;
}

test('BEHAV-DATA-01 preserves response-state and household-context semantics', {
  skip: !enabled,
}, async () => {
  const userId = 'a0000000-0000-4000-8000-000000001401';
  const dogId = 'b0000000-0000-4000-8000-000000001401';
  const assessmentId = 'c0000000-0000-4000-8000-000000001401';

  await sql`DELETE FROM behavioral_assessments WHERE id = ${assessmentId}`;
  await sql`DELETE FROM dogs WHERE id = ${dogId}`;
  await sql`DELETE FROM users WHERE id = ${userId}`;

  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (
      ${userId},
      'behav-data-1401@emopet.invalid',
      'test-only',
      'Behaviour Semantics'
    )
  `;

  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES (
      ${dogId},
      ${userId},
      'Context Dog',
      'Test',
      '2020-01-01',
      'female',
      20.0,
      'FC2'
    )
  `;

  try {
    await sql`
      INSERT INTO behavioral_assessments (
        id,
        dog_id,
        respondent_user_id,
        instrument_code,
        instrument_version,
        instrument_language,
        translation_revision,
        administration_context_version,
        household_dog_count,
        multi_dog_household,
        cohabitation_context,
        context_captured_at
      )
      VALUES (
        ${assessmentId},
        ${dogId},
        ${userId},
        'TEST_BEHAV',
        'v1',
        'fr-FR',
        'fr-test-rev-1',
        'behavioral-context-v1',
        1,
        false,
        '{"householdContext":"single-dog"}'::jsonb,
        NOW()
      )
    `;

    const [zero] = await insertResponse({
      assessmentId,
      itemKey: 'answered-zero',
      status: 'answered',
      value: 0,
    });
    assert.equal(zero.response_status, 'answered');
    assert.equal(zero.response_value, 0, 'answered zero is a real score, not missingness');

    for (const status of ['not_applicable', 'not_observed', 'skipped', 'missing']) {
      const [row] = await insertResponse({
        assessmentId,
        itemKey: status,
        status,
        value: null,
      });
      assert.equal(row.response_status, status);
      assert.equal(row.response_value, null);

      await assert.rejects(
        insertResponse({
          assessmentId,
          itemKey: status + '-numeric',
          status,
          value: 0,
        }),
        /chk_behavioral_response_scale/,
        status + ' must reject numeric response values',
      );
    }

    await assert.rejects(
      insertResponse({
        assessmentId,
        itemKey: 'unknown-state',
        status: 'unseen_magic',
        value: null,
      }),
      /chk_behavioral_response_(status|scale)/,
      'unknown response states must fail closed',
    );

    await assert.rejects(
      sql`
        INSERT INTO behavioral_assessments (
          dog_id,
          instrument_code,
          administration_context_version,
          household_dog_count,
          multi_dog_household,
          context_captured_at
        )
        VALUES (
          ${dogId},
          'TEST_BEHAV',
          'behavioral-context-v1',
          1,
          true,
          NOW()
        )
      `,
      /chk_behavioral_assessment_household_context/,
      'single-dog count cannot be paired with multi-dog=true',
    );

    await assert.rejects(
      sql`
        INSERT INTO behavioral_assessments (
          dog_id,
          instrument_code,
          household_dog_count,
          multi_dog_household
        )
        VALUES (
          ${dogId},
          'TEST_BEHAV',
          2,
          true
        )
      `,
      /chk_behavioral_assessment_context_snapshot/,
      'context values require a context version and capture timestamp',
    );

    await assert.rejects(
      sql`
        INSERT INTO behavioral_assessments (
          dog_id,
          instrument_code,
          translation_revision
        )
        VALUES (
          ${dogId},
          'TEST_BEHAV',
          'fr-test-rev-without-language'
        )
      `,
      /chk_behavioral_assessment_translation_provenance/,
      'translation revision cannot exist without instrument language provenance',
    );

    const [snapshot] = await sql`
      SELECT
        household_dog_count,
        multi_dog_household,
        administration_context_version,
        context_captured_at
      FROM behavioral_assessments
      WHERE id = ${assessmentId}
    `;

    assert.equal(snapshot.household_dog_count, 1);
    assert.equal(snapshot.multi_dog_household, false);
    assert.equal(snapshot.administration_context_version, 'behavioral-context-v1');
    assert.ok(snapshot.context_captured_at instanceof Date);
  } finally {
    await sql`DELETE FROM behavioral_assessments WHERE id = ${assessmentId}`;
    await sql`DELETE FROM dogs WHERE id = ${dogId}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;
  }
});
