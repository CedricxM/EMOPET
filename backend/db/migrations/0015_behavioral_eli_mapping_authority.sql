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
  activated_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_behavioral_eli_mapping_bounds CHECK (min_prior_value <= max_prior_value),
  CONSTRAINT chk_behavioral_eli_mapping_status CHECK (status IN ('research_only','approved','retired','rejected')),
  CONSTRAINT chk_behavioral_eli_mapping_retirement CHECK (
    (status = 'retired' AND retired_at IS NOT NULL)
    OR (status <> 'retired' AND retired_at IS NULL)
  ),
  CONSTRAINT chk_behavioral_eli_mapping_approved_evidence CHECK (
    status <> 'approved'
    OR (review_authority IS NOT NULL AND approved_at IS NOT NULL AND activated_at IS NOT NULL AND length(trim(protocol_reference)) > 0)
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
      AND ma.activated_at IS NOT NULL
      AND ma.activated_at <= NOW()
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

CREATE OR REPLACE FUNCTION prevent_approved_behavioral_mapping_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $
BEGIN
  IF OLD.status = 'approved' AND (
    NEW.authority_key IS DISTINCT FROM OLD.authority_key
    OR NEW.authority_version IS DISTINCT FROM OLD.authority_version
    OR NEW.source_instrument_code IS DISTINCT FROM OLD.source_instrument_code
    OR NEW.source_instrument_version IS DISTINCT FROM OLD.source_instrument_version
    OR NEW.source_scoring_version IS DISTINCT FROM OLD.source_scoring_version
    OR NEW.source_factor_key IS DISTINCT FROM OLD.source_factor_key
    OR NEW.target_prior_key IS DISTINCT FROM OLD.target_prior_key
    OR NEW.algorithm_version IS DISTINCT FROM OLD.algorithm_version
    OR NEW.min_prior_value IS DISTINCT FROM OLD.min_prior_value
    OR NEW.max_prior_value IS DISTINCT FROM OLD.max_prior_value
    OR NEW.protocol_reference IS DISTINCT FROM OLD.protocol_reference
    OR NEW.review_authority IS DISTINCT FROM OLD.review_authority
    OR NEW.rationale IS DISTINCT FROM OLD.rationale
    OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
    OR NEW.activated_at IS DISTINCT FROM OLD.activated_at
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'chk_behavioral_eli_mapping_approved_immutable',
      MESSAGE = 'approved behavioural ELI mapping authority is immutable; create a new authority version';
  END IF;
  RETURN NEW;
END
$;

DROP TRIGGER IF EXISTS trg_behavioral_mapping_approved_immutable ON behavioral_eli_mapping_authorities;
CREATE TRIGGER trg_behavioral_mapping_approved_immutable
BEFORE UPDATE ON behavioral_eli_mapping_authorities
FOR EACH ROW
EXECUTE FUNCTION prevent_approved_behavioral_mapping_rewrite();

CREATE OR REPLACE FUNCTION prevent_active_behavioral_factor_source_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $
BEGIN
  IF EXISTS (
    SELECT 1
    FROM eli_behavioral_priors p
    WHERE p.factor_score_id = OLD.id
      AND p.status = 'active'
  ) AND (
    NEW.assessment_id IS DISTINCT FROM OLD.assessment_id
    OR NEW.factor_key IS DISTINCT FROM OLD.factor_key
    OR NEW.score IS DISTINCT FROM OLD.score
    OR NEW.scoring_method IS DISTINCT FROM OLD.scoring_method
    OR NEW.scoring_version IS DISTINCT FROM OLD.scoring_version
    OR NEW.eligible_for_eli_prior IS DISTINCT FROM OLD.eligible_for_eli_prior
    OR NEW.provenance IS DISTINCT FROM OLD.provenance
    OR NEW.computed_at IS DISTINCT FROM OLD.computed_at
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'chk_eli_behavioral_prior_active_factor_source_immutable',
      MESSAGE = 'factor-score provenance referenced by an active ELI behavioural prior is immutable; retire the prior first';
  END IF;
  RETURN NEW;
END
$;

DROP TRIGGER IF EXISTS trg_active_behavioral_factor_source_immutable ON behavioral_factor_scores;
CREATE TRIGGER trg_active_behavioral_factor_source_immutable
BEFORE UPDATE ON behavioral_factor_scores
FOR EACH ROW
EXECUTE FUNCTION prevent_active_behavioral_factor_source_rewrite();

CREATE OR REPLACE FUNCTION prevent_active_behavioral_assessment_source_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $
BEGIN
  IF EXISTS (
    SELECT 1
    FROM eli_behavioral_priors p
    WHERE p.assessment_id = OLD.id
      AND p.status = 'active'
  ) AND (
    NEW.dog_id IS DISTINCT FROM OLD.dog_id
    OR NEW.instrument_code IS DISTINCT FROM OLD.instrument_code
    OR NEW.instrument_version IS DISTINCT FROM OLD.instrument_version
    OR NEW.scientific_use_status IS DISTINCT FROM OLD.scientific_use_status
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'chk_eli_behavioral_prior_active_assessment_source_immutable',
      MESSAGE = 'assessment provenance referenced by an active ELI behavioural prior is immutable; retire the prior first';
  END IF;
  RETURN NEW;
END
$;

DROP TRIGGER IF EXISTS trg_active_behavioral_assessment_source_immutable ON behavioral_assessments;
CREATE TRIGGER trg_active_behavioral_assessment_source_immutable
BEFORE UPDATE ON behavioral_assessments
FOR EACH ROW
EXECUTE FUNCTION prevent_active_behavioral_assessment_source_rewrite();

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
