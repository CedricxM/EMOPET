-- PRIV-SEC-ALERT-ACK-01 — bounded durable acknowledgement evidence.
-- No provider destination/token/payload, free-form note or caller-supplied role metadata.

CREATE TABLE security_alert_acknowledgements (
  alert_id uuid PRIMARY KEY,
  request_id uuid NOT NULL,
  actor_subject uuid NOT NULL,
  actor_role varchar(16) NOT NULL,
  acknowledged_at timestamptz NOT NULL,
  audit_event_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT security_alert_acknowledgements_alert_id_security_alert_outbox_alert_id_fk
    FOREIGN KEY (alert_id)
    REFERENCES security_alert_outbox(alert_id)
    ON DELETE CASCADE,

  CONSTRAINT security_alert_acknowledgements_audit_event_id_security_audit_events_id_fk
    FOREIGN KEY (audit_event_id)
    REFERENCES security_audit_events(id),

  CONSTRAINT chk_security_alert_acknowledgements_actor_role
    CHECK (actor_role IN ('admin', 'operator'))
);

CREATE UNIQUE INDEX uq_security_alert_acknowledgements_request_id
  ON security_alert_acknowledgements(request_id);

CREATE UNIQUE INDEX uq_security_alert_acknowledgements_audit_event_id
  ON security_alert_acknowledgements(audit_event_id);

CREATE INDEX idx_security_alert_acknowledgements_actor_time
  ON security_alert_acknowledgements(actor_subject, acknowledged_at);
