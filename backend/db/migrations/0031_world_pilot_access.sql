-- WORLD-SOCIAL-03 / #596 - canonical World pilot access (decision #48 L1, 2026-09-27).
-- Invited adult testers only: a grant requires the tester's self-declared adulthood,
-- and no minor may enter in any mode. EMOPET owns this flag; Nakama keeps only a
-- derived projection. Revocation keeps the row (revoked_at) so a re-grant is explicit.
-- The account-erasure disposition is TO_CONFIRM, so the user reference keeps
-- PostgreSQL NO ACTION (no database cascade, nothing inferred).

BEGIN;

CREATE TABLE IF NOT EXISTS world_pilot_access (
  user_id UUID PRIMARY KEY
    CONSTRAINT world_pilot_access_user_id_users_id_fk REFERENCES users(id),
  adult_self_declared_at TIMESTAMPTZ NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  CONSTRAINT chk_world_pilot_access_declared_before_grant CHECK (adult_self_declared_at <= granted_at),
  CONSTRAINT chk_world_pilot_access_revoked_after_grant CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

COMMIT;
