\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  trigger_count integer;
BEGIN
  SELECT count(*)::integer
    INTO trigger_count
    FROM pg_trigger trg
    JOIN pg_class rel ON rel.oid = trg.tgrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
   WHERE ns.nspname = 'public'
     AND rel.relname IN ('dataset_registry', 'breed_canonical')
     AND NOT trg.tgisinternal;

  IF trigger_count <> 0 THEN
    RAISE EXCEPTION 'INT-03B fresh baseline must not depend on dataset updated_at triggers; found %', trigger_count;
  END IF;
END $$;

DO $$
DECLARE
  before_ts timestamptz;
  after_ts timestamptz;
  after_label text;
BEGIN
  INSERT INTO breed_canonical (
    vbo_id,
    label,
    display_name,
    breed_slug,
    synonyms,
    fci_number,
    provenance,
    updated_at
  ) VALUES (
    'VBO:INT03B_TEST',
    'Writer authority before',
    'Writer authority before',
    'int03b-writer-authority',
    '[]'::jsonb,
    NULL,
    '{"source":"int03b-test"}'::jsonb,
    now() - interval '1 day'
  );

  SELECT updated_at
    INTO before_ts
    FROM breed_canonical
   WHERE vbo_id = 'VBO:INT03B_TEST';

  PERFORM pg_sleep(0.02);

  INSERT INTO breed_canonical (
    vbo_id,
    label,
    display_name,
    breed_slug,
    synonyms,
    fci_number,
    provenance
  ) VALUES (
    'VBO:INT03B_TEST',
    'Writer authority after',
    'Writer authority after',
    'int03b-writer-authority',
    '["controlled"]'::jsonb,
    NULL,
    '{"source":"int03b-test","revision":2}'::jsonb
  )
  ON CONFLICT (vbo_id) DO UPDATE SET
    label = EXCLUDED.label,
    display_name = EXCLUDED.display_name,
    synonyms = EXCLUDED.synonyms,
    fci_number = EXCLUDED.fci_number,
    provenance = EXCLUDED.provenance,
    updated_at = NOW();

  SELECT updated_at, label
    INTO after_ts, after_label
    FROM breed_canonical
   WHERE vbo_id = 'VBO:INT03B_TEST';

  IF after_label <> 'Writer authority after' THEN
    RAISE EXCEPTION 'INT-03B upsert did not update intended mutable fields';
  END IF;

  IF after_ts <= before_ts THEN
    RAISE EXCEPTION 'INT-03B writer-owned updated_at did not advance: before %, after %', before_ts, after_ts;
  END IF;
END $$;

ROLLBACK;
