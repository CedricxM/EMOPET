import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';

const enabled = process.env.BEHAVIORAL_ELI_MAPPING_DB_INTEGRATION === '1';

test('checked-in C-BARQ mapping disposition remains research-only / no active prior', async () => {
  const url = new URL('../../config/science/behavioral-eli-mapping-authority.json', import.meta.url);
  const config = JSON.parse(await readFile(url, 'utf8'));
  assert.equal(config.instruments.cbarq.scientificUseStatus, 'RESEARCH_ONLY');
  assert.equal(config.instruments.cbarq.productionPriorActivation, 'NO_ACTIVE_PRIOR');
  assert.equal(config.globalDefault, 'NO_ACTIVE_PRIOR_WITHOUT_MATCHING_APPROVED_DB_AUTHORITY');
});

test('active behavioural priors require exact approved mapping authority', { skip: !enabled }, async () => {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const userId = randomUUID();
  const dogId = randomUUID();
  const assessmentId = randomUUID();
  const factorId = randomUUID();
  const approvedAuthorityId = randomUUID();
  const researchAuthorityId = randomUUID();
  const wrongVersionAuthorityId = randomUUID();
  const wrongScoringAuthorityId = randomUUID();
  const wrongInstrumentAuthorityId = randomUUID();
  const activePriorId = randomUUID();
  const email = `eli-behav-${randomUUID()}@example.test`;

  try {
    await sql`
      INSERT INTO users (id, email, password_hash, name)
      VALUES (${userId}, ${email}, 'not-a-real-hash', 'ELI Behaviour QA')
    `;
    await sql`
      INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
      VALUES (${dogId}, ${userId}, 'Authority Dog', 'Mixed', '2020-01-01', 'male', 18, 'FC2')
    `;
    await sql`
      INSERT INTO behavioral_assessments (
        id, dog_id, instrument_code, instrument_version, scientific_use_status
      ) VALUES (${assessmentId}, ${dogId}, 'qa-instrument', 'qa-v1', 'scoring_allowed')
    `;
    await sql`
      INSERT INTO behavioral_factor_scores (
        id, assessment_id, factor_key, score, scoring_method, scoring_version, eligible_for_eli_prior
      ) VALUES (${factorId}, ${assessmentId}, 'factor-a', 2.5, 'qa-method', 'score-v1', FALSE)
    `;

    await sql`
      INSERT INTO behavioral_eli_mapping_authorities (
        id, authority_key, authority_version, source_instrument_code, source_instrument_version,
        source_scoring_version, source_factor_key, target_prior_key, algorithm_version,
        min_prior_value, max_prior_value, protocol_reference, review_authority, status, approved_at, activated_at
      ) VALUES (
        ${approvedAuthorityId}, 'qa-approved', '1', 'qa-instrument', 'qa-v1',
        'score-v1', 'factor-a', 'eli-prior-a', 'map-v1',
        -1, 1, 'protocol://qa-approved', 'QA SCIENCE REVIEW', 'approved', NOW(), NOW()
      )
    `;

    await sql`
      INSERT INTO behavioral_eli_mapping_authorities (
        id, authority_key, authority_version, source_instrument_code, source_instrument_version,
        source_scoring_version, source_factor_key, target_prior_key, algorithm_version,
        min_prior_value, max_prior_value, protocol_reference, status
      ) VALUES (
        ${researchAuthorityId}, 'qa-research', '1', 'qa-instrument', 'qa-v1',
        'score-v1', 'factor-a', 'eli-prior-a', 'map-v1',
        -1, 1, 'protocol://qa-research', 'research_only'
      )
    `;

    await sql`
      INSERT INTO behavioral_eli_mapping_authorities (
        id, authority_key, authority_version, source_instrument_code, source_instrument_version,
        source_scoring_version, source_factor_key, target_prior_key, algorithm_version,
        min_prior_value, max_prior_value, protocol_reference, review_authority, status, approved_at, activated_at
      ) VALUES (
        ${wrongVersionAuthorityId}, 'qa-wrong-version', '1', 'qa-instrument', 'qa-v2',
        'score-v1', 'factor-a', 'eli-prior-a', 'map-v1',
        -1, 1, 'protocol://qa-wrong', 'QA SCIENCE REVIEW', 'approved', NOW(), NOW()
      )
    `;

    await sql`
      INSERT INTO behavioral_eli_mapping_authorities (
        id, authority_key, authority_version, source_instrument_code, source_instrument_version,
        source_scoring_version, source_factor_key, target_prior_key, algorithm_version,
        min_prior_value, max_prior_value, protocol_reference, review_authority, status, approved_at, activated_at
      ) VALUES (
        ${wrongScoringAuthorityId}, 'qa-wrong-scoring', '1', 'qa-instrument', 'qa-v1',
        'score-v2', 'factor-a', 'eli-prior-a', 'map-v1',
        -1, 1, 'protocol://qa-wrong-scoring', 'QA SCIENCE REVIEW', 'approved', NOW(), NOW()
      )
    `;

    await sql`
      INSERT INTO behavioral_eli_mapping_authorities (
        id, authority_key, authority_version, source_instrument_code, source_instrument_version,
        source_scoring_version, source_factor_key, target_prior_key, algorithm_version,
        min_prior_value, max_prior_value, protocol_reference, review_authority, status, approved_at, activated_at
      ) VALUES (
        ${wrongInstrumentAuthorityId}, 'qa-wrong-instrument', '1', 'qa-other-instrument', 'qa-v1',
        'score-v1', 'factor-a', 'eli-prior-a', 'map-v1',
        -1, 1, 'protocol://qa-wrong-instrument', 'QA SCIENCE REVIEW', 'approved', NOW(), NOW()
      )
    `;

    const insertActive = (id, authorityId, priorValue = 0.4) => sql`
      INSERT INTO eli_behavioral_priors (
        id, dog_id, assessment_id, factor_score_id, mapping_authority_id,
        source_factor_key, target_prior_key, prior_value, confidence, algorithm_version, status
      ) VALUES (
        ${id}, ${dogId}, ${assessmentId}, ${factorId}, ${authorityId},
        'factor-a', 'eli-prior-a', ${priorValue}, 0.8, 'map-v1', 'active'
      )
    `;

    await assert.rejects(
      () => insertActive(randomUUID(), null),
      /chk_eli_behavioral_prior_active_authority|matching approved mapping authority/i,
    );

    await assert.rejects(
      () => insertActive(randomUUID(), approvedAuthorityId),
      /chk_eli_behavioral_prior_active_authority|matching approved mapping authority/i,
    );

    await sql`UPDATE behavioral_factor_scores SET eligible_for_eli_prior = TRUE WHERE id = ${factorId}`;

    await assert.rejects(
      () => insertActive(randomUUID(), researchAuthorityId),
      /chk_eli_behavioral_prior_active_authority|matching approved mapping authority/i,
    );

    await assert.rejects(
      () => insertActive(randomUUID(), wrongVersionAuthorityId),
      /chk_eli_behavioral_prior_active_authority|matching approved mapping authority/i,
    );

    await assert.rejects(
      () => insertActive(randomUUID(), wrongScoringAuthorityId),
      /chk_eli_behavioral_prior_active_authority|matching approved mapping authority/i,
    );

    await assert.rejects(
      () => insertActive(randomUUID(), wrongInstrumentAuthorityId),
      /chk_eli_behavioral_prior_active_authority|matching approved mapping authority/i,
    );

    await assert.rejects(
      () => insertActive(randomUUID(), approvedAuthorityId, 2),
      /chk_eli_behavioral_prior_active_authority|matching approved mapping authority/i,
    );

    await insertActive(activePriorId, approvedAuthorityId, 0.4);
    const active = await sql`SELECT status FROM eli_behavioral_priors WHERE id = ${activePriorId}`;
    assert.equal(active[0].status, 'active');

    await assert.rejects(
      sql`UPDATE behavioral_factor_scores SET eligible_for_eli_prior = FALSE WHERE id = ${factorId}`,
      /chk_eli_behavioral_prior_active_factor_source_immutable|retire the prior first/i,
    );

    await assert.rejects(
      sql`UPDATE behavioral_factor_scores SET scoring_version = 'score-v2' WHERE id = ${factorId}`,
      /chk_eli_behavioral_prior_active_factor_source_immutable|retire the prior first/i,
    );

    await assert.rejects(
      sql`UPDATE behavioral_assessments SET scientific_use_status = 'research_only' WHERE id = ${assessmentId}`,
      /chk_eli_behavioral_prior_active_assessment_source_immutable|retire the prior first/i,
    );

    await assert.rejects(
      sql`UPDATE behavioral_eli_mapping_authorities SET max_prior_value = 2 WHERE id = ${approvedAuthorityId}`,
      /chk_behavioral_eli_mapping_approved_immutable|new authority version/i,
    );

    await sql`
      UPDATE behavioral_eli_mapping_authorities
      SET status = 'retired', retired_at = NOW()
      WHERE id = ${approvedAuthorityId}
    `;

    const retired = await sql`SELECT status, retired_at FROM eli_behavioral_priors WHERE id = ${activePriorId}`;
    assert.equal(retired[0].status, 'retired');
    assert.ok(retired[0].retired_at);
  } finally {
    await sql`DELETE FROM eli_behavioral_priors WHERE assessment_id = ${assessmentId}`;
    await sql`DELETE FROM behavioral_eli_mapping_authorities WHERE id IN (${approvedAuthorityId}, ${researchAuthorityId}, ${wrongVersionAuthorityId}, ${wrongScoringAuthorityId}, ${wrongInstrumentAuthorityId})`;
    await sql`DELETE FROM behavioral_factor_scores WHERE assessment_id = ${assessmentId}`;
    await sql`DELETE FROM behavioral_assessments WHERE id = ${assessmentId}`;
    await sql`DELETE FROM dogs WHERE id = ${dogId}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;
    await sql.end({ timeout: 5 });
  }
});
