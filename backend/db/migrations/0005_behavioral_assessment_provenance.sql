-- Migration 0005: Behavioural assessment provenance (2026-09-06)
--
-- Separates owner-reported behavioural instrument data from sensor observations
-- and ELI outputs. Supports licensed C-BARQ integration without storing item
-- wording in the database, and makes any questionnaire -> ELI prior explicit,
-- versioned and auditable.
--
-- Important: progressive/adaptive administration is NOT assumed scientifically
-- equivalent to the standard instrument. scientific_use_status is the gate.
-- Missing / skipped / not-applicable responses are preserved explicitly.

BEGIN;

-- ============================================================
-- 1. Behavioural assessment sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS behavioral_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES dogs(id),
  respondent_user_id UUID REFERENCES users(id),
  respondent_role VARCHAR(30) NOT NULL DEFAULT 'owner'
    CHECK (respondent_role IN ('owner','caregiver','trainer','veterinarian','researcher','other')),

  instrument_code VARCHAR(50) NOT NULL,
  instrument_version VARCHAR(100),
  license_reference VARCHAR(255),

  administration_mode VARCHAR(30) NOT NULL DEFAULT 'standardized'
    CHECK (administration_mode IN ('standardized','progressive','research','unknown')),
  scientific_use_status VARCHAR(30) NOT NULL DEFAULT 'unreviewed'
    CHECK (scientific_use_status IN ('unreviewed','scoring_allowed','research_only','not_equivalent')),
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','complete','abandoned')),

  expected_item_count INTEGER,
  answered_item_count INTEGER NOT NULL DEFAULT 0,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_behavioral_assessment_counts CHECK (
    (expected_item_count IS NULL OR expected_item_count >= 0)
    AND answered_item_count >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_behavioral_assessment_dog
  ON behavioral_assessments(dog_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_assessment_instrument
  ON behavioral_assessments(instrument_code);

-- ============================================================
-- 2. Item responses
-- ============================================================
-- Store only the opaque licensed item identifier, never the questionnaire text.
CREATE TABLE IF NOT EXISTS behavioral_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES behavioral_assessments(id) ON DELETE CASCADE,
  item_key VARCHAR(100) NOT NULL,
  response_status VARCHAR(30) NOT NULL DEFAULT 'answered'
    CHECK (response_status IN ('answered','not_applicable','skipped','missing')),
  response_value INTEGER,
  scale_min INTEGER NOT NULL DEFAULT 0,
  scale_max INTEGER NOT NULL DEFAULT 4,
  presented_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  presentation_context JSONB DEFAULT '{}'::jsonb,
  provenance JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_behavioral_response_scale CHECK (
    scale_min <= scale_max
    AND (
      (response_status = 'answered'
        AND response_value IS NOT NULL
        AND response_value BETWEEN scale_min AND scale_max)
      OR
      (response_status IN ('not_applicable','skipped','missing')
        AND response_value IS NULL)
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_behavioral_response_assessment_item
  ON behavioral_responses(assessment_id, item_key);
CREATE INDEX IF NOT EXISTS idx_behavioral_response_assessment
  ON behavioral_responses(assessment_id);

-- ============================================================
-- 3. Derived factor/subscale scores
-- ============================================================
CREATE TABLE IF NOT EXISTS behavioral_factor_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES behavioral_assessments(id) ON DELETE CASCADE,
  factor_key VARCHAR(100) NOT NULL,
  score REAL NOT NULL,
  scoring_method VARCHAR(100) NOT NULL,
  scoring_version VARCHAR(100),
  eligible_for_eli_prior BOOLEAN NOT NULL DEFAULT false,
  provenance JSONB DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_behavioral_factor_assessment_factor
  ON behavioral_factor_scores(assessment_id, factor_key);
CREATE INDEX IF NOT EXISTS idx_behavioral_factor_assessment
  ON behavioral_factor_scores(assessment_id);

-- ============================================================
-- 4. Explicit behavioural evidence -> ELI prior bridge
-- ============================================================
CREATE TABLE IF NOT EXISTS eli_behavioral_priors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES dogs(id),
  assessment_id UUID NOT NULL REFERENCES behavioral_assessments(id),
  factor_score_id UUID REFERENCES behavioral_factor_scores(id),

  source_factor_key VARCHAR(100) NOT NULL,
  target_prior_key VARCHAR(100) NOT NULL,
  prior_value REAL NOT NULL,
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  algorithm_version VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate','active','retired','rejected')),

  rationale JSONB DEFAULT '{}'::jsonb,
  activated_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eli_behavioral_prior_dog
  ON eli_behavioral_priors(dog_id);
CREATE INDEX IF NOT EXISTS idx_eli_behavioral_prior_assessment
  ON eli_behavioral_priors(assessment_id);

-- ============================================================
-- 5. Separate research-data consent
-- ============================================================
CREATE TABLE IF NOT EXISTS research_data_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  dog_id UUID NOT NULL REFERENCES dogs(id),
  consent_version VARCHAR(100) NOT NULL,
  scope VARCHAR(30) NOT NULL
    CHECK (scope IN ('aggregate','deidentified','study_specific')),
  governance_reference VARCHAR(255),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_research_consent_dog
  ON research_data_consents(dog_id);
CREATE INDEX IF NOT EXISTS idx_research_consent_user
  ON research_data_consents(user_id);

COMMIT;

-- ============================================================
-- Rollback (manual):
--   BEGIN;
--   DROP TABLE IF EXISTS research_data_consents;
--   DROP TABLE IF EXISTS eli_behavioral_priors;
--   DROP TABLE IF EXISTS behavioral_factor_scores;
--   DROP TABLE IF EXISTS behavioral_responses;
--   DROP TABLE IF EXISTS behavioral_assessments;
--   COMMIT;
-- ============================================================
