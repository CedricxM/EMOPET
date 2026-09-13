-- DATASET-01 existing-database reconciliation.
--
-- Migration 0001 installed permanent updated_at triggers on dataset_registry
-- and breed_canonical. Fresh Drizzle authority does not own those triggers.
-- Current writers must therefore own updated_at explicitly.
--
-- Fail closed if unexpected user triggers exist on the affected tables.

BEGIN;

DO $$
DECLARE
  unexpected_count bigint;
BEGIN
  SELECT count(*)
    INTO unexpected_count
    FROM pg_trigger trg
    JOIN pg_class rel ON rel.oid = trg.tgrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
   WHERE ns.nspname = 'public'
     AND rel.relname IN ('dataset_registry', 'breed_canonical')
     AND NOT trg.tgisinternal
     AND trg.tgname NOT IN (
       'update_dataset_registry_updated_at',
       'update_breed_canonical_updated_at'
     );

  IF unexpected_count <> 0 THEN
    RAISE EXCEPTION
      'DATASET-01 refuses to remove historical updated_at authority: % unexpected user trigger(s) exist',
      unexpected_count;
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_dataset_registry_updated_at ON dataset_registry;
DROP TRIGGER IF EXISTS update_breed_canonical_updated_at ON breed_canonical;

-- RESTRICT is intentional: if an unaccounted object still depends on this
-- function, migration must fail rather than cascade-drop it.
DROP FUNCTION IF EXISTS update_updated_at_column() RESTRICT;

-- UNIQUE(breed_slug) already owns the canonical btree lookup. The extra
-- historical non-unique index duplicates it and is not part of current Drizzle.
DROP INDEX IF EXISTS idx_breed_canonical_slug;

COMMIT;
