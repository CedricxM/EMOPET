-- EMOPET-REPLAY-PROVENANCE: original=0006_professional_share_authority.sql; source_commit=20c8c494ecb91ea3699da38430478027288f1e35; source_blob=9ec1ebabc87c3048feb3029a9f1ac96441f4b312
-- EMOPET-ADDITIONAL-PROVENANCE: original=0009_professional_share_owner_terminology.sql; source_commit=37507fe3bb10dfae3a492e9eb895531cf8ebc0f9; source_blob=9ec91d597bd6cbdf3fa97591d61788a297b208b9
-- Owning slice: INT-05 / #261
-- Disposition: RECONSTRUCTED_FINAL_DELTA
-- Allocated under #258 Model A against main@05fd3d8370b1737a3ef066bdf37d3e5c0f43aa2b.

BEGIN;

CREATE TABLE professional_share_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id),
  dog_id UUID NOT NULL REFERENCES dogs(id),
  recipient_display_name VARCHAR(160) NOT NULL,
  recipient_type VARCHAR(30) NOT NULL CONSTRAINT chk_prof_share_recipient_type
    CHECK (recipient_type IN ('VETERINARIAN','VETERINARY_CLINIC','RESEARCHER','OTHER_PROFESSIONAL')),
  recipient_organization_name VARCHAR(200),
  recipient_email VARCHAR(254),
  recipient_principal_id VARCHAR(128),
  purpose VARCHAR(50) NOT NULL CONSTRAINT chk_prof_share_purpose
    CHECK (purpose IN ('VETERINARY_CONSULTATION','FOLLOW_UP','SECOND_OPINION','RESEARCH_WITH_SEPARATE_CONSENT','OTHER_DECLARED_PURPOSE')),
  purpose_note VARCHAR(500),
  scopes JSONB NOT NULL CONSTRAINT chk_prof_share_scopes
    CHECK (
      CASE WHEN jsonb_typeof(scopes) = 'array' THEN
        jsonb_array_length(scopes) BETWEEN 1 AND 5
        AND scopes <@ '["VETERINARY_SUMMARY","OWNER_SELECTED_NOTES","QUALIFIED_LONGITUDINAL_OBSERVATIONS","DATA_COVERAGE_AND_CONFIDENCE","DECLARED_CONTEXT"]'::jsonb
      ELSE false END
    ),
  data_from TIMESTAMPTZ NOT NULL,
  data_to TIMESTAMPTZ NOT NULL,
  access_expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CONSTRAINT chk_prof_share_status
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
    (status <> 'ACTIVE' OR (recipient_principal_id IS NOT NULL AND activated_at IS NOT NULL))
    AND (status <> 'REVOKED' OR revoked_at IS NOT NULL)
  )
);

CREATE INDEX idx_prof_share_grant_owner_dog ON professional_share_grants(owner_user_id, dog_id);
CREATE INDEX idx_prof_share_grant_recipient_principal ON professional_share_grants(recipient_principal_id);
CREATE INDEX idx_prof_share_grant_status_expiry ON professional_share_grants(status, access_expires_at);

CREATE TABLE professional_share_access_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID NOT NULL,
  dog_id UUID NOT NULL,
  event VARCHAR(50) NOT NULL CONSTRAINT chk_prof_share_audit_event
    CHECK (event = 'PROFESSIONAL_SHARE_POLICY_DECISION'),
  decision_status VARCHAR(20) NOT NULL CONSTRAINT chk_prof_share_audit_status
    CHECK (decision_status IN ('DENIED','UNAVAILABLE','AUTHORIZED')),
  reason VARCHAR(60) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prof_share_audit_grant_created ON professional_share_access_audits(grant_id, created_at);
CREATE INDEX idx_prof_share_audit_dog_created ON professional_share_access_audits(dog_id, created_at);

COMMIT;
