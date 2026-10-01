-- PRIV-SEC-ALERT-ACK-01 — bounded authenticated acknowledgement evidence.
-- Identity is supplied only by the canonical privileged server transport.
-- No provider destination/token, request body, free-form note/message or SLA state.

CREATE TABLE security_alert_acknowledgements (
  alert_id uuid PRIMARY KEY,
  acknowledged_at timestamptz NOT NULL,
  acknowledged_by_subject uuid NOT NULL,
  acknowledged_by_role varchar(16) NOT NULL,
  audit_event_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT security_alert_acknowledgements_alert_id_security_alert_outbox_alert_id_fk
    FOREIGN KEY (alert_id)
    REFERENCES security_alert_outbox(alert_id)
    ON DELETE CASCADE,

  CONSTRAINT security_alert_acknowledgements_audit_event_id_security_audit_events_id_fk
    FOREIGN KEY (audit_event_id)
    REFERENCES security_audit_events(id),

  CONSTRAINT chk_security_alert_acknowledgements_role
    CHECK (acknowledged_by_role IN ('admin', 'operator'))
);

CREATE INDEX idx_security_alert_acknowledgements_acknowledged_at
  ON security_alert_acknowledgements(acknowledged_at);
