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

### 7.4 ELI TEXT identifiers versus UUID core identifiers — resolved (2026-09-28)

Several ELI tables use `TEXT` identifiers while core `users` and `dogs` use UUID identifiers.

Current Drizzle source and historical SQL agree on the ELI `TEXT` representation, so no migration mismatch is being fabricated here.

The relationship/FK architecture remains a separate open workstream.

Status:

`ELI_IDENTIFIER_RELATIONSHIP = OPEN` (superseded 2026-09-28, see the update below)

No automatic type rewrite or FK insertion is authorized in this DB baseline slice.

Update 2026-09-28. The text above predates `bbf9771` (ID-01, "reconstruct canonical ELI identity", 2026-09-20), which moved the Drizzle ELI `dog_id` columns and `user_config.user_id` to UUID with `NO ACTION` FKs to `dogs(id)` / `users(id)`, gated by `backend/test/id-01-referential-integrity.sql` on the generated baseline only. Source and historical SQL therefore no longer agreed. The project owner explicitly authorized the path-A type rewrite and FK insertion on 2026-09-28; active migration `0024_path_a_eli_canonical_identity.sql` replays ID-01 on path A and fails closed on non-UUID or orphan identifiers (verified: full rollback). ID-01 now runs on both databases.

Status:

`ELI_IDENTIFIER_RELATIONSHIP = RESOLVED — ID-01 in source (bbf9771), path A by 0024 (DISPOSABLE QA)`

### 7.5 Path-A constraint/index drift — gated (2026-09-27)

Table-inventory parity cannot see constraints or indexes. Comparing `pg_get_constraintdef` and `pg_indexes.indexdef` between path A (baseline-draft + active migrations, `psql`) and the generated baseline (`drizzle-kit migrate` + `0015`) on disposable PostgreSQL 16.15 found 202 differing lines on `main`.

Resolved by active migration `0021_path_a_constraint_index_parity.sql`:

