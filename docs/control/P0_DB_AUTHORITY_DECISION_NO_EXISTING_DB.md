# EMOPET — P0 Database Authority Decision

**Decision:** `NO_EXISTING_DB_TO_PRESERVE`  
**Recorded:** 2026-08-29  
**Workstream:** P0 database baseline  
**Branch:** `emopet/p0-db-baseline`

## Decision

The project authority confirms that there is **no existing EMOPET PostgreSQL database whose schema or data must be preserved** for this P0 reconciliation.

This closes the previous `UNKNOWN` branch of the migration-authority gate and selects the fresh-database path.

## Authorized consequence

The database workstream is authorized to:

1. reconcile known source-schema versus historical-SQL drift using repository evidence;
2. prepare a clean active migration baseline for a new PostgreSQL database;
3. preserve the old `0001`–`0004` SQL as historical evidence rather than treating it as a complete standalone fresh-database chain;
4. establish controlled migration metadata/ledger behavior;
5. validate the promoted form on disposable PostgreSQL;
6. proceed to the authentication slice only after the database baseline is separately reviewable.

## Explicit non-effects

This decision does **not** authorize:

- production deployment;
- migration of any unknown/shared database;
- `drizzle-kit push` as a replacement for migration history;
- deletion of historical migration evidence;
- seed promotion;
- authentication implementation inside the DB PR;
- Vercel work;
- Unity activation;
- Nakama activation;
- merge to `main` without explicit approval.

## Current evidence

The candidate reconstruction was already validated on two disposable PostgreSQL 16 databases in GitHub Actions run `33275173353` / run #7. The sequence applied successfully twice, produced matching normalized schema dumps, and passed backend dependency-closure build, typecheck and tests.

That evidence establishes repeatability of the candidate fresh-database path. It does **not** by itself make the candidate SQL the final active migration ledger.

## New gate state

`EXISTING_DB_PRESERVATION_GATE = CLOSED / NO_EXISTING_DB_TO_PRESERVE`

`FRESH_DB_PATH = AUTHORIZED_FOR_CONTROLLED_BASELINE_PREPARATION`

`ACTIVE_DRIZZLE_MIGRATION_BASELINE = OPEN`

`PRODUCTION_DATABASE_READINESS = NOT ESTABLISHED`

**NO SILENT PRODUCTION OR MATURITY PROMOTION.**