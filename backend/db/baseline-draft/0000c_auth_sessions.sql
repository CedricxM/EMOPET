-- EMOPET AUTH-01 REFRESH SESSION BASELINE DELTA — DRAFT ONLY
--
-- STATUS: QA_PENDING_DISPOSABLE_POSTGRES_VALIDATION
-- AUTHORITY: NON-EXECUTABLE DRAFT / NOT AN ACTIVE MIGRATION
--
-- This file keeps the historical+draft baseline aligned with the current
-- Drizzle schema while AUTH-01 is under review. It must remain outside
-- db/migrations/ until the migration/release gate is explicitly closed.

BEGIN;

CREATE TABLE auth_refresh_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  family_id UUID NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoke_reason VARCHAR(50),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_refresh_sessions_user
  ON auth_refresh_sessions(user_id);

CREATE INDEX idx_auth_refresh_sessions_family
  ON auth_refresh_sessions(family_id);

CREATE INDEX idx_auth_refresh_sessions_expiry
  ON auth_refresh_sessions(expires_at);

COMMIT;
