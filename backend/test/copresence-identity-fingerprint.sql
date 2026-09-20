\set ON_ERROR_STOP on

-- INT-06F / ID-01 / PRIV-01 semantic fingerprint for copresence dog identity.
-- Constraint names are intentionally ignored; identity target and delete action
-- are part of the contract.

SELECT 'COPRESENCE_COLUMN|'
       || c.column_name || '|'
       || c.data_type || '|'
       || c.udt_name || '|'
       || c.is_nullable
  FROM information_schema.columns c
 WHERE c.table_schema = 'public'
   AND c.table_name = 'copresence_events'
   AND c.column_name IN ('dog_a_id', 'dog_b_id')
 ORDER BY c.column_name;

SELECT 'COPRESENCE_FK|'
       || child_att.attname || '|'
       || parent.relname || '|'
       || parent_att.attname || '|'
       || con.confdeltype::text
  FROM pg_constraint con
  JOIN pg_class child ON child.oid = con.conrelid
  JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
  JOIN pg_class parent ON parent.oid = con.confrelid
  JOIN LATERAL unnest(con.conkey) WITH ORDINALITY child_key(attnum, ord) ON true
  JOIN LATERAL unnest(con.confkey) WITH ORDINALITY parent_key(attnum, ord)
    ON parent_key.ord = child_key.ord
  JOIN pg_attribute child_att
    ON child_att.attrelid = child.oid
   AND child_att.attnum = child_key.attnum
  JOIN pg_attribute parent_att
    ON parent_att.attrelid = parent.oid
   AND parent_att.attnum = parent_key.attnum
 WHERE con.contype = 'f'
   AND child_ns.nspname = 'public'
   AND child.relname = 'copresence_events'
   AND child_att.attname IN ('dog_a_id', 'dog_b_id')
 ORDER BY child_att.attname;

DO $$
DECLARE
  dog_a uuid := gen_random_uuid();
  dog_b uuid := gen_random_uuid();
  outsider uuid := gen_random_uuid();
  user_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO users (id, email, password_hash, name)
  VALUES (user_id, 'copresence-int06f-' || user_id || '@example.test', 'test-only', 'INT06F');

  INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
  VALUES
    (dog_a, user_id, 'A', 'Test', '2020-01-01', 'female', 20, 'FC2'),
    (dog_b, user_id, 'B', 'Test', '2020-01-01', 'male', 21, 'FC2');

  INSERT INTO copresence_events (dog_a_id, dog_b_id, occurred_at)
  VALUES (dog_a, dog_b, now());

  BEGIN
    INSERT INTO copresence_events (dog_a_id, dog_b_id, occurred_at)
    VALUES (dog_a, outsider, now());
    RAISE EXCEPTION 'expected orphan copresence dog identity to fail';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  BEGIN
    DELETE FROM dogs WHERE id = dog_a;
    RAISE EXCEPTION 'expected NO ACTION copresence reference to block dog deletion';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  IF NOT EXISTS (SELECT 1 FROM dogs WHERE id = dog_a) THEN
    RAISE EXCEPTION 'referenced dog must remain after blocked delete';
  END IF;

  DELETE FROM copresence_events WHERE dog_a_id IN (dog_a,dog_b) OR dog_b_id IN (dog_a,dog_b);
  DELETE FROM dogs WHERE id IN (dog_a,dog_b);
  DELETE FROM users WHERE id = user_id;
END $$;
