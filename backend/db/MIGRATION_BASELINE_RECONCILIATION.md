# EMOPET — Drizzle/PostgreSQL Migration Baseline Reconciliation

**Workstream:** P0 database baseline  
**Branch:** `emopet/p0-db-baseline`  
**Baseline:** `main` at `ce60239e5d53e1b4b98f1bb12e3bf6cf191fe473`  
**Authority decision:** `NO_EXISTING_DB_TO_PRESERVE`  
**Status:** `ACTIVE_BASELINE_PREPARATION_AUTHORIZED`  
**Disposable candidate QA:** `PASS` on GitHub Actions run `33275173353` / run #7  
**Production migration:** `NOT AUTHORIZED`

---

## 1. Purpose

This note records the controlled P0 database reconciliation for EMOPET.

It separates:

1. the current TypeScript/Drizzle schema;
2. the historical SQL chain `0001`–`0004`;
3. the disposable reconstruction evidence;
4. the new active-baseline preparation path.

No production/shared database has been touched.

---

## 2. Controlled database stack

Observed stack:

- PostgreSQL;
- Drizzle ORM;
- `drizzle-kit`;
- Postgres.js;
- schema entrypoint `backend/db/schema/index.ts`;
- backend scripts `db:generate`, `db:migrate`, `db:push`.

`drizzle-kit push` is not accepted as a replacement for controlled migration history.

---

## 3. Historical migration inventory

Historical SQL currently contains:

1. `0001_dataset_registry.sql`
2. `0002_freemium_foundation.sql`
3. `0003_architecture_upgrade.sql`
4. `0004_v6_additions.sql`

The historical folder does not contain a complete Drizzle `meta/` journal/snapshot lineage.

The chain is therefore retained as historical repository evidence, not treated as a proven standalone fresh-database migration ledger.

---

## 4. Proven historical ordering defects

The checked-in historical chain cannot bootstrap an empty PostgreSQL database by itself:

- `0001` alters `breed_sensor_profiles` without an earlier checked-in creation;
- `0003` again assumes `breed_sensor_profiles` and historical morphology columns already exist;
- `0004` alters `devices` without an earlier checked-in creation;
- core identity, dog/device, sensor, community and AI tables are declared in current Drizzle source but lack creation SQL before those historical operations.

This is an observed repository defect, not a production-database statement.

---

## 5. Candidate reconstruction evidence

A compatibility reconstruction was prepared under:

`backend/db/baseline-draft/`

It remains outside active migration history.

GitHub Actions run `33275173353` / run #7 validated the candidate against PostgreSQL 16:

- repository-only migration dependency checks: PASS;
- draft prerequisites: PASS;
- historical `0001`–`0004`: PASS;
- second independent empty database reconstruction: PASS;
- table inventories equal: PASS;
- normalized complete schema dumps equal: PASS;
- backend dependency-closure build: PASS;
- backend typecheck: PASS;
- backend tests: PASS.

Result:

`CANDIDATE_DISPOSABLE_FRESH_DB_RECONSTRUCTION = PASS`

`REPEATABLE_DISPOSABLE_SCHEMA = VERIFIED_FOR_CURRENT_CANDIDATE_SEQUENCE`

This proves the compatibility sequence is reproducible. It does not make that sequence the final active Drizzle ledger.

---

## 6. Authority decision

The project authority has now selected:

`NO_EXISTING_DB_TO_PRESERVE`

Meaning:

- no existing EMOPET PostgreSQL data must survive this P0 baseline reconciliation;
- no upgrade migration for a live/shared database is required as a prerequisite to the fresh-baseline workstream;
- source-controlled reconciliation may proceed toward a clean fresh database baseline.

The decision is recorded separately in:

`docs/control/P0_DB_AUTHORITY_DECISION_NO_EXISTING_DB.md`

This closes the previous `UNKNOWN` authority blocker.

It does **not** authorize production deployment or a production database migration.

---

## 7. Schema drift reconciliation

### 7.1 Device firmware capability fields — resolved

Historical migration `0004` adds:

- `firmware_major`;
- `firmware_minor`;
- `firmware_patch`;
- `supports_v6_features`.

These fields were absent from the Drizzle `devices` declaration.

They are now declared in `backend/db/schema/dogs.ts`.

Status:

`FIRMWARE_COLUMN_DRIFT = RESOLVED_IN_SOURCE_SCHEMA`

### 7.2 ELI composite primary keys — resolved

Historical migration `0003` defines primary keys for:

- `dog_sub_baselines (dog_id, slot)`;
- `routine_stability (dog_id, date)`;
- `user_config (user_id, dog_id, config_key)`.

The prior source schema used ordinary indexes or no equivalent unique constraint.

The Drizzle source now represents these as composite primary keys.

Status:

