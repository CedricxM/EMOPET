# EMOPET P0 database baseline draft

Status: `QA_PENDING_DISPOSABLE_POSTGRES_VALIDATION`

This directory is deliberately outside `backend/db/migrations/`.

Its contents are preparation artifacts only. They must not be treated as active migration history, production database authority, or proof that a clean PostgreSQL bootstrap succeeds.

## Why this draft exists

The checked-in `0001`–`0004` chain assumes core tables already exist. In particular:

- `0001_dataset_registry.sql` alters `breed_sensor_profiles`;
- `0003_architecture_upgrade.sql` alters `breed_sensor_profiles` again;
- `0004_v6_additions.sql` alters `devices`.

No checked-in migration before those operations creates the required core tables.

`0000_core_baseline.sql` therefore reconstructs a candidate pre-0001 core dependency layer from the current Drizzle declarations for identity, dogs/devices, sensor summaries, community, and AI persistence.

## What has NOT been proven

The draft has not yet been executed against PostgreSQL.

The following remain unverified:

- SQL syntax/runtime compatibility on the target PostgreSQL version;
- `gen_random_uuid()` availability in the target environment;
- complete type/default/nullability/index/foreign-key parity with Drizzle;
- upgrade compatibility with any existing EMOPET database;
- Drizzle migration journal/metadata behavior;
- seed compatibility;
- backend compatibility against the resulting schema.

## Static test

`backend/test/migration-baseline-static.test.mjs` performs repository-only checks that require no database:

1. every table declared through `pgTable(...)` in the current schema must have a `CREATE TABLE` in the draft+historical SQL set;
2. every `ALTER TABLE` target must have been created earlier in the ordered draft+historical sequence;
3. the candidate `0000` must remain outside the active migration directory.

This static test is necessary but not sufficient. Passing it must never be reported as a database migration PASS.

## Promotion gate

Before this draft can be moved into `backend/db/migrations/`, one of these states must be established:

- `NO_EXISTING_DB_TO_PRESERVE`, followed by disposable PostgreSQL validation; or
- `EXISTING_DB_MUST_BE_PRESERVED`, followed by schema-only evidence and an upgrade-safe plan.

Until then:

`DRIZZLE MIGRATION BASELINE = BLOCKED_MIGRATION_BASELINE_AUTHORITY`

`POSTGRES EXECUTION QA = PENDING`

`PRODUCTION DATABASE READINESS = NOT ESTABLISHED`
