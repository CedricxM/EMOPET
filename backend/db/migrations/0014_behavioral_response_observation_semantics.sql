-- BEHAV-DATA-01 / #550
-- Preserve questionnaire non-response semantics and assessment-time household context.
-- Scientific authority:
-- docs/science/EMOPET_CBARQ_UPENN_SCIENTIFIC_AUTHORITY_2026-09-23.md
--
-- This migration does NOT add questionnaire wording, scoring logic, C-BARQ licence
-- authority, or ELI mapping. It only preserves applicability/provenance truth.

BEGIN;

ALTER TABLE behavioral_assessments
  ADD COLUMN household_dog_count INTEGER,
  ADD COLUMN household_context_source VARCHAR(30) NOT NULL DEFAULT 'unknown',
  ADD COLUMN household_context_recorded_at TIMESTAMPTZ;

ALTER TABLE behavioral_assessments
  ADD CONSTRAINT chk_behavioral_assessment_household_context_source
  CHECK (
    household_context_source IN (
      'respondent_reported',
      'research_record',
      'profile_snapshot',
      'unknown'
    )
  );

ALTER TABLE behavioral_assessments
  ADD CONSTRAINT chk_behavioral_assessment_household_context
  CHECK (
    (
      household_dog_count IS NULL
      AND household_context_source = 'unknown'
      AND household_context_recorded_at IS NULL
    )
    OR
    (
      household_dog_count >= 1
      AND household_context_source IN (
        'respondent_reported',
        'research_record',
        'profile_snapshot'
      )
      AND household_context_recorded_at IS NOT NULL
    )
  );

ALTER TABLE behavioral_responses
  DROP CONSTRAINT IF EXISTS chk_behavioral_response_status;

-- Historical 0005 declared this CHECK inline, so PostgreSQL named it
-- behavioral_responses_response_status_check. Generated Drizzle baselines use
-- the explicit chk_* name above. Drop both representations before installing
-- the single current constraint.
ALTER TABLE behavioral_responses
  DROP CONSTRAINT IF EXISTS behavioral_responses_response_status_check;

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

COMMIT;
