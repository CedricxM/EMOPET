\set ON_ERROR_STOP on

BEGIN;

-- ID-01: shared Guardian/dog identities must use UUID in the active fresh baseline.
DO $$
DECLARE
  tbl text;
  col text;
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
    col := 'dog_id';
    SELECT data_type
      INTO actual_type
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = tbl
       AND column_name = col;

    IF actual_type IS DISTINCT FROM 'uuid' THEN
      RAISE EXCEPTION 'ID-01 expected %.% to be uuid, got %', tbl, col, actual_type;
    END IF;
  END LOOP;

  SELECT data_type
    INTO actual_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'user_config'
     AND column_name = 'user_id';

  IF actual_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'ID-01 expected user_config.user_id to be uuid, got %', actual_type;
  END IF;
END $$;

-- ID-01: every ELI dog_id must be an FK to core dogs.id; user_config.user_id must target users.id.
DO $$
DECLARE
  tbl text;
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
      RAISE EXCEPTION 'ID-01 missing dog FK on %.dog_id', tbl;
    END IF;
  END LOOP;

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
    RAISE EXCEPTION 'ID-01 missing user FK on user_config.user_id';
  END IF;
END $$;

-- Seed one valid core identity pair.
INSERT INTO users (id, email, password_hash, name)
VALUES (
  '00000000-0000-4000-8000-000000000001'::uuid,
  'id01-test@example.invalid',
  'not-a-real-password-hash',
  'ID-01 Test Guardian'
);

INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
VALUES (
  '00000000-0000-4000-8000-000000000101'::uuid,
  '00000000-0000-4000-8000-000000000001'::uuid,
  'ID01-Dog',
  'Test',
  '2020-01-01',
  'male',
  10.0,
  'FC1'
);

-- A nonexistent dog must be rejected by the ELI FK.
DO $$
BEGIN
  BEGIN
    INSERT INTO dog_sub_baselines (dog_id, slot)
    VALUES ('00000000-0000-4000-8000-000000009999'::uuid, 'deep_rest_mat');
    RAISE EXCEPTION 'ID-01 expected nonexistent dog insert to fail';
  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL;
  END;
END $$;

-- A nonexistent user must be rejected even when the dog exists.
DO $$
BEGIN
  BEGIN
    INSERT INTO user_config (user_id, dog_id, config_key, config_value)
    VALUES (
      '00000000-0000-4000-8000-000000009998'::uuid,
      '00000000-0000-4000-8000-000000000101'::uuid,
      'id01-test',
      '{}'::jsonb
    );
    RAISE EXCEPTION 'ID-01 expected nonexistent user insert to fail';
  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL;
  END;
END $$;

-- The canonical valid pair must be accepted.
INSERT INTO dog_sub_baselines (dog_id, slot)
VALUES ('00000000-0000-4000-8000-000000000101'::uuid, 'deep_rest_mat');

INSERT INTO user_config (user_id, dog_id, config_key, config_value)
VALUES (
  '00000000-0000-4000-8000-000000000001'::uuid,
  '00000000-0000-4000-8000-000000000101'::uuid,
  'id01-test',
  '{}'::jsonb
);

ROLLBACK;
