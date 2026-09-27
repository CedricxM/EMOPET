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
  ADD CONSTRAINT chk_sensor_feature_observations_observed_quality
  CHECK (
    observation_status <> 'OBSERVED'
    OR quality_state IS NULL
    OR quality_state <> 'SUPPRESSED'
  );
