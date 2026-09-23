-- Migration 0015: fail-closed behavioural assessment -> ELI mapping authority (2026-09-23)
--
-- An eligible factor score is not sufficient to activate an ELI prior. Active
-- priors must cite a versioned, approved scientific mapping authority whose
-- instrument/scoring/factor/target/algorithm/bounds all match exactly.

BEGIN;

CREATE TABLE IF NOT EXISTS behavioral_eli_mapping_authorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authority_key VARCHAR(100) NOT NULL,
  authority_version VARCHAR(50) NOT NULL,
  source_instrument_code VARCHAR(50) NOT NULL,
  source_instrument_version VARCHAR(100) NOT NULL,
  source_scoring_version VARCHAR(100) NOT NULL,
  source_factor_key VARCHAR(100) NOT NULL,
  target_prior_key VARCHAR(100) NOT NULL,
  algorithm_version VARCHAR(100) NOT NULL,
  min_prior_value REAL NOT NULL,
  max_prior_value REAL NOT NULL,
  protocol_reference VARCHAR(255) NOT NULL,
  review_authority VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'research_only',
  rationale JSONB DEFAULT '{}'::jsonb,
  approved_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_behavioral_eli_mapping_bounds CHECK (min_prior_value <= max_prior_value),
  CONSTRAINT chk_behavioral_eli_mapping_status CHECK (status IN ('research_only','approved','retired','rejected')),
  CONSTRAINT chk_behavioral_eli_mapping_approved_evidence CHECK (
    status <> 'approved'
    OR (review_authority IS NOT NULL AND approved_at IS NOT NULL AND length(trim(protocol_reference)) > 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_behavioral_eli_mapping_authority_version
  ON behavioral_eli_mapping_authorities(authority_key, authority_version);
CREATE INDEX IF NOT EXISTS idx_behavioral_eli_mapping_source
  ON behavioral_eli_mapping_authorities(source_instrument_code, source_factor_key);

ALTER TABLE eli_behavioral_priors
  ADD COLUMN IF NOT EXISTS mapping_authority_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_eli_behavioral_prior_mapping_authority'
      AND conrelid = 'eli_behavioral_priors'::regclass
  ) THEN
    ALTER TABLE eli_behavioral_priors
      ADD CONSTRAINT fk_eli_behavioral_prior_mapping_authority
      FOREIGN KEY (mapping_authority_id)
      REFERENCES behavioral_eli_mapping_authorities(id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_eli_behavioral_prior_mapping_authority
  ON eli_behavioral_priors(mapping_authority_id);

CREATE OR REPLACE FUNCTION enforce_active_eli_behavioral_prior_authority()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM behavioral_factor_scores bfs
    JOIN behavioral_assessments ba
      ON ba.id = bfs.assessment_id
    JOIN behavioral_eli_mapping_authorities ma
      ON ma.id = NEW.mapping_authority_id
    WHERE bfs.id = NEW.factor_score_id
      AND bfs.assessment_id = NEW.assessment_id
      AND ba.id = NEW.assessment_id
      AND ba.dog_id = NEW.dog_id
      AND bfs.factor_key = NEW.source_factor_key
      AND bfs.eligible_for_eli_prior = TRUE
      AND bfs.scoring_version IS NOT NULL
      AND ba.instrument_version IS NOT NULL
      AND ba.scientific_use_status = 'scoring_allowed'
      AND ma.status = 'approved'
      AND ma.retired_at IS NULL
      AND ma.source_instrument_code = ba.instrument_code
      AND ma.source_instrument_version = ba.instrument_version
      AND ma.source_scoring_version = bfs.scoring_version
      AND ma.source_factor_key = bfs.factor_key
      AND ma.target_prior_key = NEW.target_prior_key
      AND ma.algorithm_version = NEW.algorithm_version
      AND NEW.prior_value BETWEEN ma.min_prior_value AND ma.max_prior_value
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'chk_eli_behavioral_prior_active_authority',
      MESSAGE = 'active ELI behavioural prior requires a matching approved mapping authority and eligible scientific provenance';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_eli_behavioral_prior_active_authority ON eli_behavioral_priors;
CREATE TRIGGER trg_eli_behavioral_prior_active_authority
BEFORE INSERT OR UPDATE OF
  status, dog_id, assessment_id, factor_score_id, mapping_authority_id,
  source_factor_key, target_prior_key, prior_value, algorithm_version
ON eli_behavioral_priors
FOR EACH ROW
EXECUTE FUNCTION enforce_active_eli_behavioral_prior_authority();

CREATE OR REPLACE FUNCTION retire_priors_when_mapping_authority_closes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'approved' AND NEW.status <> 'approved' THEN
    UPDATE eli_behavioral_priors
    SET status = 'retired',
        retired_at = COALESCE(retired_at, NOW())
    WHERE mapping_authority_id = NEW.id
      AND status = 'active';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_behavioral_mapping_retire_priors ON behavioral_eli_mapping_authorities;
CREATE TRIGGER trg_behavioral_mapping_retire_priors
AFTER UPDATE OF status ON behavioral_eli_mapping_authorities
FOR EACH ROW
EXECUTE FUNCTION retire_priors_when_mapping_authority_closes();

COMMIT;
