-- Migration 0014: behavioural response applicability + administration context snapshot (2026-09-23)
--
-- Adds `not_observed` as a first-class response state and preserves household
-- context at administration time without backfilling historical rows from current state.

BEGIN;

ALTER TABLE behavioral_assessments
  ADD COLUMN IF NOT EXISTS household_dog_count INTEGER,
  ADD COLUMN IF NOT EXISTS multi_dog_household BOOLEAN,
  ADD COLUMN IF NOT EXISTS cohabitation_context JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS administration_context_version VARCHAR(50),
  ADD COLUMN IF NOT EXISTS context_captured_at TIMESTAMPTZ;

ALTER TABLE behavioral_assessments
  DROP CONSTRAINT IF EXISTS chk_behavioral_assessment_household_dog_count,
  ADD CONSTRAINT chk_behavioral_assessment_household_dog_count
    CHECK (household_dog_count IS NULL OR household_dog_count >= 1);

ALTER TABLE behavioral_assessments
  DROP CONSTRAINT IF EXISTS chk_behavioral_assessment_multi_dog_consistency,
  ADD CONSTRAINT chk_behavioral_assessment_multi_dog_consistency
    CHECK (
      household_dog_count IS NULL
      OR multi_dog_household IS NULL
      OR (household_dog_count = 1 AND multi_dog_household = FALSE)
      OR (household_dog_count >= 2 AND multi_dog_household = TRUE)
    );

ALTER TABLE behavioral_responses
  DROP CONSTRAINT IF EXISTS chk_behavioral_response_status;

ALTER TABLE behavioral_responses
  ADD CONSTRAINT chk_behavioral_response_status
    CHECK (response_status IN ('answered','not_applicable','not_observed','skipped','missing'));

ALTER TABLE behavioral_responses
  DROP CONSTRAINT IF EXISTS chk_behavioral_response_scale;

ALTER TABLE behavioral_responses
  ADD CONSTRAINT chk_behavioral_response_scale CHECK (
    scale_min <= scale_max
    AND (
      (response_status = 'answered'
        AND response_value IS NOT NULL
        AND response_value BETWEEN scale_min AND scale_max)
      OR
      (response_status IN ('not_applicable','not_observed','skipped','missing')
        AND response_value IS NULL)
    )
  );

COMMIT;
