\set ON_ERROR_STOP on

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
     WHERE table_schema = 'public'
       AND table_name = tbl
       AND column_name = 'dog_id';

    IF actual_type IS DISTINCT FROM 'uuid' THEN
      RAISE EXCEPTION '0013 upgrade expected %.dog_id UUID after migration, got %', tbl, actual_type;
    END IF;

    SELECT EXISTS (
      SELECT 1
        FROM pg_constraint c
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid
         AND a.attnum = ANY(c.conkey)
       WHERE c.contype = 'f'
         AND c.conrelid = to_regclass('public.' || tbl)
         AND c.confrelid = 'public.dogs'::regclass
         AND a.attname = 'dog_id'
    ) INTO has_fk;

    IF NOT has_fk THEN
      RAISE EXCEPTION '0013 upgrade missing canonical dogs FK on %.dog_id', tbl;
    END IF;
  END LOOP;

  SELECT data_type INTO actual_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'user_config'
     AND column_name = 'user_id';

  IF actual_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION '0013 upgrade expected user_config.user_id UUID after migration, got %', actual_type;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM pg_constraint c
      JOIN pg_attribute a
        ON a.attrelid = c.conrelid
       AND a.attnum = ANY(c.conkey)
     WHERE c.contype = 'f'
       AND c.conrelid = 'public.user_config'::regclass
       AND c.confrelid = 'public.users'::regclass
       AND a.attname = 'user_id'
  ) INTO has_fk;

  IF NOT has_fk THEN
    RAISE EXCEPTION '0013 upgrade missing canonical users FK on user_config.user_id';
  END IF;
END $$;

-- Every seeded legacy row must survive with the same logical values.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM dog_sub_baselines
     WHERE dog_id = '71000000-0000-4000-8000-000000000101'::uuid
       AND slot = 'deep_rest_mat'
       AND sample_count = 7
  ) THEN
    RAISE EXCEPTION '0013 upgrade lost dog_sub_baselines legacy row';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM recovery_events
     WHERE dog_id = '71000000-0000-4000-8000-000000000101'::uuid
       AND slot = 'owner_absent'
       AND abs(recovery_minutes - 12.0) < 0.001
  ) THEN
    RAISE EXCEPTION '0013 upgrade lost recovery_events legacy row';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM anticipation_events
     WHERE dog_id = '71000000-0000-4000-8000-000000000101'::uuid
       AND event_type = 'walk_time'
  ) THEN
    RAISE EXCEPTION '0013 upgrade lost anticipation_events legacy row';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM baseline_drift_monitor
     WHERE dog_id = '71000000-0000-4000-8000-000000000101'::uuid
       AND drift_significant = false
  ) THEN
    RAISE EXCEPTION '0013 upgrade lost baseline_drift_monitor legacy row';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM walk_quality
     WHERE dog_id = '71000000-0000-4000-8000-000000000101'::uuid
       AND walk_date = '2026-09-01'
       AND abs(distance_km - 2.4) < 0.001
  ) THEN
    RAISE EXCEPTION '0013 upgrade lost walk_quality legacy row';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM routine_stability
     WHERE dog_id = '71000000-0000-4000-8000-000000000101'::uuid
       AND date = '2026-09-01'
       AND abs(rsi - 0.83) < 0.001
  ) THEN
    RAISE EXCEPTION '0013 upgrade lost routine_stability legacy row';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_config
     WHERE user_id = '71000000-0000-4000-8000-000000000001'::uuid
       AND dog_id = '71000000-0000-4000-8000-000000000101'::uuid
       AND config_key = 'upgrade-test'
       AND config_value = '{"enabled":true}'::jsonb
  ) THEN
    RAISE EXCEPTION '0013 upgrade lost user_config legacy row';
  END IF;
END $$;

-- Post-upgrade orphan writes must now fail at the database boundary.
DO $$
BEGIN
  BEGIN
    INSERT INTO dog_sub_baselines (dog_id, slot)
    VALUES ('71000000-0000-4000-8000-000000009999'::uuid, 'light_rest_mat');
    RAISE EXCEPTION '0013 expected orphan dog insert to fail';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO user_config (user_id, dog_id, config_key, config_value)
    VALUES (
      '71000000-0000-4000-8000-000000009998'::uuid,
      '71000000-0000-4000-8000-000000000101'::uuid,
      'orphan-user',
      '{}'::jsonb
    );
    RAISE EXCEPTION '0013 expected orphan user insert to fail';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;
END $$;
