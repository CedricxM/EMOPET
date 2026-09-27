-- ELI-IO-03 / #122
-- Add transport-level replay provenance to deterministic TAG feature persistence.
-- This does not activate BLE/mobile/backend network runtime and does not map
-- device boot time to wall/event time. It only stores replay identity once an
-- upstream authority has already resolved the feature observation timestamp.

ALTER TABLE sensor_feature_observations
  ADD COLUMN transport_version integer,
  ADD COLUMN transport_boot_session_id bigint,
  ADD COLUMN transport_sequence integer;

ALTER TABLE sensor_feature_observations
  ADD CONSTRAINT chk_sensor_feature_observations_transport_provenance
  CHECK (
    (
      transport_version IS NULL
      AND transport_boot_session_id IS NULL
      AND transport_sequence IS NULL
    )
    OR
    (
      transport_version = 1
      AND transport_boot_session_id BETWEEN 0 AND 4294967295
      AND transport_sequence BETWEEN 0 AND 65535
    )
  );

CREATE UNIQUE INDEX uq_sensor_feature_observations_transport_replay
  ON sensor_feature_observations (
    device_id,
    feature_key,
    transport_boot_session_id,
    transport_sequence
  );
