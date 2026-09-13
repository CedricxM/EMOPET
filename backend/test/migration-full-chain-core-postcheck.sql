\set ON_ERROR_STOP on

-- The same core rows inserted before migration 0001 must survive through the
-- entire current historical chain without semantic drift.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
     WHERE id='72000000-0000-4000-8000-000000000001'::uuid
       AND email='full-chain@emopet.invalid'
       AND name='Full Chain Owner'
       AND locale='fr'
       AND onboarding_complete=true
       AND created_at='2026-08-01T08:00:00Z'::timestamptz
       AND updated_at='2026-08-02T08:00:00Z'::timestamptz
  ) THEN
    RAISE EXCEPTION 'full-chain upgrade changed or lost seeded user row';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM dogs
     WHERE id='72000000-0000-4000-8000-000000000101'::uuid
       AND owner_id='72000000-0000-4000-8000-000000000001'::uuid
       AND name='Full Chain Dog'
       AND breed='Test Breed'
       AND birth_date='2021-02-03'
       AND sex='female'
       AND abs(weight - 21.25) < 0.001
       AND fur_class='FC2'
  ) THEN
    RAISE EXCEPTION 'full-chain upgrade changed or lost seeded dog row';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM devices
     WHERE id='72000000-0000-4000-8000-000000000201'::uuid
       AND dog_id='72000000-0000-4000-8000-000000000101'::uuid
       AND type='TAG'
       AND mac_address='02:00:00:72:00:01'
       AND firmware_version='0.9.0'
       AND last_seen_at='2026-08-03T10:00:00Z'::timestamptz
       AND firmware_major IS NULL
       AND firmware_minor IS NULL
       AND firmware_patch IS NULL
       AND supports_v6_features=false
  ) THEN
    RAISE EXCEPTION 'full-chain upgrade changed or lost seeded device row';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM sensor_summaries
     WHERE id='72000000-0000-4000-8000-000000000301'::uuid
       AND dog_id='72000000-0000-4000-8000-000000000101'::uuid
       AND timestamp='2026-08-03T09:00:00Z'::timestamptz
       AND source='TAG'
       AND abs(activity_minutes - 22.5) < 0.001
       AND abs(distance_km - 2.125) < 0.001
       AND vocal_events=3
       AND abs(temperature_c - 20.75) < 0.001
       AND abs(humidity_pct - 61.0) < 0.001
       AND created_at='2026-08-03T09:00:04Z'::timestamptz
       AND ingestion_id IS NULL
       AND device_id IS NULL
       AND firmware_version_at_ingest IS NULL
  ) THEN
    RAISE EXCEPTION 'full-chain upgrade changed or lost seeded sensor summary row';
  END IF;
END $$;

-- Prove the final historical chain now carries the same canonical shared ELI
-- identity shape expected by the active schema authority.
DO $$
DECLARE
  tbl text;
  actual_type text;
  has_fk boolean;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'dog_sub_baselines',
    'recovery_events',
    'anticipation_events',
    'baseline_drift_monitor',
    'walk_quality',
    'routine_stability',
    'user_config'
  ] LOOP
    SELECT data_type INTO actual_type
      FROM information_schema.columns
     WHERE table_schema='public' AND table_name=tbl AND column_name='dog_id';

    IF actual_type IS DISTINCT FROM 'uuid' THEN
      RAISE EXCEPTION 'full-chain final %.dog_id expected UUID, got %', tbl, actual_type;
    END IF;

    SELECT EXISTS (
      SELECT 1
        FROM pg_constraint c
        JOIN pg_attribute a
          ON a.attrelid=c.conrelid
         AND a.attnum=ANY(c.conkey)
       WHERE c.contype='f'
         AND c.conrelid=to_regclass('public.' || tbl)
         AND c.confrelid='public.dogs'::regclass
         AND a.attname='dog_id'
    ) INTO has_fk;

    IF NOT has_fk THEN
      RAISE EXCEPTION 'full-chain final %.dog_id missing dogs FK', tbl;
    END IF;
  END LOOP;

  SELECT data_type INTO actual_type
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='user_config' AND column_name='user_id';

  IF actual_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'full-chain final user_config.user_id expected UUID, got %', actual_type;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM pg_constraint c
      JOIN pg_attribute a
        ON a.attrelid=c.conrelid
       AND a.attnum=ANY(c.conkey)
     WHERE c.contype='f'
       AND c.conrelid='public.user_config'::regclass
       AND c.confrelid='public.users'::regclass
       AND a.attname='user_id'
  ) INTO has_fk;

  IF NOT has_fk THEN
    RAISE EXCEPTION 'full-chain final user_config.user_id missing users FK';
  END IF;
END $$;

-- Representative tables from the historical chain must exist, proving this
-- was not merely a direct baseline-to-current shortcut.
DO $$
BEGIN
  IF to_regclass('public.dataset_registry') IS NULL
     OR to_regclass('public.community_reports') IS NULL
     OR to_regclass('public.contact_requests') IS NULL
     OR to_regclass('public.professional_share_grants') IS NULL THEN
    RAISE EXCEPTION 'full-chain rehearsal did not reach the expected current historical schema';
  END IF;
END $$;
