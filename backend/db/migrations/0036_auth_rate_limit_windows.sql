-- AUTH-RATE-LIMIT-01 (#767)
-- Shared PostgreSQL fixed-window state for public auth abuse control.
-- bucket_hash is HMAC-SHA256 pseudonymous material; no raw IP/header value is stored.

CREATE TABLE auth_rate_limit_windows (
  bucket_hash varchar(64) PRIMARY KEY,
  count integer NOT NULL,
  window_started_at timestamptz NOT NULL,
  reset_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,

  CONSTRAINT chk_auth_rate_limit_windows_bucket_hash
    CHECK (bucket_hash ~ '^[0-9a-f]{64}$'),

  CONSTRAINT chk_auth_rate_limit_windows_count
    CHECK (count BETWEEN 1 AND 1000000),

  CONSTRAINT chk_auth_rate_limit_windows_time_order
    CHECK (reset_at > window_started_at),

  CONSTRAINT chk_auth_rate_limit_windows_updated_at
    CHECK (
      updated_at >= window_started_at
      AND updated_at < reset_at
    )
);

CREATE INDEX idx_auth_rate_limit_windows_reset_at
  ON auth_rate_limit_windows(reset_at);
