-- DEVICE-TRUST-ID-18 — durable read authority for M5 debug/APPROTECT
-- and representative target evidence.
--
-- These tables persist already-established manufacturing evidence only.
-- No runtime writer, activation route or Device Data Trust authority is created.

CREATE TABLE device_credential_activation_debug_receipts (
  receipt_id uuid PRIMARY KEY,
  device_id uuid NOT NULL,
  credential_version bigint NOT NULL,
  authority varchar(64) NOT NULL,
  debug_state_result varchar(64) NOT NULL,
  firmware_version varchar(128) NOT NULL,
  hardware_revision varchar(128) NOT NULL,
  bootstrap_revision varchar(128) NOT NULL,
  recorded_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT device_credential_activation_debug_receipts_device_id_devices_id_fk
    FOREIGN KEY (device_id) REFERENCES devices(id),

  CONSTRAINT chk_device_credential_activation_debug_receipts_version
    CHECK (credential_version BETWEEN 1 AND 4294967295),

  CONSTRAINT chk_device_credential_activation_debug_receipts_authority
    CHECK (authority = 'SERVER_SIDE_PRODUCTION_DEBUG_AUTHORITY'),

  CONSTRAINT chk_device_credential_activation_debug_receipts_result
    CHECK (debug_state_result = 'APPROTECT_PRODUCTION_POLICY_VERIFIED')
);

CREATE INDEX idx_device_credential_activation_debug_receipts_device_version
  ON device_credential_activation_debug_receipts(device_id, credential_version);

CREATE TABLE device_credential_activation_target_receipts (
  receipt_id uuid PRIMARY KEY,
  device_id uuid NOT NULL,
  credential_version bigint NOT NULL,
  authority varchar(64) NOT NULL,
  target_result varchar(64) NOT NULL,
  firmware_version varchar(128) NOT NULL,
  hardware_revision varchar(128) NOT NULL,
  bootstrap_revision varchar(128) NOT NULL,
  recorded_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT device_credential_activation_target_receipts_device_id_devices_id_fk
    FOREIGN KEY (device_id) REFERENCES devices(id),

  CONSTRAINT chk_device_credential_activation_target_receipts_version
    CHECK (credential_version BETWEEN 1 AND 4294967295),

  CONSTRAINT chk_device_credential_activation_target_receipts_authority
    CHECK (authority = 'SERVER_SIDE_TARGET_EVIDENCE_AUTHORITY'),

  CONSTRAINT chk_device_credential_activation_target_receipts_result
    CHECK (target_result = 'REPRESENTATIVE_MS88SF3_NRF52840_VERIFIED')
);

CREATE INDEX idx_device_credential_activation_target_receipts_device_version
  ON device_credential_activation_target_receipts(device_id, credential_version);
