-- ELI-IO-06 / #122
-- Preserve feature-quality provenance carried by the versioned transport frame.
-- Existing pre-transport rows remain nullable; new adapters must supply quality.

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
