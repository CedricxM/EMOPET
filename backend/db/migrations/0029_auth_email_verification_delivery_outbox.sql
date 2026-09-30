-- AUTH-EMAIL-VERIFY-02 — durable delivery-intent outbox.
-- Public register/resend requests enqueue here and never wait for provider I/O.
-- Raw verification tokens and verification URLs are never persisted in this table.

CREATE TABLE auth_email_verification_delivery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255),
  email_hash varchar(64) NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  available_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  claim_expires_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  outcome varchar(32),
  last_error varchar(32),
  provider_message_id varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_auth_email_verification_delivery_email_hash
    CHECK (email_hash ~ '^[0-9a-f]{64}$'),

  CONSTRAINT chk_auth_email_verification_delivery_attempt_count
    CHECK (attempt_count BETWEEN 0 AND 5),

  CONSTRAINT chk_auth_email_verification_delivery_availability
    CHECK (available_at >= requested_at),

  CONSTRAINT chk_auth_email_verification_delivery_claim
    CHECK (
      (claimed_at IS NULL AND claim_expires_at IS NULL)
      OR
      (
        claimed_at IS NOT NULL
        AND claim_expires_at IS NOT NULL
        AND claim_expires_at > claimed_at
      )
    ),

  CONSTRAINT chk_auth_email_verification_delivery_terminal
    CHECK (
      (
        completed_at IS NULL
        AND email IS NOT NULL
        AND outcome IS NULL
      )
      OR
      (
        completed_at IS NOT NULL
        AND completed_at >= requested_at
        AND email IS NULL
        AND claimed_at IS NULL
        AND claim_expires_at IS NULL
        AND outcome IN ('delivered', 'not_eligible', 'failed')
      )
    ),

  CONSTRAINT chk_auth_email_verification_delivery_last_error
    CHECK (
      last_error IS NULL
      OR last_error IN (
        'provider_not_configured',
        'provider_rejected',
        'provider_unavailable',
        'invalid_input'
      )
    )
);

CREATE UNIQUE INDEX uq_auth_email_verification_delivery_active_email
  ON auth_email_verification_delivery_requests(email_hash)
  WHERE completed_at IS NULL;

CREATE INDEX idx_auth_email_verification_delivery_ready
  ON auth_email_verification_delivery_requests(available_at, requested_at)
  WHERE completed_at IS NULL;

CREATE INDEX idx_auth_email_verification_delivery_cooldown
  ON auth_email_verification_delivery_requests(email_hash, requested_at);
