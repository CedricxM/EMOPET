-- Migration 0006: Durable professional-share grant and access audit (2026-09-10)
--
-- Adds the persistence required by the server-side #64 access policy without
-- enabling a production sharing endpoint or inventing a recipient identity
-- provider. Grants remain Guardian/dog scoped; access decisions are audited
-- using sanitized identifiers and finite decision vocabulary.

BEGIN;

CREATE TABLE IF NOT EXISTS professional_share_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_user_id UUID NOT NULL REFERENCES users(id),
  dog_id UUID NOT NULL REFERENCES dogs(id),

  recipient_display_name VARCHAR(160) NOT NULL,
  recipient_type VARCHAR(30) NOT NULL
    CHECK (recipient_type IN ('VETERINARIAN','VETERINARY_CLINIC','RESEARCHER','OTHER_PROFESSIONAL')),
  recipient_organization_name VARCHAR(200),
  recipient_email VARCHAR(254),
  recipient_principal_id VARCHAR(128),

  purpose VARCHAR(50) NOT NULL
    CHECK (purpose IN ('VETERINARY_CONSULTATION','FOLLOW_UP','SECOND_OPINION','RESEARCH_WITH_SEPARATE_CONSENT','OTHER_DECLARED_PURPOSE')),
  purpose_note VARCHAR(500),
  scopes JSONB NOT NULL
    CHECK (jsonb_typeof(scopes) = 'array' AND jsonb_array_length(scopes) BETWEEN 1 AND 5),
  data_from TIMESTAMPTZ NOT NULL,
  data_to TIMESTAMPTZ NOT NULL,
  access_expires_at TIMESTAMPTZ NOT NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','ACTIVE','EXPIRED','REVOKED','SUSPENDED')),
  activated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_reason VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_prof_share_recipient_binding CHECK (
    recipient_email IS NOT NULL OR recipient_principal_id IS NOT NULL
  ),
  CONSTRAINT chk_prof_share_data_window CHECK (data_to >= data_from),
  CONSTRAINT chk_prof_share_access_window CHECK (access_expires_at > created_at),
  CONSTRAINT chk_prof_share_lifecycle CHECK (
    (status <> 'ACTIVE' OR activated_at IS NOT NULL)
    AND (status <> 'REVOKED' OR revoked_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_prof_share_grant_guardian_dog
  ON professional_share_grants(guardian_user_id, dog_id);
CREATE INDEX IF NOT EXISTS idx_prof_share_grant_recipient_principal
  ON professional_share_grants(recipient_principal_id);
CREATE INDEX IF NOT EXISTS idx_prof_share_grant_status_expiry
  ON professional_share_grants(status, access_expires_at);

-- Audit identifiers intentionally have no FKs. Attempts against unknown or
-- substituted grant/dog IDs still require durable policy-decision evidence.
CREATE TABLE IF NOT EXISTS professional_share_access_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID NOT NULL,
  dog_id UUID NOT NULL,
  event VARCHAR(50) NOT NULL
    CHECK (event = 'PROFESSIONAL_SHARE_POLICY_DECISION'),
  decision_status VARCHAR(20) NOT NULL
    CHECK (decision_status IN ('DENIED','UNAVAILABLE','AUTHORIZED')),
  reason VARCHAR(60) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prof_share_audit_grant_created
  ON professional_share_access_audits(grant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_prof_share_audit_dog_created
  ON professional_share_access_audits(dog_id, created_at);

COMMIT;

-- Manual rollback, only for disposable/non-production environments:
--   BEGIN;
--   DROP TABLE IF EXISTS professional_share_access_audits;
--   DROP TABLE IF EXISTS professional_share_grants;
--   COMMIT;
