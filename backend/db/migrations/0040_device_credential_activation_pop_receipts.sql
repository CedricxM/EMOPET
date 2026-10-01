-- DEVICE-TRUST-ID-17 — durable M4 PoP verification evidence.
-- Bounded server-side evidence only. Challenge consumption and receipt insert
-- are committed atomically by the repository; no M5/M6 authority is created.

CREATE TABLE device_credential_activation_pop_receipts (
  receipt_id uuid PRIMARY KEY,
  device_id uuid NOT NULL,
  credential_version bigint NOT NULL,
  challenge_id uuid NOT NULL,
  authority varchar(64) NOT NULL,
  verification_result varchar(32) NOT NULL,
  verified_at timestamptz NOT NULL,
  consumed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT device_credential_activation_pop_receipts_device_id_devices_id_fk
    FOREIGN KEY (device_id) REFERENCES devices(id),

  CONSTRAINT device_credential_activation_pop_receipts_challenge_id_device_pop_challenges_challenge_id_fk
    FOREIGN KEY (challenge_id) REFERENCES device_pop_challenges(challenge_id),

  CONSTRAINT chk_device_credential_activation_pop_receipts_version
    CHECK (credential_version BETWEEN 1 AND 4294967295),

  CONSTRAINT chk_device_credential_activation_pop_receipts_authority
    CHECK (authority = 'SERVER_SIDE_POP_VERIFICATION_AUTHORITY'),

  CONSTRAINT chk_device_credential_activation_pop_receipts_result
    CHECK (verification_result = 'VERIFIED_AND_CONSUMED'),

  CONSTRAINT chk_device_credential_activation_pop_receipts_time
    CHECK (consumed_at = verified_at)
);

CREATE UNIQUE INDEX uq_device_credential_activation_pop_receipts_challenge_id
  ON device_credential_activation_pop_receipts(challenge_id);

CREATE INDEX idx_device_credential_activation_pop_receipts_device_version
  ON device_credential_activation_pop_receipts(device_id, credential_version);
