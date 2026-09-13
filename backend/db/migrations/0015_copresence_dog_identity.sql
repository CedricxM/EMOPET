\set ON_ERROR_STOP on

-- ID-01 / PRIV-01: copresence dog identifiers become canonical references.
-- This migration deliberately does not choose an erasure policy. PostgreSQL's
-- NO ACTION behavior keeps dog deletion blocked while location/copresence
-- retention, anonymisation or deletion remains under PRIV-01 authority.

BEGIN;

DO $$
DECLARE
  orphan_a_count bigint;
  orphan_b_count bigint;
BEGIN
  IF to_regclass('public.copresence_events') IS NULL THEN
    RAISE EXCEPTION '0015 requires public.copresence_events';
  END IF;

  IF to_regclass('public.dogs') IS NULL THEN
    RAISE EXCEPTION '0015 requires public.dogs';
  END IF;

  SELECT count(*)
    INTO orphan_a_count
    FROM copresence_events c
    LEFT JOIN dogs d ON d.id = c.dog_a_id
   WHERE d.id IS NULL;

  SELECT count(*)
    INTO orphan_b_count
    FROM copresence_events c
    LEFT JOIN dogs d ON d.id = c.dog_b_id
   WHERE d.id IS NULL;

  IF orphan_a_count <> 0 OR orphan_b_count <> 0 THEN
    RAISE EXCEPTION
      '0015 refuses orphan copresence identities: dog_a_id=%, dog_b_id=%',
      orphan_a_count,
      orphan_b_count;
  END IF;
END $$;

ALTER TABLE copresence_events
  ADD CONSTRAINT copresence_events_dog_a_id_dogs_id_fk
  FOREIGN KEY (dog_a_id) REFERENCES dogs(id)
  ON UPDATE NO ACTION
  ON DELETE NO ACTION;

ALTER TABLE copresence_events
  ADD CONSTRAINT copresence_events_dog_b_id_dogs_id_fk
  FOREIGN KEY (dog_b_id) REFERENCES dogs(id)
  ON UPDATE NO ACTION
  ON DELETE NO ACTION;

COMMIT;
