-- DEVICE-TRUST-ID-12 — durable public credential authority
-- Public-key material only. This migration does not activate Device Data Trust.

CREATE TABLE device_identity_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id),
  credential_version bigint NOT NULL,
  state varchar(32) NOT NULL,
  key_slot varchar(1) NOT NULL,
  psa_key_id bigint NOT NULL,
  algorithm varchar(32) NOT NULL,
  public_key_format varchar(40) NOT NULL,
  public_key_base64url varchar(87) NOT NULL,
  firmware_version varchar(128) NOT NULL,
  hardware_revision varchar(128) NOT NULL,
  bootstrap_revision varchar(128) NOT NULL,
  private_key_exported boolean NOT NULL,
  device_principal_binding varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  revoked_at timestamptz,

  CONSTRAINT chk_device_identity_credentials_version
    CHECK (credential_version BETWEEN 1 AND 4294967295),

  CONSTRAINT chk_device_identity_credentials_state
    CHECK (state IN ('PENDING_PROOF', 'ACTIVE', 'REVOKED_PENDING_ERASE')),

  CONSTRAINT chk_device_identity_credentials_slot_key
    CHECK (
      (key_slot = 'A' AND psa_key_id = 65536)
      OR
      (key_slot = 'B' AND psa_key_id = 65537)
    ),

  CONSTRAINT chk_device_identity_credentials_algorithm
    CHECK (algorithm = 'ECDSA_P256_SHA256'),

  CONSTRAINT chk_device_identity_credentials_public_key_format
    CHECK (public_key_format = 'SEC1_UNCOMPRESSED_P256_65'),

  -- Canonical unpadded base64url for exactly 65 bytes whose first byte is 0x04.
  -- 0x04 forces the first base64 character to B and the second to A..P.
  CONSTRAINT chk_device_identity_credentials_public_key
    CHECK (public_key_base64url ~ '^B[A-P][A-Za-z0-9_-]{85}$'),

  CONSTRAINT chk_device_identity_credentials_private_key_absent
    CHECK (private_key_exported = false),

  CONSTRAINT chk_device_identity_credentials_binding_authority
    CHECK (device_principal_binding = 'BACKEND_MANUFACTURING_AUTHORITY_REQUIRED'),

  CONSTRAINT chk_device_identity_credentials_state_timestamps
    CHECK (
      (
        state = 'PENDING_PROOF'
        AND activated_at IS NULL
        AND revoked_at IS NULL
      )
      OR
      (
        state = 'ACTIVE'
        AND activated_at IS NOT NULL
        AND revoked_at IS NULL
      )
      OR
      (
        state = 'REVOKED_PENDING_ERASE'
        AND activated_at IS NOT NULL
        AND revoked_at IS NOT NULL
      )
    )
);

CREATE UNIQUE INDEX uq_device_identity_credentials_device_version
  ON device_identity_credentials(device_id, credential_version);

-- A slot remains occupied until an explicit future erase lifecycle removes the
-- durable credential row. Enrollment itself cannot recycle a slot.
CREATE UNIQUE INDEX uq_device_identity_credentials_device_slot
  ON device_identity_credentials(device_id, key_slot);

CREATE UNIQUE INDEX uq_device_identity_credentials_one_active_per_device
  ON device_identity_credentials(device_id)
  WHERE state = 'ACTIVE';

CREATE UNIQUE INDEX uq_device_identity_credentials_one_pending_per_device
  ON device_identity_credentials(device_id)
  WHERE state = 'PENDING_PROOF';

CREATE INDEX idx_device_identity_credentials_device_state
  ON device_identity_credentials(device_id, state);
