\set ON_ERROR_STOP on

-- Must run after historical migrations through 0012 and before 0013.
DO $$
DECLARE
  tbl text;
  actual_type text;
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

    IF actual_type IS DISTINCT FROM 'text' THEN
      RAISE EXCEPTION '0013 rehearsal expected %.dog_id TEXT before migration, got %', tbl, actual_type;
    END IF;
  END LOOP;

  SELECT data_type INTO actual_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'user_config'
     AND column_name = 'user_id';

  IF actual_type IS DISTINCT FROM 'text' THEN
    RAISE EXCEPTION '0013 rehearsal expected user_config.user_id TEXT before migration, got %', actual_type;
  END IF;
END $$;

INSERT INTO users (id, email, password_hash, name)
VALUES (
  '71000000-0000-4000-8000-000000000001'::uuid,
  'upgrade-0013@emopet.invalid',
  'test-only-upgrade-fixture',
  'ID-01 Upgrade Owner'
);

INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
VALUES (
  '71000000-0000-4000-8000-000000000101'::uuid,
  '71000000-0000-4000-8000-000000000001'::uuid,
  'ID-01 Upgrade Dog',
  'Test',
  '2020-01-01',
  'male',
  18.0,
  'FC2'
);

INSERT INTO dog_sub_baselines (dog_id, slot, sample_count)
VALUES ('71000000-0000-4000-8000-000000000101', 'deep_rest_mat', 7);

INSERT INTO recovery_events (
  dog_id, slot, started_at, returned_to_baseline_at, recovery_minutes
) VALUES (
  '71000000-0000-4000-8000-000000000101',
  'owner_absent',
  '2026-09-01T10:00:00Z',
  '2026-09-01T10:12:00Z',
  12.0
);

INSERT INTO anticipation_events (
  dog_id, event_type, predicted_event_time, pre_event_window_start
) VALUES (
  '71000000-0000-4000-8000-000000000101',
  'walk_time',
  '2026-09-01T18:00:00Z',
  '2026-09-01T17:30:00Z'
);

INSERT INTO baseline_drift_monitor (dog_id, drift_significant)
VALUES ('71000000-0000-4000-8000-000000000101', false);

INSERT INTO walk_quality (dog_id, walk_date, distance_km)
VALUES ('71000000-0000-4000-8000-000000000101', '2026-09-01', 2.4);

INSERT INTO routine_stability (dog_id, date, rsi)
VALUES ('71000000-0000-4000-8000-000000000101', '2026-09-01', 0.83);

INSERT INTO user_config (user_id, dog_id, config_key, config_value, source)
VALUES (
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000101',
  'upgrade-test',
  '{"enabled":true}'::jsonb,
  'user'
);
