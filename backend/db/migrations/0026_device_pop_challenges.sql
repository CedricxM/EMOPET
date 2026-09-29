-- DEVICE-TRUST-ID-13 — durable proof-of-possession challenge/replay state
-- Challenge state only. No credential activation or Device Data Trust grant.

CREATE TABLE device_pop_challenges (
  challenge_id uuid PRIMARY KEY,
  device_id uuid NOT NULL,
  credential_version bigint NOT NULL,
  purpose varchar(48) NOT NULL,
  nonce varchar(43) NOT NULL,
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  signing_contract varchar(48) NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT device_pop_challenges_device_id_devices_id_fk
    FOREIGN KEY (device_id) REFERENCES devices(id),

  CONSTRAINT chk_device_pop_challenges_credential_version
    CHECK (credential_version BETWEEN 1 AND 4294967295),

  CONSTRAINT chk_device_pop_challenges_purpose
    CHECK (purpose = 'DEVICE_DATA_TELEMETRY_INGRESS'),

  CONSTRAINT chk_device_pop_challenges_signing_contract
    CHECK (signing_contract = 'EMOPET_DEVICE_POP_FIXED_BINARY_V1'),

  -- Canonical unpadded base64url for exactly 32 bytes. With 32 bytes the final
  -- base64url symbol has only four significant bits, hence the restricted tail.
  CONSTRAINT chk_device_pop_challenges_nonce
    CHECK (nonce ~ '^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$'),

  CONSTRAINT chk_device_pop_challenges_expiry
    CHECK (expires_at > issued_at),

  CONSTRAINT chk_device_pop_challenges_consumed_time
    CHECK (
      consumed_at IS NULL
      OR (
        consumed_at >= issued_at
        AND consumed_at < expires_at
      )
    )
);

CREATE INDEX idx_device_pop_challenges_device_credential
  ON device_pop_challenges(device_id, credential_version);

CREATE INDEX idx_device_pop_challenges_expires_at
  ON device_pop_challenges(expires_at);
