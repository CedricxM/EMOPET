\set ON_ERROR_STOP on

BEGIN;

-- ID-01: shared Owner/dog identities must use UUID in the active fresh baseline.
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
    SELECT data_type
      INTO actual_type
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = tbl
       AND column_name = 'dog_id';

    IF actual_type IS DISTINCT FROM 'uuid' THEN
      RAISE EXCEPTION 'ID-01 expected %.dog_id to be uuid, got %', tbl, actual_type;
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

  SELECT data_type
    INTO actual_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'copresence_events'
     AND column_name = 'dog_a_id';

  IF actual_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'ID-01 expected copresence_events.dog_a_id to be uuid, got %', actual_type;
  END IF;

  SELECT data_type
    INTO actual_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'copresence_events'
     AND column_name = 'dog_b_id';

  IF actual_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'ID-01 expected copresence_events.dog_b_id to be uuid, got %', actual_type;
  END IF;
END $$;

-- ID-01: every ELI dog_id must reference core dogs.id; user_config.user_id must reference users.id.
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

-- ID-01 / PRIV-01: both copresence dog identifiers must reference dogs.id and
-- preserve NO ACTION while erasure/location lifecycle policy remains unresolved.
DO $$
DECLARE
  col text;
  has_fk boolean;
BEGIN
  FOREACH col IN ARRAY ARRAY['dog_a_id', 'dog_b_id'] LOOP
    SELECT EXISTS (
      SELECT 1
        FROM pg_constraint c
        JOIN LATERAL unnest(c.conkey) WITH ORDINALITY child_key(attnum, ord) ON true
        JOIN LATERAL unnest(c.confkey) WITH ORDINALITY parent_key(attnum, ord)
          ON parent_key.ord = child_key.ord
        JOIN pg_attribute child_att
          ON child_att.attrelid = c.conrelid
         AND child_att.attnum = child_key.attnum
        JOIN pg_attribute parent_att
          ON parent_att.attrelid = c.confrelid
         AND parent_att.attnum = parent_key.attnum
       WHERE c.contype = 'f'
         AND c.conrelid = 'public.copresence_events'::regclass
         AND c.confrelid = 'public.dogs'::regclass
         AND child_att.attname = col
         AND parent_att.attname = 'id'
         AND c.confdeltype = 'a'
    ) INTO has_fk;

    IF NOT has_fk THEN
      RAISE EXCEPTION 'ID-01 missing NO ACTION dogs.id FK on copresence_events.%', col;
    END IF;
  END LOOP;
END $$;

-- Seed one valid core identity set.
INSERT INTO users (id, email, password_hash, name)
VALUES (
  '00000000-0000-4000-8000-000000000001'::uuid,
  'id01-test@example.invalid',
  'not-a-real-password-hash',
  'ID-01 Test Owner'
);

INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
VALUES
  (
    '00000000-0000-4000-8000-000000000101'::uuid,
    '00000000-0000-4000-8000-000000000001'::uuid,
    'ID01-Dog-A',
    'Test',
    '2020-01-01',
    'male',
    10.0,
    'FC1'
  ),
  (
    '00000000-0000-4000-8000-000000000102'::uuid,
    '00000000-0000-4000-8000-000000000001'::uuid,
    'ID01-Dog-B',
    'Test',
    '2020-01-02',
    'female',
    11.0,
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

-- Either side of a copresence event must reject a nonexistent dog.
DO $$
BEGIN
  BEGIN
    INSERT INTO copresence_events (dog_a_id, dog_b_id, occurred_at)
    VALUES (
      '00000000-0000-4000-8000-000000009997'::uuid,
      '00000000-0000-4000-8000-000000000102'::uuid,
      NOW()
    );
    RAISE EXCEPTION 'ID-01 expected nonexistent copresence dog_a_id to fail';
  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL;
  END;

  BEGIN
    INSERT INTO copresence_events (dog_a_id, dog_b_id, occurred_at)
    VALUES (
      '00000000-0000-4000-8000-000000000101'::uuid,
      '00000000-0000-4000-8000-000000009996'::uuid,
      NOW()
    );
    RAISE EXCEPTION 'ID-01 expected nonexistent copresence dog_b_id to fail';
  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL;
  END;
END $$;

-- Canonical valid identities must be accepted.
INSERT INTO dog_sub_baselines (dog_id, slot)
VALUES ('00000000-0000-4000-8000-000000000101'::uuid, 'deep_rest_mat');

INSERT INTO user_config (user_id, dog_id, config_key, config_value)
VALUES (
  '00000000-0000-4000-8000-000000000001'::uuid,
  '00000000-0000-4000-8000-000000000101'::uuid,
  'id01-test',
  '{}'::jsonb
);

INSERT INTO copresence_events (
  id,
  dog_a_id,
  dog_b_id,
  occurred_at
)
VALUES (
  '00000000-0000-4000-8000-000000000201'::uuid,
  '00000000-0000-4000-8000-000000000101'::uuid,
  '00000000-0000-4000-8000-000000000102'::uuid,
  NOW()
);

-- NO ACTION must block silent deletion of a dog referenced by copresence.
DO $$
BEGIN
  BEGIN
    DELETE FROM dogs
     WHERE id = '00000000-0000-4000-8000-000000000102'::uuid;
    RAISE EXCEPTION 'ID-01 expected referenced copresence dog delete to fail';
  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL;
  END;
END $$;

ROLLBACK;
