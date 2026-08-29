# EMOPET — Drizzle/PostgreSQL Migration Baseline Reconciliation

**Workstream:** P0 database baseline  
**Branch:** `emopet/p0-db-baseline`  
**Baseline:** `main` at `ce60239e5d53e1b4b98f1bb12e3bf6cf191fe473`  
**Status:** `BLOCKED_MIGRATION_BASELINE_AUTHORITY`  
**Scope:** evidence/reconciliation only — no migration executed, no production/shared database touched

---

## 1. Purpose

This note records the database state observed in the repository before any new migration baseline is generated.

It does **not** declare the current migration chain valid, does **not** promote the current Drizzle schema to a production database contract, and does **not** authorize destructive upgrade work.

The immediate objective is to separate three different questions:

1. What does the current TypeScript/Drizzle schema declare?
2. What do the four checked-in SQL migrations actually create or alter?
3. Can a safe fresh-database and/or existing-database migration path be established from repository evidence alone?

Current answer to (3): **not yet**.

---

## 2. Controlled runtime boundary

Observed database stack:

- PostgreSQL
- Drizzle ORM
- `drizzle-kit`
- Postgres.js
- schema entrypoint: `backend/db/schema/index.ts`
- Drizzle output directory: `backend/db/migrations`

The active backend package exposes:

- `db:generate` → `drizzle-kit generate`
- `db:migrate` → `drizzle-kit migrate`
- `db:push` → `drizzle-kit push`

For this P0 workstream, `db:push` is **not** an acceptable substitute for a controlled migration history.

---

## 3. Checked-in migration inventory

Only four SQL migrations are present:

1. `0001_dataset_registry.sql`
2. `0002_freemium_foundation.sql`
3. `0003_architecture_upgrade.sql`
4. `0004_v6_additions.sql`

No checked-in Drizzle `meta/` journal/snapshot directory was observed alongside them.

This means the repository contains SQL history but does not currently expose the normal complete Drizzle migration metadata needed to treat that directory as a proven generated baseline.

---

## 4. Current Drizzle schema inventory

`backend/db/schema/index.ts` exports eight schema modules.

### 4.1 `users.ts`

Declared tables:

- `users`
- `subscriptions`
- `achievements`

Key observations:

- `users.id` is UUID primary key;
- `users.email` is unique;
- `users.password_hash` is mandatory;
- GDPR consent timestamp exists;
- subscriptions reference users.

### 4.2 `dogs.ts`

Declared tables:

- `dogs`
- `devices`
- `health_entries`
- `breed_sensor_profiles`

Key observations:

- `dogs.owner_id` references `users.id` as UUID;
- `devices.dog_id` references `dogs.id`;
- `health_entries.dog_id` references `dogs.id`;
- `breed_sensor_profiles.vbo_id` references `breed_canonical.vbo_id`.

### 4.3 `sensors.ts`

Declared tables:

- `sensor_summaries`
- `eli_states`
- `baselines`

All are dog-scoped and reference `dogs.id`.

### 4.4 `community.ts`

Declared tables:

- `communities`
- `community_members`
- `posts`
- `comments`
- `community_events`
- `copresence_events`

Several tables reference `users` and/or other community tables.

### 4.5 `ai.ts`

Declared table:

- `ai_messages`

References users and dogs where applicable.

### 4.6 `datasets.ts`

Declared tables:

- `dataset_registry`
- `dataset_versions`
- `breed_canonical`
- `imu_activity_profiles`
- `imu_discrimination_thresholds`
- `imu_shake_filter`

These correspond substantially to migration `0001_dataset_registry.sql`.

### 4.7 `freemium.ts`

Declared tables:

- `breed_knowledge`
- `bleiz_freemium_templates`
- `local_directory`
- `weather_context`
- `seasonal_alerts`

These correspond substantially to migration `0002_freemium_foundation.sql`.

### 4.8 `eli-v5.ts`

Declared tables:

- `dog_sub_baselines`
- `recovery_events`
- `anticipation_events`
- `baseline_drift_monitor`
- `walk_quality`
- `routine_stability`
- `user_config`

These correspond substantially to migrations `0003_architecture_upgrade.sql` and `0004_v6_additions.sql`, but not perfectly; drift is documented below.

---

## 5. Migration-to-schema reconciliation matrix

