-- Migration 0015: restore the identity foreign keys this path can hold (2026-09-28)
--
-- The repository builds its database two ways: this hand-written sequence, and
-- drizzle-kit generating a fresh baseline from the compiled schema. CI validates the
-- generated one. Measured after 0014, the two agree on every foreign key except ten,
-- all present in the generated schema and absent here.
--
-- The consequence is larger than the count suggests, because config/privacy declares an
-- erasure topology that does not hold on this path:
--
--   * account-erasure-topology declares 15 direct user references; 14 exist here.
--   * dog-erasure-topology declares 18 canonical dog foreign keys; NINE exist here.
--   * dog-subject-lineage declares that no dog identifier is left unconstrained; nine
--     are, on this path: anticipation_events, baseline_drift_monitor, copresence_events
--     (two columns), dog_sub_baselines, recovery_events, routine_stability, user_config
--     and walk_quality.
--
-- So on this path, deleting a dog does not meet the "canonical foreign key, NO ACTION"
-- wall the registry describes. It leaves orphan rows in nine ELI and sensor tables,
-- silently. The divergence stayed invisible because the topology parity test runs only
-- against the generated schema, and because its account-side assertion fails first,
-- masking the dog-side result behind it.
--
-- Only two of the ten are a missing constraint. The other eight are a missing
-- constraint because of something underneath it: the column type itself diverges.
-- Migrations 0003 and 0004 create these columns as `dog_id TEXT NOT NULL` /
-- `user_id TEXT NOT NULL`, while the Drizzle schema the application compiles against
-- declares `uuid('dog_id').notNull().references(() => dogs.id)`. A foreign key from
-- text to uuid cannot exist, so the constraint is a symptom and not the defect:
--
--   text here, uuid in the schema:
--     anticipation_events.dog_id, baseline_drift_monitor.dog_id,
--     dog_sub_baselines.dog_id, recovery_events.dog_id, routine_stability.dog_id,
--     user_config.dog_id, user_config.user_id, walk_quality.dog_id
--   uuid on both paths:
--     copresence_events.dog_a_id, copresence_events.dog_b_id
--
-- This migration adds what it can hold and refuses to paper over the rest. For each of
-- the ten relations it compares the child column type to the parent key type. Equal
-- types get the constraint, with the name and the actions the generated schema already
-- uses, so the two paths converge rather than merely both being defensible. Divergent
-- types are reported by name and skipped, because `ALTER COLUMN ... TYPE uuid USING
-- col::uuid` is a data decision (every stored value must already be a valid UUID) on
-- columns the sensor modality contract governs. That decision is not this migration's
-- to take, and it is recorded, not hidden.
--
-- Existing data is never touched. Every one of these columns is NOT NULL, so NO ACTION
-- is the only coherent action: there is no column to set to NULL. A constraint is added
-- only when the table is already clean; a single orphan row makes the migration RAISE
-- with the table, the column and the count, and the whole transaction rolls back.
-- Nothing is deleted, nothing is nulled. If it raises, the orphans are real and what to
-- do with them belongs to the data owner.
--
-- Re-running is a no-op: a column already carrying a foreign key to the same parent is
-- skipped whatever the constraint is named, so this is also a no-op on the generated
-- schema.

BEGIN;

DO $$
DECLARE
  entry RECORD;
  child_type text;
  parent_type text;
  orphan_count bigint;
  type_divergences text[] := ARRAY[]::text[];
