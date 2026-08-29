# EMOPET — Drizzle/PostgreSQL Migration Baseline Reconciliation

**Workstream:** P0 database baseline  
**Branch:** `emopet/p0-db-baseline`  
**Baseline:** `main` at `ce60239e5d53e1b4b98f1bb12e3bf6cf191fe473`  
**Status:** `BLOCKED_MIGRATION_BASELINE_AUTHORITY`  
**Disposable QA:** `PASS` on GitHub Actions run `33275173353` / run #7  
**Scope:** candidate fresh-database reconstruction validated only on disposable PostgreSQL — no production/shared database touched

---

## 1. Purpose

This note records the database state observed in the repository before any active migration baseline is promoted.

It does **not** declare the current historical migration chain independently valid, does **not** promote the current Drizzle schema to a production database contract, and does **not** authorize destructive upgrade work.

The immediate objective is to separate three different questions:

1. What does the current TypeScript/Drizzle schema declare?
2. What do the four checked-in SQL migrations actually create or alter?
3. Can a safe fresh-database and/or existing-database migration path be established from repository evidence?

Current answer to (3):

- **fresh disposable database path:** candidate sequence validated successfully;
- **existing persistent database path:** still blocked pending authority/evidence.

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

Only four historical SQL migrations are present:

1. `0001_dataset_registry.sql`
2. `0002_freemium_foundation.sql`
3. `0003_architecture_upgrade.sql`
4. `0004_v6_additions.sql`

No checked-in Drizzle `meta/` journal/snapshot directory was observed alongside them.

This means the repository contains historical SQL but does not currently expose the normal complete Drizzle migration metadata needed to treat that directory as a proven generated fresh-database baseline by itself.

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

| Domain | Current Drizzle tables | Creation present in historical 0001–0004? | Result |
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

The historical chain by itself cannot be considered a fresh-database baseline.

---

## 6. Proven hard failures in the historical ordering

### 6.1 `0001` alters a table that is never created earlier

`0001_dataset_registry.sql` executes an `ALTER TABLE breed_sensor_profiles ...` operation.

There is no migration before `0001`, and no creation of `breed_sensor_profiles` earlier in that file.

### 6.2 `0003` again assumes `breed_sensor_profiles` already exists

`0003_architecture_upgrade.sql` begins by adding constraints to `breed_sensor_profiles`.

### 6.3 `0004` assumes `devices` already exists

`0004_v6_additions.sql` alters `devices` to add firmware capability columns.

No checked-in historical migration in `0001`–`0003` creates `devices`.

### Consequence

A clean database cannot safely be bootstrapped by simply running historical `0001` through `0004` alone.

The candidate P0 reconstruction solves these missing prerequisites in **draft files outside active migration history**, and that candidate sequence has now been validated on disposable PostgreSQL.

---

## 7. Schema/migration drift already visible

The problem is not only missing pre-0001 creation SQL. The current schema and SQL history have drifted.

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

The current Drizzle schema uses a normal index named `idx_sub_baselines_dog_slot`; the current declaration is not a primary key and is not a unique index.

Status: `CONSTRAINT_DRIFT`.

### 7.3 Composite key mismatch — `routine_stability`

`0003_architecture_upgrade.sql` defines:

`PRIMARY KEY (dog_id, date)`

The current Drizzle schema declares only `idx_routine_stability_dog_date`.

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

The seed corpus is **not lost**.

Seed execution was not part of the disposable baseline validation and remains a separate controlled gate.

---

## 9. Candidate fresh-database validation result

The candidate P0 reconstruction consists of SQL files under:

`backend/db/baseline-draft/`

These files remain outside `backend/db/migrations/` and therefore are not promoted active migration history.

GitHub Actions run `33275173353` / run #7 validated the following against PostgreSQL 16:

1. repository-only migration dependency checks;
2. application of all draft prerequisites;
3. historical `0001`–`0004` application with `ON_ERROR_STOP=1`;
4. full table inventory capture;
5. repeat of the complete sequence against a second empty database;
6. identical table inventory;
7. identical normalized full schema dump;
8. backend dependency-closure build;
9. backend typecheck;
10. backend tests.

