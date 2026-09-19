-- This checked-in path is intentionally not an executable data snapshot.
-- The pre-writer-owned snapshot is preserved as breed_canonical_insert.legacy.sql.
-- Regenerate the current artifact with the repository-managed toolchain:
--   pnpm --dir backend exec tsx ../scripts/ingest_vbo.ts --skip-download
--
-- Current generated upserts explicitly own updated_at on conflict.

DO $$
BEGIN
  RAISE EXCEPTION
    'Stale VBO SQL artifact: regenerate data/vbo/breed_canonical_insert.sql with scripts/ingest_vbo.ts before execution';
END $$;
