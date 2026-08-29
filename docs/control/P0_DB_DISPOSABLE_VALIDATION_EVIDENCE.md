# EMOPET — P0 Disposable PostgreSQL Validation Evidence

**Workstream:** P0 database baseline  
**Branch:** `emopet/p0-db-baseline`  
**Validated head:** `536f9150b79081cb9e7b02ae75bf5cc73a37b9ae`  
**GitHub Actions run:** `33275173353`  
**Run number:** 7  
**Result:** `SUCCESS`  
**Environment:** GitHub-hosted Ubuntu runner + disposable PostgreSQL 16 service container

---

## 1. Scope of this evidence

This record documents successful disposable validation of the candidate P0 database bootstrap path currently stored outside the active Drizzle migration directory.

It does **not** establish that any existing persistent EMOPET database is safe to upgrade, does **not** authorize production migration, and does **not** promote the candidate draft SQL into active migration history.

---

## 2. Validated sequence

The successful workflow performed the following sequence on an empty disposable PostgreSQL database:

1. install repository dependencies from the committed pnpm lockfile;
2. run repository-only migration dependency checks;
3. apply all SQL files under `backend/db/baseline-draft/` in lexical order;
4. apply historical migrations `0001` through `0004` in order;
5. capture table inventory and full schema dump;
6. create a second empty disposable database;
7. repeat the entire draft + historical migration sequence;
8. compare table inventories;
9. normalize only PostgreSQL `pg_dump` per-session `\\restrict` / `\\unrestrict` guard tokens;
10. compare the complete normalized schema dumps;
11. build the complete backend dependency closure;
12. run backend typecheck;
13. run backend tests.

All workflow steps completed successfully.

---

## 3. Evidence summary

### DB-G1 — Empty database apply

**PASS for the candidate disposable path.**

The draft prerequisites followed by `0001`–`0004` applied successfully to PostgreSQL 16 with `ON_ERROR_STOP=1`.

### DB-G2 — Current-schema coverage

**PARTIAL / CONTROLLED.**

The static repository test confirms that every current Drizzle `pgTable(...)` table name has a `CREATE TABLE` in the combined draft + historical SQL set and that every `ALTER TABLE` target exists earlier in the ordered sequence.

This does not by itself prove that every column/type/constraint exactly matches the current Drizzle declaration. Known historical schema drift remains documented in `backend/db/MIGRATION_BASELINE_RECONCILIATION.md`.

### DB-G3 — Migration ledger

**OPEN.**

The active `backend/db/migrations/` directory still lacks a controlled complete Drizzle metadata/journal history for this reconstructed baseline. Candidate SQL remains deliberately outside active migration history.

### DB-G4 — Repeatability

**PASS for disposable reconstruction.**

A second empty database produced the same table inventory and the same normalized full `pg_dump --schema-only` output.

The only non-schema difference initially observed was PostgreSQL's random per-dump `\\restrict` / `\\unrestrict` session guard token. Those session-only lines are normalized before comparison; no schema DDL difference remained.

### DB-G5 — Backend compatibility

**PASS at this repository revision.**

The workflow successfully completed:

- backend dependency-closure build;
- backend typecheck;
- backend test suite.

### DB-G6 — Existing-database upgrade compatibility

**NOT TESTED / BLOCKED.**

No persistent or production-like database was touched.

### DB-G7 — Recovery / rollback

**OPEN.**

A production-safe recovery/upgrade procedure cannot be finalized until the existing-database authority gate is resolved.

---

## 4. Important correction discovered during validation

An earlier workflow attempt built `@emopet/api` directly and failed because workspace dependency `@emopet/shared` had not yet emitted its `dist` artifacts.

This was a CI orchestration defect, not a PostgreSQL defect.

The corrected workflow builds the backend dependency closure with:

`pnpm --filter @emopet/api... build`

The corrected build, typecheck and tests all passed in run 7.

---

## 5. Current maturity state

The successful disposable run supports these statements:

`CANDIDATE FRESH-DB RECONSTRUCTION = DISPOSABLE_QA_PASS`

`REPEATABLE DISPOSABLE SCHEMA = VERIFIED FOR CURRENT CANDIDATE SEQUENCE`

`BACKEND BUILD / TYPECHECK / TESTS = PASS ON VALIDATED RUN`

It does **not** support these statements:

`ACTIVE DRIZZLE BASELINE = APPROVED`

`EXISTING DATABASE UPGRADE = VERIFIED`

`PRODUCTION DATABASE READY = TRUE`

`PRODUCTION MIGRATION AUTHORIZED = TRUE`

---

## 6. Remaining authority gate

Before candidate SQL can move into active migration history, establish exactly one of:

- `NO_EXISTING_DB_TO_PRESERVE`; or
- `EXISTING_DB_MUST_BE_PRESERVED` plus schema-only evidence and an upgrade-safe reconciliation plan.

Until that decision is controlled, PR #3 must remain draft and the candidate SQL must remain outside `backend/db/migrations/`.

---

`DISPOSABLE POSTGRESQL VALIDATION PASSED — NO PRODUCTION OR MIGRATION-AUTHORITY PROMOTION APPLIED.`