`ELI_COMPOSITE_KEY_DRIFT = RESOLVED_IN_SOURCE_SCHEMA`

### 7.3 Historical breed_sensor_profiles morphology constraints — not promoted

Migration `0003` expects height/weight morphology columns on `breed_sensor_profiles` that are absent from the current Drizzle model. Current morphology ownership exists separately under `breed_knowledge`.

The compatibility draft temporarily supplies those columns only to replay the historical chain.

They are not silently promoted into the new current schema.

Status:

`LEGACY_MORPHOLOGY_COMPATIBILITY = NOT_CURRENT_SCHEMA_AUTHORITY`

### 7.4 ELI TEXT identifiers versus UUID core identifiers — open

Several ELI tables use `TEXT` identifiers while core `users` and `dogs` use UUID identifiers.

Current Drizzle source and historical SQL agree on the ELI `TEXT` representation, so no migration mismatch is being fabricated here.

The relationship/FK architecture remains a separate open workstream.

Status:

`ELI_IDENTIFIER_RELATIONSHIP = OPEN`

No automatic type rewrite or FK insertion is authorized in this DB baseline slice.

Full record:

`docs/control/P0_DB_SCHEMA_DRIFT_RECONCILIATION.md`

---

## 8. Clean generated-baseline path

Because there is no existing DB to preserve, the preferred active-baseline direction is now a fresh Drizzle-generated ledger from the reconciled current source schema, rather than promoting the compatibility replay as-is.

An isolated generation config exists at:

`backend/db/drizzle.p0-baseline.config.ts`

Its output is isolated from historical SQL:

`backend/db/p0-generated-baseline/`

The GitHub Actions DB workflow now tests:

1. the already proven compatibility reconstruction;
2. fresh Drizzle generation from current schema;
3. Drizzle migration-ledger check;
4. application through `drizzle-kit migrate` to another disposable PostgreSQL database;
5. generated table-inventory parity;
6. second-generation stability (no unexplained follow-on migration);
7. backend build/typecheck/tests.

Generated output remains QA material until a run passes and the exact SQL/metadata is reviewed and intentionally promoted.

---

## 9. Seed corpus

`backend/db/seeds` remains present.

No seed data was deleted or executed by the baseline QA.

Seed loading remains a separate controlled gate.

---

## 10. Validation gates

### DB-G1 — Candidate empty-database apply

`PASS`

### DB-G2 — Candidate repeatability

`PASS`

### DB-G3 — Known source/history drift

`PARTIAL / IN RECONCILIATION`

Firmware-column and composite-key drift are resolved in source. Historical morphology compatibility is explicitly not promoted. ELI identifier relationship remains open.

### DB-G4 — Controlled Drizzle ledger

`IN PROGRESS`

Isolated Drizzle generation/migrate QA is running before promotion.

### DB-G5 — Backend compatibility

`PASS` for candidate validated revision; must remain PASS after generated-baseline reconciliation.

### DB-G6 — Existing database upgrade

`NOT APPLICABLE TO CURRENT P0 PATH`

Reason: controlled decision `NO_EXISTING_DB_TO_PRESERVE`.

This is not a statement that arbitrary future upgrades are safe.

### DB-G7 — Rollback/recovery

`OPEN` pending final promoted ledger form.

---

## 11. Maturity statement

Supported:

`DATABASE SCHEMA = OBSERVED / UNDER CONTROLLED RECONCILIATION`

`NO_EXISTING_DB_TO_PRESERVE = CONTROLLED DECISION`

`HISTORICAL SQL 0001–0004 = OBSERVED / INCOMPLETE AS STANDALONE FRESH BASELINE`

`CANDIDATE DISPOSABLE FRESH-DB RECONSTRUCTION = PASS`

`CANDIDATE REPEATABILITY = VERIFIED`

`FIRMWARE COLUMN DRIFT = RESOLVED IN SOURCE`

`ELI COMPOSITE KEY DRIFT = RESOLVED IN SOURCE`

Not yet supported:

`ACTIVE DRIZZLE MIGRATION BASELINE = APPROVED`

`PRODUCTION DATABASE READINESS = ESTABLISHED`

`PRODUCTION MIGRATION = AUTHORIZED`

No authentication, deployment, Vercel, Unity, Nakama, hardware or manufacturing maturity is promoted here.

---

## 12. Next controlled action

Complete isolated Drizzle generation/migration QA.

If it passes:

1. review the generated SQL and Drizzle metadata;
2. promote only the reviewed generated ledger into the chosen active migration path;
3. rerun disposable migration from the promoted files;
4. document rollback/recovery;
5. leave PR #3 draft until the database slice is ready for explicit review/merge approval.

**FRESH-DB PATH AUTHORIZED — NO SILENT PRODUCTION, ARCHITECTURE OR MATURITY PROMOTION.**