- five shadow `NO ACTION` FKs. The baseline drafts declare these references inline, so PostgreSQL named them `<table>_<column>_fkey`; `0006` (approved D1–D4 DETACH, #446) and `0009` (approved refresh-session detach) only dropped the Drizzle name before re-adding `SET NULL`. Affected: `behavioral_assessments.respondent_user_id` (D1), `communities.created_by` (D2), `community_events.created_by` (D3), `community_reports.reporter_user_id` (D4), `auth_refresh_sessions.user_id`. On path A, deleting a reporter account raised `foreign_key_violation` before `0021` and detached after it;
- `idx_community_reports_content`: `0000d` carried an extra `id DESC` key; aligned to the Drizzle declaration `(content_type, content_id, created_at DESC)`. No query orders by `id` on that access path.
- `device_identity_credentials.device_id` (Device Trust `0020`, #662, merged after the gate was drafted): the inline reference gave path A `device_identity_credentials_device_id_fkey`; renamed to the Drizzle name `device_identity_credentials_device_id_devices_id_fk`. Same `NO ACTION` definition. It was the first new drift the gate caught, and was fixed rather than ledgered.

Resolved by active migration `0022_path_a_membership_and_summary_provenance.sql` (former class S3). Two schema-only commits never got a path-A migration:

- `230181c` (canonical membership): `uq_community_members_community_user`. Path A accepted duplicate memberships;
- `2940465` (durable summary provenance): `sensor_summaries.ingestion_id`, `device_id` (+ FK), `firmware_version_at_ingest`, `uq_sensor_summaries_ingestion_id`, `idx_sensor_summaries_device_timestamp`. Path A lacked the columns themselves, so `POST /api/sensors/summaries` (`ON CONFLICT (ingestion_id) DO NOTHING`) could not run on it.

`0022` fails closed instead of rewriting data: duplicate memberships abort the unique index, and existing summary rows abort the `NOT NULL` provenance columns (no ingestion id or device can be recovered for them). Both aborts were verified to roll back the whole migration.

Resolved by active migration `0023_path_a_integrity_and_index_parity.sql` (former classes S4–S6 and the non-ELI part of S1):

- `3f51896` (INT-06F, canonical copresence dog identity) bound `copresence_events.dog_a_id`/`dog_b_id` to `dogs(id)` in the Drizzle schema, the privacy topology and CI, without a path-A migration. Path A accepted copresence events for dogs that do not exist; `0023` adds both `NO ACTION` FKs and fails closed on such rows (verified: full rollback);
- `idx_breed_canonical_slug` (duplicate of the `breed_slug` unique constraint) and `idx_breed_canonical_fci` (no query uses it), both from `0001`, are dropped;
- `idx_anticipation_events_dog_time` and `idx_recovery_events_dog_time` are rebuilt ascending, as declared in Drizzle. A B-tree serves both scan directions, so no query changes;
- `imu_discrimination_thresholds` and `weather_context` now enforce uniqueness through the Drizzle unique indexes `uq_discrimination` and `uq_weather_location_date`; each index is created before the inline `UNIQUE` constraint is dropped. `onConflictDoNothing()` in `weather.ts` targets no named constraint.

Resolved by active migration `0024_path_a_eli_canonical_identity.sql` (former S1 ELI part and column class C1): ID-01 canonical ELI identity, see §7.4.

Resolved in source schema:

- four `0003` vocabulary CHECKs are now declared in `eli-v5.ts` under their historical names: `dog_sub_baselines_slot_check` and `recovery_events_slot_check` (the five slots of `SubBaselineSlot` in `packages/shared`), `anticipation_events_event_type_check` (`AnticipationEventType`) and `user_config_source_check` (the values documented on the Drizzle column). `routine_stability_rsi_trend_check` is deliberately not promoted: RSI is a historical composite score surface that current authority does not extend;
- `eli_behavioral_priors.mapping_authority_id`: the Drizzle FK now uses the name that active migration `0015` guards on (`fk_eli_behavioral_prior_mapping_authority`). The CI composition (generated baseline + `0015`) previously held two identical FKs.
- `device_identity_credentials.psa_key_id` (column type): `0020` (#662) declares `bigint`, the Drizzle schema declared `integer`. The source schema now uses `bigint` (`mode: 'number'`). `psa_key_id_t` is `uint32_t`, which `integer` cannot hold in full, and the same table already maps its other `uint32` field, `credential_version`, to `bigint` on both paths. The CHECK still admits only 65536 and 65537, and the TypeScript type stays `number`.

Gated, not resolved. Recorded entry by entry in `backend/test/schema-constraint-index-parity.known-drift.txt` (164 lines):

| Class | Count | Difference | Status |
|---|---|---|---|
| S1 | 0 | FK declared in Drizzle, absent from path A | RESOLVED by `0023` (copresence) and `0024` (ELI, §7.4) |
| S2 | 4 | CHECK in historical SQL, absent from Drizzle: `routine_stability_rsi_trend_check` and 3 morphology checks (4 ELI vocabulary checks promoted in source) | NOT PROMOTED — RSI historical score surface; morphology `NOT_CURRENT_SCHEMA_AUTHORITY` (§7.3) |
| S3 | 0 | unique/index in Drizzle, absent from path A | RESOLVED by `0022` |
| S4 | 0 | `breed_canonical` indexes from `0001`, absent from Drizzle | RESOLVED by `0023` |
| S5 | 0 | same index name, `DESC` key only in path A | RESOLVED by `0023` |
| S6 | 0 | uniqueness as a constraint in path A, as a unique index in Drizzle | RESOLVED by `0023` (also removes 2 N pairs) |
| N | 80 pairs | identical definition, different name (`_fkey`/`_key`/`_pkey`/`<col>_check` vs Drizzle names) | OPEN — a future `DROP CONSTRAINT IF EXISTS <drizzle name>` misses path A |

The CI step `P0-DB constraint/index parity (path A vs generated)` fails when the observed drift differs from the ledger in either direction: new drift, or a resolved entry left in the ledger. The fingerprint SQL separately rejects any duplicate FK on the same columns; that class is never ledgered.

Column drift is gated separately. S3 showed that a missing index can hide missing columns, and #662 added a column-type drift that constraint/index parity cannot see. `backend/test/schema-column-parity.sql` prints one line per column (`format_type`, nullability, default, identity/generation); the CI step `P0-DB column parity (path A vs generated)` compares it with `backend/test/schema-column-parity.known-drift.txt` (4 lines, 1 table) under the same two-direction rule:

| Class | Count | Difference | Status |
|---|---|---|---|
| C1 | 0 | ELI identifiers (`dog_id`, `user_config.user_id`): `text` in `0003`, `uuid` in Drizzle | RESOLVED by `0024` (§7.4) |
| C2 | 0 | bare `FLOAT` in `0001` (`imu_*`) and `0003` (ELI tables) resolves to `double precision`; Drizzle declared `real()` | RESOLVED in source schema (`doublePrecision()`) |
| C3 | 4 | `breed_sensor_profiles` height/weight morphology columns, path A only | `NOT_CURRENT_SCHEMA_AUTHORITY` (§7.3) |

C2 (36 columns in `eli-v5.ts` and `datasets.ts`) is resolved in the source schema, as in §7.1/§7.2: the Drizzle columns now use `doublePrecision()`, the type the historical SQL already declared. The values are computed as JavaScript float64; `real` (float4, about 7 significant digits) would have silently rounded them on every write, so a stored baseline, drift sigma or threshold could no longer be reproduced from its inputs. No migration: path A was already `double precision`, and the TypeScript type stays `number`.

Status:

`SHADOW_FK_AND_REPORT_INDEX_DRIFT = RESOLVED_BY_0021 (DISPOSABLE QA)`

`S3_MEMBERSHIP_AND_SUMMARY_PROVENANCE_DRIFT = RESOLVED_BY_0022 (DISPOSABLE QA)`

`DEVICE_IDENTITY_PSA_KEY_ID_TYPE_DRIFT = RESOLVED_IN_SOURCE_SCHEMA`

`COPRESENCE_FK_AND_INDEX_FORM_DRIFT = RESOLVED_BY_0023 (DISPOSABLE QA)`

`ELI_CANONICAL_IDENTITY_DRIFT = RESOLVED_BY_0024 (DISPOSABLE QA)`

`REMAINING_CONSTRAINT_INDEX_DRIFT = GATED — S2 not promoted (RSI, §7.3 morphology); N name-only pairs`

`ELI_IMU_FLOAT_PRECISION_DRIFT = RESOLVED_IN_SOURCE_SCHEMA`

`REMAINING_COLUMN_DRIFT = GATED — C3 morphology only (§7.3)`

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
6. constraint/index parity against the classified drift ledger (§7.5);
7. column parity against the classified drift ledger (§7.5);
8. second-generation stability (no unexplained follow-on migration);
9. backend build/typecheck/tests.

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

Firmware-column and composite-key drift are resolved in source. Historical morphology compatibility is explicitly not promoted. ELI identifier relationship is resolved by ID-01 in source and `0024` on path A. Path-A shadow FKs and the `community_reports` index drift are resolved by `0021`, membership uniqueness and sensor-summary provenance by `0022`, copresence FKs and index forms by `0023`, ELI canonical identity by `0024`; `psa_key_id` type drift is resolved in source; remaining constraint/index and column drift is gated and classified (§7.5).

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
