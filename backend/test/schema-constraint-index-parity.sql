\set QUIET on
\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on
\pset footer off

-- P0-DB constraint/index parity fingerprint.
-- Run against path A (baseline-draft + active migrations, psql) and path B
-- (Drizzle-generated baseline, drizzle-kit migrate). The workflow diffs the two
-- outputs; the only accepted differences are the classified entries in
-- schema-constraint-index-parity.known-drift.txt.
-- Names are part of the contract: migrations DROP CONSTRAINT IF EXISTS by name,
-- so a name drift silently leaves the old constraint in place (#446 D4).
-- The drizzle schema (migration journal) is excluded on purpose. Whitespace is
-- collapsed so each object is exactly one line (multi-line CHECK/CASE bodies).

-- Hard invariant, never ledgered: one FK per referencing column set and target.
-- A shadow NO ACTION FK next to a SET NULL one keeps blocking the delete.
DO $$
DECLARE
  duplicates text;
BEGIN
  SELECT string_agg(rel.relname || ': ' || names, '; ' ORDER BY rel.relname, names)
    INTO duplicates
    FROM (
      SELECT con.conrelid,
             string_agg(con.conname, ', ' ORDER BY con.conname) AS names
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = rel.relnamespace
       WHERE ns.nspname = 'public'
         AND con.contype = 'f'
       GROUP BY con.conrelid, con.conkey, con.confrelid, con.confkey
      HAVING count(*) > 1
    ) dup
    JOIN pg_class rel ON rel.oid = dup.conrelid;

  IF duplicates IS NOT NULL THEN
    RAISE EXCEPTION 'duplicate foreign keys on the same columns: %', duplicates;
  END IF;
END $$;

SELECT fingerprint
  FROM (
    SELECT 'CONSTRAINT|'
           || rel.relname || '|'
           || con.conname || '|'
           || con.contype::text || '|'
           || regexp_replace(pg_get_constraintdef(con.oid), '\s+', ' ', 'g') AS fingerprint
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = rel.relnamespace
     WHERE ns.nspname = 'public'
  ) constraints
 ORDER BY fingerprint COLLATE "C";

SELECT fingerprint
  FROM (
    SELECT 'INDEX|'
           || tablename || '|'
           || indexname || '|'
           || regexp_replace(indexdef, '\s+', ' ', 'g') AS fingerprint
      FROM pg_indexes
     WHERE schemaname = 'public'
  ) indexes
 ORDER BY fingerprint COLLATE "C";