| Domain | Current Drizzle tables | Creation present in 0001–0004? | Result |
|---|---|---:|---|
| Identity | users, subscriptions, achievements | No creation found | `MISSING_CORE_CREATION` |
| Dogs/devices | dogs, devices, health_entries, breed_sensor_profiles | No creation found | `MISSING_CORE_CREATION` |
| Sensors | sensor_summaries, eli_states, baselines | No creation found | `MISSING_CORE_CREATION` |
| Community | communities, community_members, posts, comments, community_events, copresence_events | No creation found | `MISSING_CORE_CREATION` |
| AI | ai_messages | No creation found | `MISSING_CORE_CREATION` |
| Dataset governance | dataset_registry, dataset_versions, breed_canonical, IMU tables | Yes, substantially in 0001 | `PRESENT_WITH_DEPENDENCY` |
| Freemium/reference | breed_knowledge, templates, directory, weather, alerts | Yes, substantially in 0002 | `PRESENT` |
| ELI architecture | user_config, dog_sub_baselines, baseline_drift_monitor, walk_quality, routine_stability | Yes, substantially in 0003 | `PRESENT_WITH_DRIFT` |
| ELI v6 additions | recovery_events, anticipation_events + baseline extensions | Yes, substantially in 0004 | `PRESENT_WITH_DRIFT` |

The checked-in chain therefore cannot be considered a fresh-database baseline.

---

## 6. Proven hard failures in the current migration ordering

### 6.1 `0001` alters a table that is never created earlier

`0001_dataset_registry.sql` executes an `ALTER TABLE breed_sensor_profiles ...` operation.

There is no migration before `0001`, and no creation of `breed_sensor_profiles` earlier in that file.

On a genuinely empty PostgreSQL database, that dependency is unresolved.

### 6.2 `0003` again assumes `breed_sensor_profiles` already exists

`0003_architecture_upgrade.sql` begins by adding constraints to `breed_sensor_profiles`.

The checked-in migration chain still has no core-table creation migration before this point.

### 6.3 `0004` assumes `devices` already exists

`0004_v6_additions.sql` alters `devices` to add firmware capability columns.

No checked-in migration in `0001`–`0003` creates `devices`.

### Consequence

A clean database cannot safely be bootstrapped by simply running the current migration sequence from `0001` through `0004`.

---

## 7. Schema/migration drift already visible

The problem is not only a missing `0000` migration. The current schema and SQL history have drifted.

### 7.1 Firmware capability columns

`0004_v6_additions.sql` adds to `devices`:

- `firmware_major`
- `firmware_minor`
- `firmware_patch`
- `supports_v6_features`

The current `dogs.ts` Drizzle declaration for `devices` does **not** declare those columns.

Status: `SCHEMA_MIGRATION_DRIFT`.

### 7.2 Composite key mismatch — `dog_sub_baselines`

`0003_architecture_upgrade.sql` defines:

`PRIMARY KEY (dog_id, slot)`

The current Drizzle schema uses a normal index named `idx_sub_baselines_dog_slot`, with a comment describing a composite primary key as "emulated via unique index"; the actual declaration shown is not a primary key and is not a unique index.

Status: `CONSTRAINT_DRIFT`.

### 7.3 Composite key mismatch — `routine_stability`

`0003_architecture_upgrade.sql` defines:

`PRIMARY KEY (dog_id, date)`

The current Drizzle schema declares only `idx_routine_stability_dog_date`, not a primary-key constraint.

Status: `CONSTRAINT_DRIFT`.

### 7.4 Composite key mismatch — `user_config`

`0003_architecture_upgrade.sql` defines:

`PRIMARY KEY (user_id, dog_id, config_key)`

The current Drizzle `userConfig` declaration contains no equivalent primary key/unique constraint.

Status: `CONSTRAINT_DRIFT`.

### 7.5 Identifier-type split

The core current schema uses UUID identifiers for `users.id` and `dogs.id`.

Several tables in `eli-v5.ts` use plain `text` for `dog_id` / `user_id`, and migration `0003` creates those columns as `TEXT` without foreign keys to the UUID core tables.

This may be intentional historical compatibility, but it must not be silently normalized without an authority/upgrade decision.

Status: `TYPE_AND_RELATIONSHIP_RECONCILIATION_REQUIRED`.

---

## 8. Seed inventory consequence

`backend/db/seeds` contains substantial reference/content seed data, including breed knowledge, freemium templates and local-directory content.

The seed corpus is **not lost**, but it cannot be treated as executable fresh-install proof until the tables it targets are created by a validated baseline.

No seed execution is authorized in this reconciliation phase.

---

## 9. Fresh database vs existing database — two different problems

