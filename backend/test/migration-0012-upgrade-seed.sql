\set ON_ERROR_STOP on

-- Rehearsal fixture for the specific 0011 -> 0012 transition.
-- This file MUST run before 0012_sensor_summary_device_provenance.sql.
DO $$
DECLARE
  provenance_columns integer;
BEGIN
  IF to_regclass('public.sensor_summaries') IS NULL THEN
    RAISE EXCEPTION '0012 rehearsal requires the pre-existing sensor_summaries table';
  END IF;

  SELECT count(*)::int
    INTO provenance_columns
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'sensor_summaries'
     AND column_name IN ('ingestion_id', 'device_id', 'firmware_version_at_ingest');

  IF provenance_columns <> 0 THEN
    RAISE EXCEPTION '0012 rehearsal did not start from N-1: % provenance columns already exist', provenance_columns;
  END IF;
END $$;

INSERT INTO users (id, email, password_hash, name)
VALUES (
  '70000000-0000-4000-8000-000000000001'::uuid,
  'upgrade-0012@emopet.invalid',
  'test-only-upgrade-fixture',
  'Upgrade Fixture Owner'
);

INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
VALUES (
  '70000000-0000-4000-8000-000000000101'::uuid,
  '70000000-0000-4000-8000-000000000001'::uuid,
  'Upgrade Fixture Dog',
  'Test',
  '2020-01-01',
  'female',
  19.5,
  'FC2'
);

INSERT INTO sensor_summaries (
  id,
  dog_id,
  timestamp,
  source,
  activity_minutes,
  distance_km,
  temperature_c,
  humidity_pct,
  created_at
)
VALUES (
  '70000000-0000-4000-8000-000000000201'::uuid,
  '70000000-0000-4000-8000-000000000101'::uuid,
  '2026-09-01T10:00:00Z'::timestamptz,
  'TAG',
  17.25,
  1.75,
  21.5,
  58.0,
  '2026-09-01T10:00:03Z'::timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM sensor_summaries
     WHERE id = '70000000-0000-4000-8000-000000000201'::uuid
       AND dog_id = '70000000-0000-4000-8000-000000000101'::uuid
       AND source = 'TAG'
       AND abs(activity_minutes - 17.25) < 0.001
       AND abs(distance_km - 1.75) < 0.001
  ) THEN
    RAISE EXCEPTION '0012 pre-upgrade fixture was not persisted as expected';
  END IF;
END $$;
