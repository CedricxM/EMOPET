-- WORLD-SOCIAL-01 / #594 - canonical user-to-user block (decision #48 L5, 2026-09-27).
-- One-sided and silent. No free-text reason is stored. Founder decision #594
-- (issuecomment-5856975549): rows are deleted on erasure of either account by the
-- ordered erasure executor, so both user references keep PostgreSQL NO ACTION
-- (no database cascade).

BEGIN;

CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id UUID NOT NULL
    CONSTRAINT user_blocks_blocker_user_id_users_id_fk REFERENCES users(id),
  blocked_user_id UUID NOT NULL
    CONSTRAINT user_blocks_blocked_user_id_users_id_fk REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_user_blocks_not_self CHECK (blocker_user_id <> blocked_user_id),
  CONSTRAINT uq_user_blocks_pair UNIQUE (blocker_user_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_user_id);

COMMIT;