### Path A — no persistent database must be preserved

If EMOPET has no existing PostgreSQL instance containing data that must survive this reconciliation, a new controlled baseline can be reconstructed from the current schema plus the historical migrations.

The safe target would be:

1. create a complete core baseline in dependency order;
2. explicitly reconcile the 0001–0004 historical changes into the resulting schema;
3. generate/restore compatible Drizzle metadata;
4. validate against a disposable PostgreSQL instance;
5. verify schema parity;
6. run backend build/tests;
7. document rollback/rebuild behavior.

A filename such as `0000_core_baseline.sql` is a candidate implementation detail, not yet authorized by this document.

### Path B — an existing database contains data to preserve

If a persistent EMOPET PostgreSQL database already exists, generating a new baseline from source code alone is unsafe.

Required evidence before writing upgrade SQL:

- database schema dump (`--schema-only` or equivalent);
- current table/column/index/constraint inventory;
- migration ledger, if any;
- confirmation of which environment the dump represents;
- whether data must be retained;
- whether existing identifiers/types are already in production-like use.

No data dump is required for the first comparison; schema-only evidence is preferable.

Until this is known, the upgrade path remains blocked.

---

## 10. Current decision gate

The next irreversible design choice depends on one question:

> **Does an existing EMOPET PostgreSQL database contain data or schema state that must be preserved?**

Possible controlled answers:

### `NO_EXISTING_DB_TO_PRESERVE`

Authorize construction and disposable validation of a clean baseline from repository authority.

### `EXISTING_DB_MUST_BE_PRESERVED`

Require schema evidence before any upgrade/baseline SQL is authored.

### `UNKNOWN`

Remain blocked. Continue only with read-only reconciliation and test harness preparation.

Current state: `UNKNOWN`.

---

## 11. Safe work allowed while the gate is open

The following work is allowed without touching production/shared data:

- repository-only schema/migration mapping;
- static SQL dependency review;
- disposable PostgreSQL test harness design;
- tests that fail safely when the historical chain is incomplete;
- documentation of expected table/constraint parity;
- branch/PR preparation.

The following work is **not** authorized by this note:

- `drizzle-kit push` against any persistent database;
- destructive SQL against any existing database;
- dropping/recreating user data;
- marking 0001–0004 as validated;
- deleting historical migrations;
- silently renumbering history;
- production deployment.

---

## 12. Proposed validation gates for the eventual baseline

A future baseline may only be marked `VERIFIED` after all applicable gates pass.

### DB-G1 — Empty database apply

All controlled migrations apply from an empty PostgreSQL database without manual intervention.

### DB-G2 — Schema parity

The resulting database matches the controlled Drizzle schema for tables, columns, types, defaults, nullability, foreign keys, unique constraints and indexes, with every intentional historical exception documented.

### DB-G3 — Migration ledger

Drizzle migration metadata/history is deterministic and committed or otherwise explicitly controlled.

### DB-G4 — Repeatability

A second clean database produces the same schema from the same repository revision.

### DB-G5 — Backend compatibility

Backend build, typecheck and database-relevant tests pass against the disposable database.

### DB-G6 — Upgrade compatibility

Required only if an existing database must be preserved. Upgrade is validated from a representative schema snapshot with no unintended data loss.

### DB-G7 — Rollback/recovery

Recovery procedure is documented. A destructive rollback is not assumed safe merely because comments exist in SQL.

---

## 13. P0 maturity statement

Observed facts support the following status only:

`DATABASE SCHEMA = OBSERVED`

`CHECKED-IN SQL HISTORY = OBSERVED / INCOMPLETE AS FRESH BASELINE`

`FRESH DATABASE BOOTSTRAP = BLOCKED`

`EXISTING DATABASE UPGRADE = BLOCKED PENDING AUTHORITY/EVIDENCE`

`DRIZZLE MIGRATION BASELINE = BLOCKED_MIGRATION_BASELINE_AUTHORITY`

`PRODUCTION DATABASE READINESS = NOT ESTABLISHED`

No Product V1, production, security, deployment or manufacturing maturity is promoted by this reconciliation.

---

## 14. Next controlled action

Before authoring a core migration, establish one of the following:

- `NO_EXISTING_DB_TO_PRESERVE`, or
- `EXISTING_DB_MUST_BE_PRESERVED` + provide schema-only evidence.

Until then, this branch remains a non-destructive reconciliation slice.

**NO SILENT MIGRATION, ARCHITECTURE OR MATURITY PROMOTION.**
