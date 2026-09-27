-- ELI-IO-01 / #122
-- Backend persistence authority for the deterministic TAG activity_variability feature.
-- This migration does NOT authorize BLE transport, ELI latent interpretation, API publication,
-- or Owner-facing claims. It only creates a versioned, provenance-bound persistence surface.

CREATE TABLE sensor_feature_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid NOT NULL REFERENCES dogs(id),
  ingestion_id uuid NOT NULL,
  device_id uuid NOT NULL REFERENCES devices(id),
  observed_at timestamptz NOT NULL,
  source varchar(5) NOT NULL,
  feature_key varchar(64) NOT NULL,
  value real,
  observation_status varchar(24) NOT NULL,
  null_reason varchar(48),
  feature_contract_version varchar(80) NOT NULL,
  window_seconds integer NOT NULL,
  valid_seconds integer NOT NULL,
  firmware_version_at_ingest varchar(20),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_sensor_feature_observations_source
    CHECK (source = 'TAG'),
  CONSTRAINT chk_sensor_feature_observations_feature
    CHECK (feature_key = 'activity_variability'),
  CONSTRAINT chk_sensor_feature_observations_contract
    CHECK (feature_contract_version = 'tag-activity-variability-cv30m-v1'),
  CONSTRAINT chk_sensor_feature_observations_window
    CHECK (window_seconds = 1800),
  CONSTRAINT chk_sensor_feature_observations_valid_seconds
    CHECK (valid_seconds >= 0 AND valid_seconds <= 1800),
  CONSTRAINT chk_sensor_feature_observations_status
    CHECK (observation_status IN ('OBSERVED', 'NOT_OBSERVED')),
  CONSTRAINT chk_sensor_feature_observations_shape
    CHECK (
      (
        observation_status = 'OBSERVED'
        AND value IS NOT NULL
        AND value >= 0
        AND null_reason IS NULL
        AND valid_seconds >= 900
      )
      OR
      (
        observation_status = 'NOT_OBSERVED'
        AND value IS NULL
        AND (
          (null_reason = 'INSUFFICIENT_COVERAGE' AND valid_seconds < 900)
          OR
          (null_reason = 'MEAN_BELOW_DIVISION_GUARD' AND valid_seconds >= 900)
        )
      )
    )
);

CREATE UNIQUE INDEX uq_sensor_feature_observations_ingestion_id
  ON sensor_feature_observations (ingestion_id);

CREATE INDEX idx_sensor_feature_observations_dog_feature_time
  ON sensor_feature_observations (dog_id, feature_key, observed_at);

CREATE INDEX idx_sensor_feature_observations_device_time
  ON sensor_feature_observations (device_id, observed_at);
