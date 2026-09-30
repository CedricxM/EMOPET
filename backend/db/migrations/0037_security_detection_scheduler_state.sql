-- PRIV-SEC-DETECT-SCHED-01 (#769)
-- Durable cursor only. No detection payload/history, actor IDs or target refs.

CREATE TABLE security_detection_scheduler_state (
  stream_id varchar(64) PRIMARY KEY,
  monitoring_started_at timestamptz NOT NULL,
  last_successful_window_end timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_security_detection_scheduler_state_stream_id
    CHECK (stream_id = 'security-audit-v1'),

  CONSTRAINT chk_security_detection_scheduler_state_time_order
    CHECK (
      monitoring_started_at <= last_successful_window_end
      AND updated_at >= last_successful_window_end
    )
);
