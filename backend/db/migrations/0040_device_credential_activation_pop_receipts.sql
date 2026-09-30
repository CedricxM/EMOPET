-- DEVICE-TRUST-ID-17 — durable manufacturing M4 PoP evidence.
-- Receipt insertion is coupled atomically to challenge consumption by repository code.

CREATE TABLE device_credential_activation_pop_receipts (
  receipt_id uuid PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES devices(id),
  credential_id uuid NOT NULL REFERENCES device_identity_credentials(id),
  credential_version bigint NOT NULL,
  challenge_id uuid NOT NULL REFERENCES device_pop_challenges(challenge_id),
  authority varchar(64) NOT NULL,
  purpose varchar(48) NOT NULL,
  verification_result varchar(32) NOT NULL,
  verified_at timestamptz NOT NULL,
  consumed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_device_credential_activation_pop_receipts_version
    CHECK (credential_version BETWEEN 1 AND 4294967295),

  CONSTRAINT chk_device_credential_activation_pop_receipts_authority
    CHECK (authority = 'SERVER_SIDE_POP_VERIFICATION_AUTHORITY'),

  CONSTRAINT chk_device_credential_activation_pop_receipts_purpose
    CHECK (purpose = 'DEVICE_CREDENTIAL_ACTIVATION'),

  CONSTRAINT chk_device_credential_activation_pop_receipts_result
    CHECK (verification_result = 'VERIFIED_AND_CONSUMED'),

  CONSTRAINT chk_device_credential_activation_pop_receipts_time
    CHECK (consumed_at >= verified_at)
);

CREATE UNIQUE INDEX uq_device_credential_activation_pop_receipts_challenge
  ON device_credential_activation_pop_receipts(challenge_id);

CREATE INDEX idx_device_credential_activation_pop_receipts_device_version
  ON device_credential_activation_pop_receipts(device_id, credential_version);
