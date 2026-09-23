-- BEHAV-DATA-01 / #538
-- Preserve behavioural-response applicability semantics and snapshot household
-- context at the time of administration.
--
-- Scientific authority:
-- docs/science/EMOPET_CBARQ_UPENN_SCIENTIFIC_AUTHORITY_2026-09-23.md
--
-- This migration does NOT add licensed questionnaire wording, scoring, ELI
-- activation, or a C-BARQ licence.

BEGIN;

ALTER TABLE behavioral_assessments
  ADD COLUMN household_dog_count INTEGER,
  ADD COLUMN multi_dog_household BOOLEAN,
  ADD COLUMN cohabitation_context JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN context_version VARCHAR(50),
  ADD COLUMN context_captured_at TIMESTAMPTZ;

ALTER TABLE behavioral_assessments
  ADD CONSTRAINT chk_behavioral_assessment_household_context
  CHECK (
    (household_dog_count IS NULL AND multi_dog_household IS NULL)
    OR
    (
      household_dog_count >= 1
      AND multi_dog_household = (household_dog_count > 1)
      AND context_version IS NOT NULL
      AND context_captured_at IS NOT NULL
    )
  );

-- 0005 created the response-status CHECK as an unnamed column constraint,
-- which PostgreSQL names behavioral_responses_response_status_check.
-- Also tolerate a schema-generated named constraint for reproducibility.
ALTER TABLE behavioral_responses
  DROP CONSTRAINT IF EXISTS behavioral_responses_response_status_check,
  DROP CONSTRAINT IF EXISTS chk_behavioral_response_status,
  DROP CONSTRAINT IF EXISTS chk_behavioral_response_scale;

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
    ),
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
