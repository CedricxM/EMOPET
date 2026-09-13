\set ON_ERROR_STOP on

DO $$
DECLARE
  ingestion_type text;
  device_type text;
  firmware_type text;
  has_device_fk boolean;
  has_ingestion_unique boolean;
  has_device_time_index boolean;
BEGIN
  SELECT data_type INTO ingestion_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'sensor_summaries'
     AND column_name = 'ingestion_id';

  SELECT data_type INTO device_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'sensor_summaries'
     AND column_name = 'device_id';

  SELECT data_type INTO firmware_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'sensor_summaries'
     AND column_name = 'firmware_version_at_ingest';

  IF ingestion_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION '0012 upgrade expected ingestion_id uuid, got %', ingestion_type;
  END IF;
  IF device_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION '0012 upgrade expected device_id uuid, got %', device_type;
  END IF;
  IF firmware_type IS DISTINCT FROM 'character varying' THEN
    RAISE EXCEPTION '0012 upgrade expected firmware_version_at_ingest varchar, got %', firmware_type;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM pg_constraint c
     WHERE c.contype = 'f'
       AND c.conrelid = 'public.sensor_summaries'::regclass
       AND c.confrelid = 'public.devices'::regclass
       AND c.conname = 'sensor_summaries_device_id_devices_id_fk'
  ) INTO has_device_fk;

  IF NOT has_device_fk THEN
    RAISE EXCEPTION '0012 upgrade missing sensor_summaries.device_id -> devices.id FK';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM pg_class idx
      JOIN pg_index i ON i.indexrelid = idx.oid
     WHERE idx.relname = 'uq_sensor_summaries_ingestion_id'
       AND i.indrelid = 'public.sensor_summaries'::regclass
       AND i.indisunique
  ) INTO has_ingestion_unique;

  IF NOT has_ingestion_unique THEN
    RAISE EXCEPTION '0012 upgrade missing unique ingestion_id index';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM pg_class idx
      JOIN pg_index i ON i.indexrelid = idx.oid
     WHERE idx.relname = 'idx_sensor_summaries_device_timestamp'
       AND i.indrelid = 'public.sensor_summaries'::regclass
  ) INTO has_device_time_index;

  IF NOT has_device_time_index THEN
    RAISE EXCEPTION '0012 upgrade missing device/timestamp index';
  END IF;
END $$;

-- The pre-existing logical row must survive unchanged. New provenance fields
-- are nullable because historical rows cannot be retroactively attributed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM sensor_summaries
     WHERE id = '70000000-0000-4000-8000-000000000201'::uuid
       AND dog_id = '70000000-0000-4000-8000-000000000101'::uuid
       AND timestamp = '2026-09-01T10:00:00Z'::timestamptz
       AND source = 'TAG'
       AND abs(activity_minutes - 17.25) < 0.001
       AND abs(distance_km - 1.75) < 0.001
       AND abs(temperature_c - 21.5) < 0.001
       AND abs(humidity_pct - 58.0) < 0.001
       AND created_at = '2026-09-01T10:00:03Z'::timestamptz
       AND ingestion_id IS NULL
       AND device_id IS NULL
       AND firmware_version_at_ingest IS NULL
  ) THEN
    RAISE EXCEPTION '0012 upgrade did not preserve the populated legacy sensor summary exactly';
  END IF;
END $$;

-- Prove the new FK really enforces referential integrity after upgrade without
-- mutating the preserved legacy row.
DO $$
BEGIN
  BEGIN
    INSERT INTO sensor_summaries (
      id, dog_id, device_id, timestamp, source
    ) VALUES (
      '70000000-0000-4000-8000-000000000202'::uuid,
      '70000000-0000-4000-8000-000000000101'::uuid,
      '70000000-0000-4000-8000-000000009999'::uuid,
      '2026-09-01T11:00:00Z'::timestamptz,
      'TAG'
    );
    RAISE EXCEPTION '0012 upgrade expected nonexistent device FK insert to fail';
  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL;
  END;
END $$;

-- Prove the new retry key is unique after upgrade.
DO $$
BEGIN
  INSERT INTO sensor_summaries (
    id, dog_id, ingestion_id, timestamp, source
  ) VALUES (
    '70000000-0000-4000-8000-000000000203'::uuid,
    '70000000-0000-4000-8000-000000000101'::uuid,
    '70000000-0000-4000-8000-000000000301'::uuid,
    '2026-09-01T12:00:00Z'::timestamptz,
    'TAG'
  );

  BEGIN
    INSERT INTO sensor_summaries (
      id, dog_id, ingestion_id, timestamp, source
    ) VALUES (
      '70000000-0000-4000-8000-000000000204'::uuid,
      '70000000-0000-4000-8000-000000000101'::uuid,
      '70000000-0000-4000-8000-000000000301'::uuid,
      '2026-09-01T13:00:00Z'::timestamptz,
      'TAG'
    );
    RAISE EXCEPTION '0012 upgrade expected duplicate ingestion_id to fail';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;
END $$;
