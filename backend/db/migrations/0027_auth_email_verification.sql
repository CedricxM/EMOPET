-- AUTH-EMAIL-VERIFY-01 — durable email-ownership proof authority
-- Core token/state only. This migration does not change public registration
-- semantics and does not activate an email provider.

ALTER TABLE users
  ADD COLUMN email_verified_at timestamptz;

CREATE TABLE auth_email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email varchar(255) NOT NULL,
  token_hash varchar(64) NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  revoked_at timestamptz,
  revoke_reason varchar(32),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT auth_email_verification_tokens_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  CONSTRAINT chk_auth_email_verification_tokens_hash
    CHECK (token_hash ~ '^[0-9a-f]{64}$'),

  CONSTRAINT chk_auth_email_verification_tokens_expiry
    CHECK (expires_at > created_at),

  CONSTRAINT chk_auth_email_verification_tokens_consumed_time
    CHECK (
      consumed_at IS NULL
      OR (consumed_at >= created_at AND consumed_at < expires_at)
    ),

  CONSTRAINT chk_auth_email_verification_tokens_revoked_time
    CHECK (revoked_at IS NULL OR revoked_at >= created_at),

  CONSTRAINT chk_auth_email_verification_tokens_terminal_state
    CHECK (NOT (consumed_at IS NOT NULL AND revoked_at IS NOT NULL)),

  CONSTRAINT chk_auth_email_verification_tokens_revoke_reason
    CHECK (
      (revoked_at IS NULL AND revoke_reason IS NULL)
      OR (
        revoked_at IS NOT NULL
        AND revoke_reason IN ('superseded', 'manual_revoke')
      )
    )
);

CREATE UNIQUE INDEX uq_auth_email_verification_tokens_token_hash
  ON auth_email_verification_tokens(token_hash);

CREATE UNIQUE INDEX uq_auth_email_verification_tokens_live_per_user
  ON auth_email_verification_tokens(user_id)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

CREATE INDEX idx_auth_email_verification_tokens_user
  ON auth_email_verification_tokens(user_id);

CREATE INDEX idx_auth_email_verification_tokens_expiry
  ON auth_email_verification_tokens(expires_at);
