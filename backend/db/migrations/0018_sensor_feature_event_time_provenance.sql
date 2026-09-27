-- ELI-IO-04 / #122
-- Preserve boot-relative feature time and explicit UTC-anchor provenance.
-- The anchor producer remains unimplemented; this migration only makes future
-- time reconciliation reproducible instead of collapsing it into a bare UTC point.

ALTER TABLE sensor_feature_observations
  ADD COLUMN transport_window_end_ms bigint,
  ADD COLUMN event_time_resolution varchar(32),
  ADD COLUMN clock_anchor_device_ms bigint,
  ADD COLUMN clock_anchor_utc timestamptz,
  ADD COLUMN event_time_uncertainty_ms integer;

ALTER TABLE sensor_feature_observations
  ADD CONSTRAINT chk_sensor_feature_observations_transport_window_end
  CHECK (
    transport_window_end_ms IS NULL
    OR transport_window_end_ms BETWEEN 0 AND 4294967295
  );

ALTER TABLE sensor_feature_observations
  ADD CONSTRAINT chk_sensor_feature_observations_event_time_provenance
  CHECK (
    (
      event_time_resolution IS NULL
      AND clock_anchor_device_ms IS NULL
      AND clock_anchor_utc IS NULL
      AND event_time_uncertainty_ms IS NULL
    )
    OR
    (
      event_time_resolution = 'BOOT_ANCHOR_V1'
      AND transport_boot_session_id IS NOT NULL
      AND transport_window_end_ms IS NOT NULL
      AND clock_anchor_device_ms BETWEEN 0 AND 4294967295
      AND clock_anchor_utc IS NOT NULL
      AND event_time_uncertainty_ms >= 0
    )
  );
