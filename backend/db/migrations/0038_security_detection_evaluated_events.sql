-- PRIV-SEC-DETECT-WATERMARK-01 (#776)
-- Restore an immutable monitoring scope boundary and add a minimal receipt
-- ledger proving which canonical audit-event ids have actually been evaluated.
--
-- This is not alert history, detection history or a retention policy.

ALTER TABLE security_detection_scheduler_state
  ADD COLUMN monitoring_started_at timestamptz;

-- Existing scheduler rows predate this authority. Backfill conservatively to
-- the current cursor boundary rather than claiming earlier monitoring coverage.
UPDATE security_detection_scheduler_state
SET monitoring_started_at = last_successful_window_end
WHERE monitoring_started_at IS NULL;

ALTER TABLE security_detection_scheduler_state
  ALTER COLUMN monitoring_started_at SET NOT NULL;

ALTER TABLE security_detection_scheduler_state
  ADD CONSTRAINT chk_security_detection_scheduler_state_monitoring_scope
  CHECK (monitoring_started_at <= last_successful_window_end);

CREATE TABLE security_detection_evaluated_events (
  audit_event_id uuid PRIMARY KEY,
  evaluated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT security_detection_evaluated_events_audit_event_id_security_audit_events_id_fk
    FOREIGN KEY (audit_event_id)
    REFERENCES security_audit_events(id)
    ON DELETE CASCADE
);
