-- PRIV-SEC-ALERT-ESCALATE-01 — durable provider-neutral escalation attempts.
-- No provider, destination/contact, retry policy or SLA is selected here.

CREATE TABLE security_alert_escalation_attempts (
  attempt_id uuid PRIMARY KEY,
  alert_id uuid NOT NULL,
  escalation_owner varchar(32) NOT NULL,
  attempted_at timestamptz NOT NULL,
  state varchar(32) NOT NULL,
  resolved_at timestamptz,
  provider_receipt_ref varchar(128),
  failure_code varchar(32),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT security_alert_escalation_attempts_alert_id_security_alert_outbox_alert_id_fk
    FOREIGN KEY (alert_id)
    REFERENCES security_alert_outbox(alert_id)
    ON DELETE CASCADE,

  CONSTRAINT chk_security_alert_escalation_owner
    CHECK (escalation_owner IN ('security_duty', 'incident_commander')),

  CONSTRAINT chk_security_alert_escalation_attempt_state
    CHECK (state IN ('PENDING', 'DELIVERED', 'ATTEMPT_FAILED')),

  CONSTRAINT chk_security_alert_escalation_attempt_shape
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

-- This slice is first-attempt-only. Retry policy remains separately unauthorized.
CREATE UNIQUE INDEX uq_security_alert_escalation_attempts_alert
  ON security_alert_escalation_attempts(alert_id);

CREATE INDEX idx_security_alert_escalation_attempts_state_time
  ON security_alert_escalation_attempts(state, attempted_at);
