-- WORLD-SOCIAL-02 / #595 - canonical social connections (#46 trust ladder, decision #48 L3)
-- and World presence visibility consent (decision #48 L2), 2026-09-27. Transitions decided
-- 2026-09-28 (#595 issuecomment-5866924308): request + acceptance, silent decline that only the
-- declining person can reopen, block dissolves the connection. TRUSTED is directional and
-- user-granted, and requires CONNECTED. No score, no automatic upgrade, no free text.
-- User references keep PostgreSQL NO ACTION: erasure goes through the ordered executor.

BEGIN;

CREATE TABLE IF NOT EXISTS social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_low_id UUID NOT NULL
    CONSTRAINT social_connections_user_low_id_users_id_fk REFERENCES users(id),
  user_high_id UUID NOT NULL
    CONSTRAINT social_connections_user_high_id_users_id_fk REFERENCES users(id),
  status VARCHAR(20) NOT NULL,
  requested_by_low BOOLEAN NOT NULL,
  low_trusts_high BOOLEAN NOT NULL DEFAULT FALSE,
  high_trusts_low BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  connected_at TIMESTAMPTZ,
  CONSTRAINT chk_social_connections_ordered_pair CHECK (user_low_id < user_high_id),
  CONSTRAINT chk_social_connections_status CHECK (status IN ('PENDING', 'CONNECTED', 'DECLINED')),
  CONSTRAINT chk_social_connections_connected_at CHECK ((status = 'CONNECTED') = (connected_at IS NOT NULL)),
  CONSTRAINT chk_social_connections_trust_requires_connection
    CHECK (status = 'CONNECTED' OR (NOT low_trusts_high AND NOT high_trusts_low)),
  CONSTRAINT uq_social_connections_pair UNIQUE (user_low_id, user_high_id)
);

CREATE INDEX IF NOT EXISTS idx_social_connections_high ON social_connections(user_high_id);

-- One consent record per person, purpose "World presence" only. A grant covers one World
-- session (expires_at); every new session starts invisible and needs a new opt-in.
CREATE TABLE IF NOT EXISTS world_presence_consents (
  user_id UUID PRIMARY KEY
    CONSTRAINT world_presence_consents_user_id_users_id_fk REFERENCES users(id),
  granted_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  withdrawn_at TIMESTAMPTZ,
  CONSTRAINT chk_world_presence_consents_window CHECK (expires_at > granted_at),
  CONSTRAINT chk_world_presence_consents_withdrawn_after_grant
    CHECK (withdrawn_at IS NULL OR withdrawn_at >= granted_at)
);

COMMIT;
