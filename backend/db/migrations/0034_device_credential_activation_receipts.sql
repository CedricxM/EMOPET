-- DEVICE-TRUST-ID-14 — durable receipt for an already-authorized
-- credential activation/cutover. This migration does not create M4/M5 evidence
-- authority and does not expose an activation route.

CREATE TABLE device_credential_activation_receipts (
  activation_id uuid PRIMARY KEY,
  schema_version varchar(64) NOT NULL,
  protocol_version integer NOT NULL,

  device_id uuid NOT NULL,
  credential_id uuid NOT NULL,
  credential_version bigint NOT NULL,

  predecessor_credential_id uuid,
  predecessor_credential_version bigint,

  cutover_type varchar(16) NOT NULL,

  evidence_schema_version varchar(72) NOT NULL,
  evidence_protocol_version integer NOT NULL,
  pop_verification_receipt_id uuid NOT NULL,
  pop_challenge_id uuid NOT NULL,
  debug_state_receipt_id uuid NOT NULL,
  target_evidence_receipt_id uuid NOT NULL,
  evidence_authority varchar(64) NOT NULL,
  evidence_recorded_at timestamptz NOT NULL,

  firmware_version varchar(128) NOT NULL,
  hardware_revision varchar(128) NOT NULL,
  bootstrap_revision varchar(128) NOT NULL,

  resulting_credential_state varchar(32) NOT NULL,
  predecessor_resulting_state varchar(32) NOT NULL,

  activated_at timestamptz NOT NULL,
  device_data_trust_authorized boolean NOT NULL,
  network_telemetry_persistence_authorized boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT device_credential_activation_receipts_device_id_devices_id_fk
    FOREIGN KEY (device_id) REFERENCES devices(id),

  CONSTRAINT device_credential_activation_receipts_credential_id_device_identity_credentials_id_fk
    FOREIGN KEY (credential_id) REFERENCES device_identity_credentials(id),

  CONSTRAINT device_credential_activation_receipts_predecessor_credential_id_device_identity_credentials_id_fk
    FOREIGN KEY (predecessor_credential_id) REFERENCES device_identity_credentials(id),

  CONSTRAINT chk_device_credential_activation_receipts_schema
    CHECK (
      schema_version = 'device-credential-activation-receipt-v1'
      AND protocol_version = 1
      AND evidence_schema_version = 'device-credential-activation-evidence-refs-v1'
      AND evidence_protocol_version = 1
    ),

  CONSTRAINT chk_device_credential_activation_receipts_version
    CHECK (
      credential_version BETWEEN 1 AND 4294967295
      AND (
        predecessor_credential_version IS NULL
        OR predecessor_credential_version BETWEEN 1 AND 4294967295
      )
    ),

  CONSTRAINT chk_device_credential_activation_receipts_cutover_type
    CHECK (cutover_type IN ('INITIAL', 'ROTATION')),

  CONSTRAINT chk_device_credential_activation_receipts_authority
    CHECK (evidence_authority = 'SERVER_SIDE_MANUFACTURING_EVIDENCE_AUTHORITY'),

  CONSTRAINT chk_device_credential_activation_receipts_result_states
    CHECK (
      resulting_credential_state = 'ACTIVE'
      AND predecessor_resulting_state IN ('NONE', 'REVOKED_PENDING_ERASE')
    ),

  CONSTRAINT chk_device_credential_activation_receipts_non_authority
    CHECK (
      device_data_trust_authorized = false
      AND network_telemetry_persistence_authorized = false
    ),

  CONSTRAINT chk_device_credential_activation_receipts_time
    CHECK (activated_at >= evidence_recorded_at),

  CONSTRAINT chk_device_credential_activation_receipts_predecessor_shape
    CHECK (
      (
        cutover_type = 'INITIAL'
        AND predecessor_credential_id IS NULL
        AND predecessor_credential_version IS NULL
        AND predecessor_resulting_state = 'NONE'
      )
      OR
      (
        cutover_type = 'ROTATION'
        AND predecessor_credential_id IS NOT NULL
        AND predecessor_credential_version IS NOT NULL
        AND predecessor_resulting_state = 'REVOKED_PENDING_ERASE'
      )
    ),

  CONSTRAINT chk_device_credential_activation_receipts_versions_differ
    CHECK (
      predecessor_credential_version IS NULL
      OR predecessor_credential_version <> credential_version
    )
);

CREATE UNIQUE INDEX uq_device_credential_activation_receipts_device_version
  ON device_credential_activation_receipts(device_id, credential_version);

CREATE UNIQUE INDEX uq_device_credential_activation_receipts_credential_id
  ON device_credential_activation_receipts(credential_id);

CREATE INDEX idx_device_credential_activation_receipts_device_activated_at
  ON device_credential_activation_receipts(device_id, activated_at);
