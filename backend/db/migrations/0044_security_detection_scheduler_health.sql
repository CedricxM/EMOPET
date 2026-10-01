-- PRIV-SEC-DETECT-HEALTH-01 (#870)
-- Minimal operational scheduler health only.
-- No actor ids, target refs, detection payload, policy JSON or alert body.

CREATE TABLE security_detection_scheduler_health (
  stream_id varchar(64) PRIMARY KEY,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz,
  last_status varchar(64) NOT NULL,
  consecutive_failures integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_security_detection_scheduler_health_stream_id
    CHECK (stream_id = 'security-audit-v1'),

  CONSTRAINT chk_security_detection_scheduler_health_status
    CHECK (
      last_status IN (
        'INITIAL_CURSOR_REQUIRED',
        'BUSY',
        'WINDOW_NOT_READY',
        'SCAN_FAILED',
        'LATE_EVENT_LIMIT_EXCEEDED',
        'LATE_SCAN_FAILED',
        'EVALUATED',
        'SCHEDULER_UNAVAILABLE'
      )
    ),

  CONSTRAINT chk_security_detection_scheduler_health_failure_count
    CHECK (consecutive_failures >= 0),

  CONSTRAINT chk_security_detection_scheduler_health_success_shape
    CHECK (
      last_status <> 'EVALUATED'
      OR (
        last_success_at IS NOT NULL
        AND consecutive_failures = 0
      )
    ),

  CONSTRAINT chk_security_detection_scheduler_health_failure_shape
    CHECK (
      last_status NOT IN (
        'INITIAL_CURSOR_REQUIRED',
        'SCAN_FAILED',
        'LATE_EVENT_LIMIT_EXCEEDED',
        'LATE_SCAN_FAILED',
        'SCHEDULER_UNAVAILABLE'
      )
      OR consecutive_failures >= 1
    ),

  CONSTRAINT chk_security_detection_scheduler_health_time_order
    CHECK (
      (last_success_at IS NULL OR last_success_at <= last_attempt_at)
      AND updated_at >= last_attempt_at
    )
);
