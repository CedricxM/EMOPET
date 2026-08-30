# EMOPET — Disposable PostgreSQL baseline validation runbook

Status: `PREPARED / NOT EXECUTED`

This runbook is for a future machine/session with Docker (or another explicitly disposable PostgreSQL instance) and the repository checked out locally.

It is deliberately written so the P0 database work can be prepared now without pretending execution has happened.

## 1. Safety prerequisites

Before running anything, verify all of the following:

- you are on the intended P0 database branch;
- the target database is disposable and contains no user/project data that must survive;
- `DATABASE_URL` points only to that disposable instance;
- no production/shared credentials are loaded in the shell;
- the candidate `0000_core_baseline.sql` is still under `backend/db/baseline-draft/`;
- Vercel is not required for this workstream.

Do not use `drizzle-kit push`.

## 2. Expected branch

```bash
git switch emopet/p0-db-baseline
```

Record:

```bash
git rev-parse HEAD
```

The SHA must be copied into the validation report.

## 3. Install dependencies

From repository root:

```bash
corepack enable
pnpm install --frozen-lockfile
```

Then run repository-only checks before touching PostgreSQL:

```bash
pnpm --filter @emopet/api build
pnpm --filter @emopet/api test
pnpm --filter @emopet/api typecheck
```

The static migration test is expected to run through the backend test script because it lives under `backend/test/*.test.mjs`.

If the existing backend suite fails for reasons unrelated to the baseline, record the exact pre-existing failure and do not rewrite unrelated code inside this PR merely to obtain green output.

## 4. Start a disposable PostgreSQL instance

Example Docker command (local disposable database only):

```bash
docker run --rm --name emopet-p0-db-qa \
  -e POSTGRES_USER=emopet_qa \
  -e POSTGRES_PASSWORD=emopet_qa_only \
  -e POSTGRES_DB=emopet_qa \
  -p 55432:5432 \
  -d postgres:16
```

Use a non-default host port to reduce the risk of pointing at an existing local PostgreSQL service.

Set the shell variable only for this session:

```bash
export DATABASE_URL='postgres://emopet_qa:emopet_qa_only@127.0.0.1:55432/emopet_qa'
```

On PowerShell:

```powershell
$env:DATABASE_URL='postgres://emopet_qa:emopet_qa_only@127.0.0.1:55432/emopet_qa'
```

## 5. Candidate execution sequence

The draft baseline is intentionally outside the active migrations directory. For QA, apply it explicitly first, then apply historical migrations in order.

Using `psql`:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/db/baseline-draft/0000_core_baseline.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/db/migrations/0001_dataset_registry.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/db/migrations/0002_freemium_foundation.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/db/migrations/0003_architecture_upgrade.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/db/migrations/0004_v6_additions.sql
```

Stop on the first SQL error. Do not edit the live disposable database by hand to make later steps pass. Fix the repository artifact, destroy the database, and rerun from empty.

## 6. Structural inventory

After successful apply, capture schema-only evidence:

```bash
pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL" > /tmp/emopet-p0-schema.sql
```

Also capture table names:

```bash
psql "$DATABASE_URL" -Atc "select schemaname || '.' || tablename from pg_tables where schemaname='public' order by tablename;"
```

Capture columns/types/nullability/defaults:

```bash
psql "$DATABASE_URL" -P pager=off -c "
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public'
order by table_name, ordinal_position;
"
```

Capture primary/unique/foreign-key constraints and indexes using PostgreSQL catalog queries or the schema-only dump.

## 7. Required parity review

Compare the resulting database against `backend/db/schema/*.ts`.

Review at minimum:

- table presence;
- column presence;
- identifier types;
- nullability;
- defaults;
- primary keys;
- unique constraints;
- foreign keys;
- indexes;
- firmware capability columns introduced by `0004`;
- `dog_sub_baselines` composite-key drift;
- `routine_stability` composite-key drift;
- `user_config` composite-key drift;
- TEXT-vs-UUID identifier split in ELI tables.

Do not automatically modify the Drizzle schema or historical SQL to erase intentional/historical differences. Record each difference and classify it first.

## 8. Repeatability gate

Destroy the first disposable instance:

```bash
docker stop emopet-p0-db-qa
```

Start a fresh instance and repeat the complete apply sequence from zero.

The second run must produce the same structural result before the baseline can be considered repeatable.

## 9. Backend compatibility gate

With the disposable database running and `DATABASE_URL` pointing to it, run applicable backend commands:

```bash
pnpm --filter @emopet/api build
pnpm --filter @emopet/api typecheck
pnpm --filter @emopet/api test
```

If additional database integration tests are added later, include them here.

## 10. Promotion decision

Only after successful disposable validation may the team consider moving the candidate baseline into active migration history.

Possible post-validation status:

`DRAFT_BASELINE_POSTGRES_QA = PASS`

This still does not automatically establish upgrade safety for an existing database.

If an existing EMOPET database must be preserved, the separate gate remains:

`EXISTING_DB_UPGRADE_COMPATIBILITY = BLOCKED_PENDING_SCHEMA_EVIDENCE`

## 11. Validation report fields

Record:

- repository SHA;
- PostgreSQL version/image digest where available;
- Node version;
- pnpm version;
- first clean-apply result;
- second clean-apply result;
- static-test result;
- backend build/typecheck/test result;
- schema parity differences;
- unresolved drift;
- whether an existing DB must be preserved;
- final maturity statement.

Until this runbook is executed successfully:

`QA_PENDING_DISPOSABLE_POSTGRES_VALIDATION`

`PRODUCTION DATABASE READINESS = NOT ESTABLISHED`