BEGIN
  FOR entry IN
    SELECT *
    FROM (VALUES
      ('anticipation_events',    'dog_id',   'dogs',  'anticipation_events_dog_id_dogs_id_fk'),
      ('baseline_drift_monitor', 'dog_id',   'dogs',  'baseline_drift_monitor_dog_id_dogs_id_fk'),
      ('copresence_events',      'dog_a_id', 'dogs',  'copresence_events_dog_a_id_dogs_id_fk'),
      ('copresence_events',      'dog_b_id', 'dogs',  'copresence_events_dog_b_id_dogs_id_fk'),
      ('dog_sub_baselines',      'dog_id',   'dogs',  'dog_sub_baselines_dog_id_dogs_id_fk'),
      ('recovery_events',        'dog_id',   'dogs',  'recovery_events_dog_id_dogs_id_fk'),
      ('routine_stability',      'dog_id',   'dogs',  'routine_stability_dog_id_dogs_id_fk'),
      ('user_config',            'dog_id',   'dogs',  'user_config_dog_id_dogs_id_fk'),
      ('user_config',            'user_id',  'users', 'user_config_user_id_users_id_fk'),
      ('walk_quality',           'dog_id',   'dogs',  'walk_quality_dog_id_dogs_id_fk')
    ) AS t(child_table, child_column, parent_table, constraint_name)
  LOOP
    -- Already constrained to the same parent, under this name or any other: leave it
    -- alone. This is what makes the migration idempotent and a no-op on the generated
    -- schema, and it is keyed on the relation rather than on the constraint name
    -- deliberately, since naming drift is exactly what produced the 0014 defect.
    IF EXISTS (
      SELECT 1
      FROM pg_constraint con
      JOIN pg_class child ON child.oid = con.conrelid
      JOIN pg_class parent ON parent.oid = con.confrelid
      JOIN LATERAL unnest(con.conkey) child_key(attnum) ON true
      JOIN pg_attribute att
        ON att.attrelid = child.oid
       AND att.attnum = child_key.attnum
      WHERE con.contype = 'f'
        AND child.relname = entry.child_table
        AND att.attname = entry.child_column
        AND parent.relname = entry.parent_table
    ) THEN
      CONTINUE;
    END IF;

    SELECT data_type INTO child_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = entry.child_table
      AND column_name = entry.child_column;

    SELECT data_type INTO parent_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = entry.parent_table
      AND column_name = 'id';

    IF child_type IS NULL OR parent_type IS NULL THEN
      RAISE EXCEPTION
        'Cannot reconcile %: %.% or %.id does not exist on this path',
        entry.constraint_name, entry.child_table, entry.child_column, entry.parent_table;
    END IF;

    -- The type divergence is the real defect; the absent constraint is its symptom.
    -- Converting the column is a data decision on a contractual sensor field, so it is
    -- named here and left to its own decision rather than forced through.
    IF child_type <> parent_type THEN
      type_divergences := type_divergences || format(
        '%s.%s is %s while %s.id is %s',
        entry.child_table, entry.child_column, child_type, entry.parent_table, parent_type
      );
      CONTINUE;
    END IF;

    EXECUTE format(
      'SELECT count(*) FROM %I child WHERE NOT EXISTS (SELECT 1 FROM %I parent WHERE parent.id = child.%I)',
      entry.child_table, entry.parent_table, entry.child_column
    ) INTO orphan_count;

    IF orphan_count > 0 THEN
      RAISE EXCEPTION
        'Refusing to add %: %.% has % row(s) with no matching %. Orphan rows are a data decision, not a schema one.',
        entry.constraint_name, entry.child_table, entry.child_column,
        orphan_count, entry.parent_table;
    END IF;

    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(id)',
      entry.child_table, entry.constraint_name, entry.child_column, entry.parent_table
    );
    RAISE NOTICE 'Added % on %.%', entry.constraint_name, entry.child_table, entry.child_column;
  END LOOP;

  IF array_length(type_divergences, 1) > 0 THEN
    RAISE NOTICE
      'Still diverging from the declared erasure topology, because the column type differs and converting it is a data decision: %',
      array_to_string(type_divergences, '; ');
  END IF;
END
$$;

COMMIT;

-- ============================================================
-- Rollback (manual):
--   BEGIN;
--   ALTER TABLE "copresence_events" DROP CONSTRAINT "copresence_events_dog_a_id_dogs_id_fk";
--   ALTER TABLE "copresence_events" DROP CONSTRAINT "copresence_events_dog_b_id_dogs_id_fk";
--   COMMIT;
-- ============================================================
