# EMOPET — P0 Disposable PostgreSQL Validation Evidence

**Workstream:** P0 database baseline  
**Branch:** `emopet/p0-db-baseline`  
**Validated candidate head:** `536f9150b79081cb9e7b02ae75bf5cc73a37b9ae`  
**GitHub Actions run:** `33275173353` / run #7  
**Candidate result:** `SUCCESS`  
**Environment:** GitHub-hosted Ubuntu runner + disposable PostgreSQL 16 service container  
**Authority decision:** `NO_EXISTING_DB_TO_PRESERVE`

---

## 1. Scope

This record documents successful disposable validation of the candidate compatibility bootstrap path and the subsequent authority decision selecting a fresh-database baseline path.

No persistent, shared or production database was touched.

---

## 2. Candidate sequence validated in run #7

The workflow:

1. installed repository dependencies from the committed pnpm lockfile;
2. ran repository-only migration dependency checks;
3. applied all SQL under `backend/db/baseline-draft/` in lexical order;
4. applied historical migrations `0001` through `0004`;
5. captured table inventory and full schema dump;
6. created a second empty disposable database;
7. repeated the complete sequence;
8. compared table inventories;
9. normalized only PostgreSQL per-dump `\\restrict` / `\\unrestrict` session tokens;
10. compared complete normalized schema dumps;
11. built the backend dependency closure;
12. ran backend typecheck;
13. ran backend tests.

All steps completed successfully.

---

## 3. Candidate validation gates

### DB-G1 — Empty database apply

`PASS`

### DB-G2 — Candidate repeatability

`PASS`

A second independent empty PostgreSQL database produced the same table inventory and normalized complete schema dump.

### DB-G3 — Backend compatibility

`PASS` at the validated candidate revision.

Dependency-closure build, backend typecheck and backend tests completed successfully.

### DB-G4 — Active Drizzle ledger

`OPEN`

The compatibility candidate is not automatically the final active Drizzle ledger.

---

## 4. Authority gate resolution

The project authority selected:

`NO_EXISTING_DB_TO_PRESERVE`

This means no existing EMOPET PostgreSQL state must survive the P0 baseline reconciliation.

The previous upgrade-preservation blocker is therefore closed for this workstream.

Decision record:

`docs/control/P0_DB_AUTHORITY_DECISION_NO_EXISTING_DB.md`

This does not authorize a production migration.

---

## 5. Source/history drift reconciliation after run #7

The database slice then reconciled repository-supported drift before clean baseline generation:

- firmware capability columns from historical migration `0004` were added to the current Drizzle `devices` declaration;
- composite primary keys from historical migration `0003` were represented in current Drizzle source for `dog_sub_baselines`, `routine_stability` and `user_config`;
- historical morphology compatibility columns used only to replay `0003` were explicitly **not** promoted into the current `breed_sensor_profiles` source model;
- the ELI `TEXT` identifier versus core UUID relationship remains an open architecture relationship issue and was not silently rewritten.

Record:

`docs/control/P0_DB_SCHEMA_DRIFT_RECONCILIATION.md`

---

## 6. Follow-on clean Drizzle baseline QA

An isolated config now generates from current reconciled source schema into:

`backend/db/p0-generated-baseline/`

The extended workflow tests:

1. `drizzle-kit generate` from the current schema;
2. generated ledger integrity;
3. `drizzle-kit migrate` against another disposable PostgreSQL database;
4. table-inventory parity with the already validated compatibility reconstruction;
5. second-generation stability;
6. backend dependency-closure build;
7. backend typecheck;
8. backend tests.

Generated output remains QA material until the run passes and the exact SQL/metadata are reviewed and intentionally promoted.

---

## 7. Maturity

Supported:

`CANDIDATE FRESH-DB COMPATIBILITY RECONSTRUCTION = DISPOSABLE_QA_PASS`

`CANDIDATE REPEATABILITY = VERIFIED`

`NO_EXISTING_DB_TO_PRESERVE = CONTROLLED DECISION`

Not yet supported:

`ACTIVE DRIZZLE BASELINE = APPROVED`

`PRODUCTION DATABASE READY = TRUE`

`PRODUCTION MIGRATION AUTHORIZED = TRUE`

---

`DISPOSABLE POSTGRESQL CANDIDATE VALIDATION PASSED — FRESH-DB PATH SELECTED — NO PRODUCTION PROMOTION APPLIED.`
