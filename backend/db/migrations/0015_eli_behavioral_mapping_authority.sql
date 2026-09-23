-- ELI-BEHAV-01 / #551
-- Exact scientific mapping authority for behavioural-assessment -> ELI priors.
-- No GO authority is inserted by this migration.
--
-- Scientific authority:
-- docs/science/EMOPET_CBARQ_UPENN_SCIENTIFIC_AUTHORITY_2026-09-23.md

BEGIN;

UPDATE behavioral_assessments
SET instrument_version = 'UNVERSIONED'
WHERE instrument_version IS NULL OR length(trim(instrument_version)) = 0;

ALTER TABLE behavioral_assessments
  ALTER COLUMN instrument_version SET DEFAULT 'UNVERSIONED',
  ALTER COLUMN instrument_version SET NOT NULL;

ALTER TABLE behavioral_assessments
  ADD CONSTRAINT uq_behavioral_assessment_instrument_binding
  UNIQUE (
    id,
    instrument_code,
    instrument_version
  );

ALTER TABLE behavioral_factor_scores
  ADD CONSTRAINT uq_behavioral_factor_binding
  UNIQUE (
    id,
    assessment_id,
    factor_key
  );

CREATE TABLE eli_behavioral_mapping_authorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  instrument_code VARCHAR(50) NOT NULL,
  instrument_version VARCHAR(100) NOT NULL DEFAULT 'UNVERSIONED',
  source_factor_key VARCHAR(100) NOT NULL,
  target_prior_key VARCHAR(100) NOT NULL,
  algorithm_version VARCHAR(100) NOT NULL,
  authority_version VARCHAR(100) NOT NULL,

  evidence_reference VARCHAR(500) NOT NULL,
  disposition VARCHAR(20) NOT NULL DEFAULT 'HOLD',
  reviewed_at TIMESTAMPTZ,
  reviewer_role VARCHAR(100),
  reason VARCHAR(1000) NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_eli_behavioral_mapping_authority_disposition
    CHECK (disposition IN ('HOLD','RESEARCH_ONLY','GO','RETIRED')),

  CONSTRAINT chk_eli_behavioral_mapping_authority_go_review
    CHECK (
      disposition <> 'GO'
      OR (
        reviewed_at IS NOT NULL
        AND reviewer_role IS NOT NULL
        AND length(trim(reviewer_role)) > 0
        AND length(trim(evidence_reference)) > 0
      )
    )
);

CREATE UNIQUE INDEX uq_eli_behavioral_mapping_authority_natural
  ON eli_behavioral_mapping_authorities (
    instrument_code,
    instrument_version,
    source_factor_key,
    target_prior_key,
    algorithm_version,
    authority_version
  );

ALTER TABLE eli_behavioral_mapping_authorities
  ADD CONSTRAINT uq_eli_behavioral_mapping_authority_binding
  UNIQUE (
    id,
    instrument_code,
    instrument_version,
    source_factor_key,
    target_prior_key,
    algorithm_version,
    disposition
  );

ALTER TABLE eli_behavioral_priors
  ADD COLUMN source_instrument_code VARCHAR(50),
  ADD COLUMN source_instrument_version VARCHAR(100) NOT NULL DEFAULT 'UNVERSIONED',
  ADD COLUMN mapping_authority_id UUID,
  ADD COLUMN mapping_authority_disposition VARCHAR(20);

UPDATE eli_behavioral_priors AS p
SET
  source_instrument_code = a.instrument_code,
  source_instrument_version = a.instrument_version
FROM behavioral_assessments AS a
WHERE a.id = p.assessment_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM eli_behavioral_priors
    WHERE source_instrument_code IS NULL
  ) THEN
    RAISE EXCEPTION
      'ELI-BEHAV-01 cannot establish source instrument provenance for every existing behavioural prior';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM eli_behavioral_priors
    WHERE status = 'active'
  ) THEN
    RAISE EXCEPTION
      'ELI-BEHAV-01 refuses to grandfather active behavioural priors without explicit GO mapping authority';
  END IF;
END
$$;

ALTER TABLE eli_behavioral_priors
  ALTER COLUMN source_instrument_code SET NOT NULL;

ALTER TABLE eli_behavioral_priors
  ADD CONSTRAINT chk_eli_behavioral_prior_mapping_disposition
  CHECK (
    mapping_authority_disposition IS NULL
    OR mapping_authority_disposition IN ('HOLD','RESEARCH_ONLY','GO','RETIRED')
  );

ALTER TABLE eli_behavioral_priors
  ADD CONSTRAINT chk_eli_behavioral_prior_mapping_binding_pair
  CHECK (
    (mapping_authority_id IS NULL AND mapping_authority_disposition IS NULL)
    OR
    (mapping_authority_id IS NOT NULL AND mapping_authority_disposition IS NOT NULL)
  );

ALTER TABLE eli_behavioral_priors
  ADD CONSTRAINT chk_eli_behavioral_prior_active_authority
  CHECK (
    status <> 'active'
    OR (
      factor_score_id IS NOT NULL
      AND mapping_authority_id IS NOT NULL
      AND mapping_authority_disposition = 'GO'
    )
  );

ALTER TABLE eli_behavioral_priors
  ADD CONSTRAINT fk_eli_behavioral_prior_factor_binding
  FOREIGN KEY (
    factor_score_id,
    assessment_id,
    source_factor_key
  )
  REFERENCES behavioral_factor_scores (
    id,
    assessment_id,
    factor_key
  );

ALTER TABLE eli_behavioral_priors
  ADD CONSTRAINT fk_eli_behavioral_prior_assessment_instrument
  FOREIGN KEY (
    assessment_id,
    source_instrument_code,
    source_instrument_version
  )
  REFERENCES behavioral_assessments (
    id,
    instrument_code,
    instrument_version
  );

ALTER TABLE eli_behavioral_priors
  ADD CONSTRAINT fk_eli_behavioral_prior_mapping_authority
  FOREIGN KEY (
    mapping_authority_id,
    source_instrument_code,
    source_instrument_version,
    source_factor_key,
    target_prior_key,
    algorithm_version,
    mapping_authority_disposition
  )
  REFERENCES eli_behavioral_mapping_authorities (
    id,
    instrument_code,
    instrument_version,
    source_factor_key,
    target_prior_key,
    algorithm_version,
    disposition
  );

COMMIT;
