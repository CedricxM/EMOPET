-- ID-01 existing-database reconciliation.
--
-- Historical migrations 0003/0004 created shared ELI user/dog identities as
-- free-form TEXT. The active Drizzle authority now uses the canonical core UUID
-- identities. This migration deliberately fails before mutation when legacy
-- values are not valid canonical references; it does not invent mappings.

BEGIN;

DO $$
DECLARE
  tbl text;
  invalid_count bigint;
  orphan_count bigint;
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
    EXECUTE format(
      'SELECT count(*) FROM %I WHERE dog_id IS NOT NULL AND dog_id !~* %L',
      tbl,
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ) INTO invalid_count;

    IF invalid_count <> 0 THEN
      RAISE EXCEPTION 'ID-01 cannot migrate %.dog_id: % non-UUID legacy value(s)', tbl, invalid_count;
    END IF;

    EXECUTE format(
      'SELECT count(*) FROM %I t LEFT JOIN dogs d ON d.id = t.dog_id::uuid WHERE t.dog_id IS NOT NULL AND d.id IS NULL',
      tbl
    ) INTO orphan_count;

    IF orphan_count <> 0 THEN
      RAISE EXCEPTION 'ID-01 cannot migrate %.dog_id: % orphan legacy value(s)', tbl, orphan_count;
    END IF;
  END LOOP;

  SELECT count(*)
    INTO invalid_count
    FROM user_config
   WHERE user_id IS NOT NULL
     AND user_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  IF invalid_count <> 0 THEN
    RAISE EXCEPTION 'ID-01 cannot migrate user_config.user_id: % non-UUID legacy value(s)', invalid_count;
  END IF;

  SELECT count(*)
    INTO orphan_count
    FROM user_config uc
    LEFT JOIN users u ON u.id = uc.user_id::uuid
   WHERE uc.user_id IS NOT NULL
     AND u.id IS NULL;

  IF orphan_count <> 0 THEN
    RAISE EXCEPTION 'ID-01 cannot migrate user_config.user_id: % orphan legacy value(s)', orphan_count;
  END IF;
END $$;

ALTER TABLE dog_sub_baselines
  ALTER COLUMN dog_id TYPE uuid USING dog_id::uuid;
ALTER TABLE recovery_events
  ALTER COLUMN dog_id TYPE uuid USING dog_id::uuid;
ALTER TABLE anticipation_events
  ALTER COLUMN dog_id TYPE uuid USING dog_id::uuid;
ALTER TABLE baseline_drift_monitor
  ALTER COLUMN dog_id TYPE uuid USING dog_id::uuid;
ALTER TABLE walk_quality
  ALTER COLUMN dog_id TYPE uuid USING dog_id::uuid;
ALTER TABLE routine_stability
  ALTER COLUMN dog_id TYPE uuid USING dog_id::uuid;
ALTER TABLE user_config
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid,
  ALTER COLUMN dog_id TYPE uuid USING dog_id::uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'dog_sub_baselines_dog_id_dogs_id_fk'
       AND conrelid = 'dog_sub_baselines'::regclass
  ) THEN
    ALTER TABLE dog_sub_baselines
      ADD CONSTRAINT dog_sub_baselines_dog_id_dogs_id_fk
      FOREIGN KEY (dog_id) REFERENCES dogs(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'recovery_events_dog_id_dogs_id_fk'
       AND conrelid = 'recovery_events'::regclass
  ) THEN
    ALTER TABLE recovery_events
      ADD CONSTRAINT recovery_events_dog_id_dogs_id_fk
      FOREIGN KEY (dog_id) REFERENCES dogs(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'anticipation_events_dog_id_dogs_id_fk'
       AND conrelid = 'anticipation_events'::regclass
  ) THEN
    ALTER TABLE anticipation_events
      ADD CONSTRAINT anticipation_events_dog_id_dogs_id_fk
      FOREIGN KEY (dog_id) REFERENCES dogs(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'baseline_drift_monitor_dog_id_dogs_id_fk'
       AND conrelid = 'baseline_drift_monitor'::regclass
  ) THEN
    ALTER TABLE baseline_drift_monitor
      ADD CONSTRAINT baseline_drift_monitor_dog_id_dogs_id_fk
      FOREIGN KEY (dog_id) REFERENCES dogs(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'walk_quality_dog_id_dogs_id_fk'
       AND conrelid = 'walk_quality'::regclass
  ) THEN
    ALTER TABLE walk_quality
      ADD CONSTRAINT walk_quality_dog_id_dogs_id_fk
      FOREIGN KEY (dog_id) REFERENCES dogs(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'routine_stability_dog_id_dogs_id_fk'
       AND conrelid = 'routine_stability'::regclass
  ) THEN
    ALTER TABLE routine_stability
      ADD CONSTRAINT routine_stability_dog_id_dogs_id_fk
      FOREIGN KEY (dog_id) REFERENCES dogs(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'user_config_user_id_users_id_fk'
       AND conrelid = 'user_config'::regclass
  ) THEN
    ALTER TABLE user_config
      ADD CONSTRAINT user_config_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'user_config_dog_id_dogs_id_fk'
       AND conrelid = 'user_config'::regclass
  ) THEN
    ALTER TABLE user_config
      ADD CONSTRAINT user_config_dog_id_dogs_id_fk
      FOREIGN KEY (dog_id) REFERENCES dogs(id);
  END IF;
END $$;

COMMIT;
