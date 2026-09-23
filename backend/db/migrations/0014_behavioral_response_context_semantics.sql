-- Migration 0014: Behavioural response semantics and administration-context provenance
-- Owning issue: BEHAV-DATA-01 / #538
--
-- Purpose:
-- - distinguish not_observed from not_applicable / skipped / missing;
-- - preserve administration-time household context as immutable assessment provenance;
-- - preserve instrument language / translation provenance;
-- - keep every non-answered response NULL-valued rather than coercing it to zero.
--
-- This migration does not reproduce C-BARQ wording, grant a licence, or activate
-- any questionnaire -> ELI mapping.

BEGIN;

ALTER TABLE behavioral_assessments
  ADD COLUMN instrument_language VARCHAR(35),
  ADD COLUMN translation_revision VARCHAR(100),
  ADD COLUMN administration_context_version VARCHAR(100),
  ADD COLUMN household_dog_count INTEGER,
  ADD COLUMN multi_dog_household BOOLEAN,
  ADD COLUMN cohabitation_context JSONB,
  ADD COLUMN context_captured_at TIMESTAMPTZ;

ALTER TABLE behavioral_assessments
  ADD CONSTRAINT chk_behavioral_assessment_translation_provenance
    CHECK (translation_revision IS NULL OR instrument_language IS NOT NULL),
  ADD CONSTRAINT chk_behavioral_assessment_household_context
    CHECK (
      household_dog_count IS NULL OR (
        household_dog_count >= 1
        AND multi_dog_household IS NOT NULL
        AND multi_dog_household = (household_dog_count > 1)
      )
    ),
  ADD CONSTRAINT chk_behavioral_assessment_context_snapshot
    CHECK (
      (
        administration_context_version IS NULL
        AND context_captured_at IS NULL
        AND household_dog_count IS NULL
        AND multi_dog_household IS NULL
        AND cohabitation_context IS NULL
      )
      OR
      (
        administration_context_version IS NOT NULL
        AND context_captured_at IS NOT NULL
        AND (
          household_dog_count IS NOT NULL
          OR multi_dog_household IS NOT NULL
          OR cohabitation_context IS NOT NULL
        )
      )
    );

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

COMMENT ON COLUMN behavioral_responses.response_status IS
  'answered=numeric response; not_applicable=situation cannot apply; not_observed=situation could apply but has not been observed; skipped=respondent chose not to answer; missing=data absent/incomplete. Non-answered states must never be coerced to zero.';

COMMENT ON COLUMN behavioral_assessments.household_dog_count IS
  'Administration-time household dog count snapshot when known; never recomputed from current household state.';

COMMENT ON COLUMN behavioral_assessments.multi_dog_household IS
  'Administration-time multi-dog snapshot; if household_dog_count is known this value must equal household_dog_count > 1.';

COMMENT ON COLUMN behavioral_assessments.cohabitation_context IS
  'Versioned administration-time cohabitation/applicability context. Provenance only; never licensed questionnaire wording.';

COMMIT;
