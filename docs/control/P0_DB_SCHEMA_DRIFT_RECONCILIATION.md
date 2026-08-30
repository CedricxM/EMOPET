# EMOPET — P0 Database Schema Drift Reconciliation

**Workstream:** P0 database baseline  
**Authority decision:** `NO_EXISTING_DB_TO_PRESERVE`  
**Branch:** `emopet/p0-db-baseline`

## Objective

Reconcile the current TypeScript/Drizzle model with repository-supported historical SQL where the intent is clear, while refusing to invent a production database contract from stale migrations.

## Resolved in this slice

### Device firmware capability fields

Historical migration `0004_v6_additions.sql` explicitly adds:

- `firmware_major`
- `firmware_minor`
- `firmware_patch`
- `supports_v6_features`

These fields are also consistent with the repository's v6 firmware/protocol lineage. The Drizzle `devices` declaration was missing them.

Resolution:

`DRIZZLE_SCHEMA_ALIGNED_TO_EXISTING_V6_SQL`

The fields are now declared in `backend/db/schema/dogs.ts`.

### ELI composite keys

Historical migration `0003_architecture_upgrade.sql` defines composite primary keys for:

- `dog_sub_baselines (dog_id, slot)`
- `routine_stability (dog_id, date)`
- `user_config (user_id, dog_id, config_key)`

The prior Drizzle declarations used non-unique indexes or no equivalent constraint.

Resolution:

`DRIZZLE_SCHEMA_ALIGNED_TO_EXISTING_PRIMARY_KEY_CONTRACT`

The three composite keys are now represented with Drizzle `primaryKey(...)` declarations.

## Intentionally not promoted

### Historical breed_sensor_profiles morphology constraints

Migration `0003` applies morphology constraints to columns such as `height_min_cm`, `height_max_cm`, `weight_min_kg`, and `weight_max_kg` on `breed_sensor_profiles`.

The current Drizzle `breed_sensor_profiles` model does not own those columns. Current morphology fields exist in the separate `breed_knowledge` model.

The disposable candidate needed temporary prerequisite columns only so the historical chain could be replayed as evidence.

For a new active baseline, those temporary compatibility columns/constraints are **not automatically promoted** into the current Drizzle model.

Status:

`LEGACY_COMPATIBILITY_ONLY / NOT_CURRENT_SCHEMA_AUTHORITY`

### ELI text identifiers versus UUID core identifiers

Current Drizzle and historical SQL both use `TEXT` identifiers for several ELI-v5 tables while core `users` and `dogs` use UUID identifiers.

Because both current source schema and historical SQL agree on the ELI text representation, this is not treated as a migration mismatch in this slice.

It remains an architectural relationship issue to be handled separately if/when ELI tables are formally bound to core ownership FKs.

Status:

`OPEN_ARCHITECTURE_RELATIONSHIP_RECONCILIATION`

No automatic type rewrite or foreign-key insertion is authorized here.

## Active-baseline strategy under test

The repository now contains an isolated Drizzle generation config:

`backend/db/drizzle.p0-baseline.config.ts`

It writes only to:

`backend/db/p0-generated-baseline/`

GitHub Actions is being used to:

1. generate a fresh Drizzle baseline from the reconciled current schema;
2. validate the generated migration ledger;
3. apply it through `drizzle-kit migrate` to a third disposable PostgreSQL database;
4. compare table inventory with the already validated candidate reconstruction;
5. run generation again to prove the generated snapshot is stable;
6. run backend build, typecheck and tests.

The generated directory is still QA output until the run passes and its exact files are reviewed.

## Maturity

`NO_EXISTING_DB_TO_PRESERVE = CONTROLLED DECISION`

`KNOWN FIRMWARE COLUMN DRIFT = RESOLVED IN SOURCE SCHEMA`

`KNOWN COMPOSITE KEY DRIFT = RESOLVED IN SOURCE SCHEMA`

`HISTORICAL MORPHOLOGY COMPATIBILITY = NOT PROMOTED`

`ELI TEXT/UUID RELATIONSHIP = OPEN`

`ACTIVE DRIZZLE BASELINE = OPEN / UNDER DISPOSABLE VALIDATION`

No production database, deployment, seed execution, authentication, Unity, Nakama or Vercel maturity is promoted by this document.