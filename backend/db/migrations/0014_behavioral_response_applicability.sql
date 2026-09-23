-- BEHAV-DATA-01 / #538
-- New migration authored on current main under #258 Model A promotion-order authority.
-- This is not a replay of frozen #224 SQL and therefore carries no replay provenance marker.
--
-- Purpose:
-- - distinguish not_observed from not_applicable/skipped/missing;
-- - snapshot household/cohabitation context at administration time;
-- - preserve NULL for all non-answered response states;
-- - avoid inventing historical household context for pre-existing assessments.

BEGIN;

ALTER TABLE behavioral_assessments
  ADD COLUMN household_dog_count INTEGER,
  ADD COLUMN household_context_version VARCHAR(100),
  ADD COLUMN household_context_captured_at TIMESTAMPTZ,
  ADD COLUMN cohabitation_context JSONB;

ALTER TABLE behavioral_assessments
  ADD CONSTRAINT chk_behavioral_assessment_household_dog_count
    CHECK (household_dog_count IS NULL OR household_dog_count >= 1),
  ADD CONSTRAINT chk_behavioral_assessment_context_pair
    CHECK ((household_context_version IS NULL) = (household_context_captured_at IS NULL)),
  ADD CONSTRAINT chk_behavioral_assessment_context_authority
    CHECK (
      (household_dog_count IS NULL AND cohabitation_context IS NULL)
      OR (household_context_version IS NOT NULL AND household_context_captured_at IS NOT NULL)
    ),
  ADD CONSTRAINT chk_behavioral_assessment_cohabitation_context_shape
    CHECK (cohabitation_context IS NULL OR jsonb_typeof(cohabitation_context) = 'object');

-- Historical 0005 named only the scale constraint. PostgreSQL therefore
-- generated behavioral_responses_response_status_check for the inline status
-- CHECK. Drop both possible canonical/legacy names so the final constraint
-- names become deterministic without rewriting historical migration 0005.
ALTER TABLE behavioral_responses
  DROP CONSTRAINT IF EXISTS behavioral_responses_response_status_check,
  DROP CONSTRAINT IF EXISTS chk_behavioral_response_status,
  DROP CONSTRAINT IF EXISTS chk_behavioral_response_scale;

ALTER TABLE behavioral_responses
  ADD CONSTRAINT chk_behavioral_response_status
    CHECK (response_status IN ('answered','not_applicable','not_observed','skipped','missing')),
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
          response_status IN ('not_applicable','not_observed','skipped','missing')
          AND response_value IS NULL
        )
      )
    );

COMMIT;
