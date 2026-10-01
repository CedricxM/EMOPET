-- PRIV-SEC-ALERT-OUTBOX-01 — provider-neutral durable alert candidates and attempts.
-- No destination/contact data, provider secret, raw provider payload, free-form message or SLA/retry policy.

CREATE TABLE security_alert_outbox (
  alert_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_detection_history_id uuid NOT NULL,
  routing_policy_revision varchar(64) NOT NULL,
  schema_version varchar(64) NOT NULL,
  source_detection_type varchar(64) NOT NULL,
  severity varchar(16) NOT NULL,
  primary_owner varchar(32) NOT NULL,
  detected_at timestamptz NOT NULL,
  acknowledge_by timestamptz NOT NULL,
  escalation_owner varchar(32) NOT NULL,
  escalate_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT security_alert_outbox_source_detection_history_id_security_detection_history_detection_id_fk
    FOREIGN KEY (source_detection_history_id)
    REFERENCES security_detection_history(detection_id),

  CONSTRAINT chk_security_alert_outbox_policy_revision
    CHECK (routing_policy_revision ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'),

  CONSTRAINT chk_security_alert_outbox_schema
    CHECK (schema_version = 'security-alert-delivery-v1'),

  CONSTRAINT chk_security_alert_outbox_detection_type
    CHECK (source_detection_type IN (
      'repeated_privileged_denials',
      'rapid_multi_target_access',
      'machine_privileged_authority_attempt'
    )),

  CONSTRAINT chk_security_alert_outbox_severity
    CHECK (severity IN ('medium', 'high', 'critical')),

  CONSTRAINT chk_security_alert_outbox_primary_owner
    CHECK (primary_owner IN ('security_duty', 'incident_commander')),

  CONSTRAINT chk_security_alert_outbox_escalation_owner
    CHECK (escalation_owner IN ('security_duty', 'incident_commander')),

  CONSTRAINT chk_security_alert_outbox_chronology
    CHECK (
      acknowledge_by >= detected_at
      AND escalate_at >= acknowledge_by
    )
);

CREATE UNIQUE INDEX uq_security_alert_outbox_source_policy
  ON security_alert_outbox(source_detection_history_id, routing_policy_revision);

CREATE INDEX idx_security_alert_outbox_created_at
  ON security_alert_outbox(created_at);

CREATE TABLE security_alert_delivery_attempts (
  attempt_id uuid PRIMARY KEY,
  alert_id uuid NOT NULL,
  attempted_at timestamptz NOT NULL,
  state varchar(32) NOT NULL,
  resolved_at timestamptz,
  provider_receipt_ref varchar(128),
  failure_code varchar(32),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT security_alert_delivery_attempts_alert_id_security_alert_outbox_alert_id_fk
    FOREIGN KEY (alert_id)
    REFERENCES security_alert_outbox(alert_id)
    ON DELETE CASCADE,

  CONSTRAINT chk_security_alert_delivery_attempt_state
    CHECK (state IN ('PENDING', 'DELIVERED', 'ATTEMPT_FAILED')),

  CONSTRAINT chk_security_alert_delivery_attempt_shape
    CHECK (
      (
        state = 'PENDING'
        AND resolved_at IS NULL
        AND provider_receipt_ref IS NULL
        AND failure_code IS NULL
      )
      OR (
        state = 'DELIVERED'
        AND resolved_at IS NOT NULL
        AND resolved_at >= attempted_at
        AND provider_receipt_ref ~ '^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$'
        AND failure_code IS NULL
      )
      OR (
        state = 'ATTEMPT_FAILED'
        AND resolved_at IS NOT NULL
        AND resolved_at >= attempted_at
        AND provider_receipt_ref IS NULL
        AND failure_code IN (
          'PROVIDER_UNAVAILABLE',
          'PROVIDER_REJECTED',
          'DELIVERY_TIMEOUT',
          'ADAPTER_FAILURE'
        )
      )
    )
);

CREATE UNIQUE INDEX uq_security_alert_delivery_attempts_one_pending
  ON security_alert_delivery_attempts(alert_id)
  WHERE state = 'PENDING';

CREATE INDEX idx_security_alert_delivery_attempts_alert
  ON security_alert_delivery_attempts(alert_id, attempted_at);