Result: **PASS** for disposable fresh-database reconstruction at validated head `536f9150b79081cb9e7b02ae75bf5cc73a37b9ae`.

The full evidence record is:

`docs/control/P0_DB_DISPOSABLE_VALIDATION_EVIDENCE.md`

---

## 10. Fresh database vs existing database — two different problems

### Path A — no persistent database must be preserved

If EMOPET has no existing PostgreSQL instance containing state that must survive this reconciliation, the candidate disposable reconstruction is technically viable as a basis for the next controlled migration-authority step.

Before promotion into active Drizzle history, remaining work includes:

1. resolve known schema/migration drift intentionally;
2. establish the controlled Drizzle migration ledger/metadata strategy;
3. decide whether candidate draft files become active migration history or are consolidated through a controlled generated baseline;
4. rerun disposable validation on the promoted form.

### Path B — an existing database contains data to preserve

If a persistent EMOPET PostgreSQL database already exists, promoting a new baseline from source code alone remains unsafe.

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

## 11. Current decision gate

The next authority choice still depends on:

> **Does an existing EMOPET PostgreSQL database contain data or schema state that must be preserved?**

Possible controlled answers:

### `NO_EXISTING_DB_TO_PRESERVE`

Authorize reconciliation of known schema drift and preparation of a promotable active migration baseline, followed by another disposable validation pass.

### `EXISTING_DB_MUST_BE_PRESERVED`

Require schema evidence before any upgrade/baseline SQL is promoted.

### `UNKNOWN`

Remain blocked from migration-authority promotion. Continue only with non-destructive repository preparation.

Current state: `UNKNOWN`.

---

## 12. Validation gates

### DB-G1 — Empty database apply

`PASS` for the current candidate disposable sequence.

### DB-G2 — Schema parity

`PARTIAL / OPEN`.

Current table-name coverage is proven. Known column/type/constraint drift remains intentionally visible and unresolved.

### DB-G3 — Migration ledger

`OPEN`.

Complete controlled Drizzle migration metadata/history has not yet been established.

### DB-G4 — Repeatability

`PASS` for the current candidate sequence.

A second empty database produced the same table inventory and same normalized full schema dump.

### DB-G5 — Backend compatibility

`PASS` for the validated repository revision.

Dependency-closure build, backend typecheck and backend tests completed successfully.

### DB-G6 — Upgrade compatibility

`NOT TESTED / BLOCKED` pending existing-database authority.

### DB-G7 — Rollback/recovery

`OPEN` pending final migration form and existing-database decision.

---

## 13. P0 maturity statement

Observed evidence now supports:

`DATABASE SCHEMA = OBSERVED`

`HISTORICAL SQL 0001–0004 = OBSERVED / INCOMPLETE AS STANDALONE FRESH BASELINE`

`CANDIDATE DISPOSABLE FRESH-DB RECONSTRUCTION = PASS`

`REPEATABLE DISPOSABLE SCHEMA = VERIFIED FOR CURRENT CANDIDATE SEQUENCE`

`BACKEND BUILD / TYPECHECK / TESTS = PASS FOR VALIDATED RUN`

It does not yet support:

`ACTIVE DRIZZLE MIGRATION BASELINE = APPROVED`

`EXISTING DATABASE UPGRADE = VERIFIED`

`PRODUCTION DATABASE READINESS = ESTABLISHED`

`PRODUCTION MIGRATION = AUTHORIZED`

No Product V1, production, security, deployment or manufacturing maturity is promoted by this reconciliation.

---

## 14. Next controlled action

Establish one of:

- `NO_EXISTING_DB_TO_PRESERVE`, or
- `EXISTING_DB_MUST_BE_PRESERVED` + schema-only evidence.

Until then, candidate SQL remains outside active migration history and PR #3 remains draft.

**DISPOSABLE POSTGRESQL VALIDATION PASSED — NO SILENT MIGRATION, ARCHITECTURE OR MATURITY PROMOTION.**
