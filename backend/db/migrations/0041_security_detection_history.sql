-- PRIV-SEC-DETECT-HISTORY-01 — bounded durable anomaly-detection evidence.
-- No actor fingerprint, payload copy, alert-delivery authority or retention term.

CREATE TABLE security_detection_history (
  detection_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key varchar(64) NOT NULL,
  detector_type varchar(64) NOT NULL,
  policy_revision varchar(64) NOT NULL,
  evaluation_window_start timestamptz NOT NULL,
  evaluation_window_end timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  event_count integer,
  unique_target_count integer,

  CONSTRAINT chk_security_detection_history_dedupe_key
    CHECK (dedupe_key ~ '^[0-9a-f]{64}$'),

  CONSTRAINT chk_security_detection_history_detector_type
    CHECK (detector_type IN (
      'repeated_privileged_denials',
      'rapid_multi_target_access',
      'machine_privileged_authority_attempt'
    )),

  CONSTRAINT chk_security_detection_history_policy_revision
    CHECK (policy_revision ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'),

  CONSTRAINT chk_security_detection_history_window
    CHECK (
      evaluation_window_end > evaluation_window_start
      AND recorded_at >= evaluation_window_end
    ),

  CONSTRAINT chk_security_detection_history_metric_shape
    CHECK (
      (
        detector_type = 'repeated_privileged_denials'
        AND event_count IS NOT NULL
        AND event_count > 0
        AND unique_target_count IS NULL
      )
      OR (
        detector_type = 'rapid_multi_target_access'
        AND event_count IS NULL
        AND unique_target_count IS NOT NULL
        AND unique_target_count > 0
      )
      OR (
        detector_type = 'machine_privileged_authority_attempt'
        AND event_count IS NULL
        AND unique_target_count IS NULL
      )
    )
);

CREATE UNIQUE INDEX uq_security_detection_history_dedupe_key
  ON security_detection_history(dedupe_key);

CREATE INDEX idx_security_detection_history_recorded_at
  ON security_detection_history(recorded_at);

CREATE TABLE security_detection_history_events (
  detection_id uuid NOT NULL
    REFERENCES security_detection_history(detection_id) ON DELETE CASCADE,
  audit_event_id uuid NOT NULL
    REFERENCES security_audit_events(id),

  CONSTRAINT pk_security_detection_history_events
    PRIMARY KEY (detection_id, audit_event_id)
);

CREATE INDEX idx_security_detection_history_events_audit_event_id
  ON security_detection_history_events(audit_event_id);
