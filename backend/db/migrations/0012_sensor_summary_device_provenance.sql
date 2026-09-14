-- DATA/ELI provenance candidate: persist the canonical device binding when a
-- summary is ingested with a device_id. This does not authenticate the device;
-- the API separately verifies dog/type consistency before insert.
ALTER TABLE sensor_summaries
  ADD COLUMN IF NOT EXISTS ingestion_id uuid,
  ADD COLUMN IF NOT EXISTS device_id uuid,
  ADD COLUMN IF NOT EXISTS firmware_version_at_ingest varchar(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'sensor_summaries_device_id_devices_id_fk'
       AND conrelid = 'sensor_summaries'::regclass
  ) THEN
    ALTER TABLE sensor_summaries
      ADD CONSTRAINT sensor_summaries_device_id_devices_id_fk
      FOREIGN KEY (device_id) REFERENCES devices(id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sensor_summaries_ingestion_id
  ON sensor_summaries (ingestion_id);

CREATE INDEX IF NOT EXISTS idx_sensor_summaries_device_timestamp
  ON sensor_summaries (device_id, timestamp);
