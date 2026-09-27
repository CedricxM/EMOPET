-- ELI-IO-06 / #122
-- Preserve physical feature-quality state from the versioned transport contract.
-- Existing rows remain nullable for backwards compatibility; new transport-derived
-- writes require quality at the shared validation boundary.

ALTER TABLE sensor_feature_observations
  ADD COLUMN quality_state varchar(16);

ALTER TABLE sensor_feature_observations
  ADD CONSTRAINT chk_sensor_feature_observations_quality
  CHECK (
    quality_state IS NULL
    OR quality_state IN ('VALID', 'DEGRADED', 'SUPPRESSED')
  );

ALTER TABLE sensor_feature_observations
  DROP CONSTRAINT chk_sensor_feature_observations_shape;

ALTER TABLE sensor_feature_observations
  ADD CONSTRAINT chk_sensor_feature_observations_shape
  CHECK (
    (
      observation_status = 'OBSERVED'
      AND value IS NOT NULL
      AND value >= 0
      AND null_reason IS NULL
      AND valid_seconds >= 900
      AND (quality_state IS NULL OR quality_state <> 'SUPPRESSED')
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
  );
