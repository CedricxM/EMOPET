-- Migration 0014: Behavioural applicability and household-context provenance (2026-09-23)
--
-- Trigger: BEHAV-DATA-01 / #538.
--
-- This migration preserves the semantic difference between:
--   answered / not_applicable / not_observed / skipped / missing.
-- Non-answered states remain NULL-valued and must never be coerced to zero.
--
-- Household context is snapshotted on the assessment itself so later household
-- changes cannot retroactively alter historical applicability semantics.
-- Historical rows are intentionally left NULL rather than backfilled from
-- mutable present-day profile state.

BEGIN;

-- ============================================================
-- 1. Assessment-time household context
-- ============================================================
ALTER TABLE behavioral_assessments
  ADD COLUMN IF NOT EXISTS household_dog_count INTEGER,
  ADD COLUMN IF NOT EXISTS household_context_version VARCHAR(50),
  ADD COLUMN IF NOT EXISTS household_context_captured_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS household_context JSONB DEFAULT '{}'::jsonb;

ALTER TABLE behavioral_assessments
  DROP CONSTRAINT IF EXISTS chk_behavioral_assessment_household_dog_count;

ALTER TABLE behavioral_assessments
  ADD CONSTRAINT chk_behavioral_assessment_household_dog_count
  CHECK (household_dog_count IS NULL OR household_dog_count >= 1);

-- ============================================================
-- 2. Explicit not-observed response state
-- ============================================================
-- 0005 created response_status as an inline CHECK, so PostgreSQL may have
-- assigned the conventional table_column_check name. Drop both that historical
-- name and the current Drizzle-controlled name before installing one canonical
-- named constraint.
ALTER TABLE behavioral_responses
  DROP CONSTRAINT IF EXISTS behavioral_responses_response_status_check;

ALTER TABLE behavioral_responses
  DROP CONSTRAINT IF EXISTS chk_behavioral_response_status;

ALTER TABLE behavioral_responses
  ADD CONSTRAINT chk_behavioral_response_status
  CHECK (
    response_status IN (
      'answered',
      'not_applicable',
      'not_observed',
      'skipped',
      'missing'
    )
  );

ALTER TABLE behavioral_responses
  DROP CONSTRAINT IF EXISTS chk_behavioral_response_scale;

ALTER TABLE behavioral_responses
  ADD CONSTRAINT chk_behavioral_response_scale
  CHECK (
    scale_min <= scale_max
    AND (
      (
        response_status = 'answered'
        AND response_value IS NOT NULL
        AND response_value BETWEEN scale_min AND scale_max
      )
      OR
      (
        response_status IN (
          'not_applicable',
          'not_observed',
          'skipped',
          'missing'
        )
        AND response_value IS NULL
      )
    )
  );

COMMENT ON COLUMN behavioral_assessments.household_dog_count IS
  'Assessment-time household dog-count snapshot; NULL means unknown. multi-dog is derived as count > 1 when known.';

COMMENT ON COLUMN behavioral_assessments.household_context IS
  'Versioned assessment-time applicability/cohabitation context; provenance only, never behavioural ground truth.';

COMMENT ON COLUMN behavioral_responses.response_status IS
  'answered, not_applicable, not_observed, skipped, or missing. Non-answered states require response_value NULL.';

COMMIT;

-- Rollback (manual, only if no new semantics have been relied upon):
--   BEGIN;
--   ALTER TABLE behavioral_responses DROP CONSTRAINT IF EXISTS chk_behavioral_response_scale;
--   ALTER TABLE behavioral_responses DROP CONSTRAINT IF EXISTS chk_behavioral_response_status;
--   ALTER TABLE behavioral_responses
--     ADD CONSTRAINT chk_behavioral_response_status
--     CHECK (response_status IN ('answered','not_applicable','skipped','missing'));
--   ALTER TABLE behavioral_responses
--     ADD CONSTRAINT chk_behavioral_response_scale
--     CHECK (
--       scale_min <= scale_max
--       AND (
--         (response_status = 'answered'
--           AND response_value IS NOT NULL
--           AND response_value BETWEEN scale_min AND scale_max)
--         OR
--         (response_status IN ('not_applicable','skipped','missing')
--           AND response_value IS NULL)
--       )
--     );
--   ALTER TABLE behavioral_assessments
--     DROP CONSTRAINT IF EXISTS chk_behavioral_assessment_household_dog_count,
--     DROP COLUMN IF EXISTS household_context,
--     DROP COLUMN IF EXISTS household_context_captured_at,
--     DROP COLUMN IF EXISTS household_context_version,
--     DROP COLUMN IF EXISTS household_dog_count;
--   COMMIT;
