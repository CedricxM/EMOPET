\set ON_ERROR_STOP on

-- Operational dataset authority after DATASET-01 reconciliation.
-- Historical replay and a fresh Drizzle baseline must both end with no
-- permanent user trigger authority, no legacy helper function, and no
-- redundant explicit breed_slug lookup index.

SELECT 'DATASET_USER_TRIGGER_COUNT|'
       || count(*)::text
  FROM pg_trigger trg
  JOIN pg_class rel ON rel.oid = trg.tgrelid
  JOIN pg_namespace ns ON ns.oid = rel.relnamespace
 WHERE ns.nspname = 'public'
   AND rel.relname IN ('dataset_registry', 'breed_canonical')
   AND NOT trg.tgisinternal;

SELECT 'DATASET_UPDATED_AT_FUNCTION_COUNT|'
       || count(*)::text
  FROM pg_proc p
  JOIN pg_namespace ns ON ns.oid = p.pronamespace
 WHERE ns.nspname = 'public'
   AND p.proname = 'update_updated_at_column';

SELECT 'DATASET_REDUNDANT_SLUG_INDEX_COUNT|'
       || count(*)::text
  FROM pg_class idx
  JOIN pg_namespace ns ON ns.oid = idx.relnamespace
 WHERE ns.nspname = 'public'
   AND idx.relkind = 'i'
   AND idx.relname = 'idx_breed_canonical_slug';
