-- P0-DB path-A replay of ID-01 canonical ELI identity
-- (MIGRATION_BASELINE_RECONCILIATION.md §7.4/§7.5, classes C1 and S1).
-- Authority: the Drizzle source schema (§8); authorized by the project owner
-- on 2026-09-28.
--
-- bbf9771 ("reconstruct canonical ELI identity", 2026-09-20) moved the ELI
-- tables' dog_id, and user_config.user_id, from TEXT to the core UUID
-- identities with NO ACTION FKs to dogs(id) / users(id). It changed the Drizzle
-- schema and added backend/test/id-01-referential-integrity.sql, run on the
-- generated baseline only; path A kept the 0003 TEXT columns without FKs, so
-- ELI rows could name dogs and users that do not exist.
--
-- Fails closed, no data rewrite: a non-UUID identifier aborts the type change,
-- and an identifier with no matching dog or user aborts the FK. Re-running this
-- file, or running it on the Drizzle-generated baseline, leaves the same end
-- state.
-- Gates: schema-column-parity.sql, schema-constraint-index-parity.sql and
-- id-01-referential-integrity.sql on both paths (P0 workflow).

BEGIN;

ALTER TABLE "dog_sub_baselines" ALTER COLUMN "dog_id" TYPE uuid USING "dog_id"::uuid;
ALTER TABLE "recovery_events" ALTER COLUMN "dog_id" TYPE uuid USING "dog_id"::uuid;
ALTER TABLE "anticipation_events" ALTER COLUMN "dog_id" TYPE uuid USING "dog_id"::uuid;
ALTER TABLE "baseline_drift_monitor" ALTER COLUMN "dog_id" TYPE uuid USING "dog_id"::uuid;
ALTER TABLE "walk_quality" ALTER COLUMN "dog_id" TYPE uuid USING "dog_id"::uuid;
ALTER TABLE "routine_stability" ALTER COLUMN "dog_id" TYPE uuid USING "dog_id"::uuid;
ALTER TABLE "user_config" ALTER COLUMN "dog_id" TYPE uuid USING "dog_id"::uuid;
ALTER TABLE "user_config" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;

ALTER TABLE "dog_sub_baselines"
  DROP CONSTRAINT IF EXISTS "dog_sub_baselines_dog_id_dogs_id_fk";
ALTER TABLE "dog_sub_baselines"
  ADD CONSTRAINT "dog_sub_baselines_dog_id_dogs_id_fk"
  FOREIGN KEY ("dog_id") REFERENCES "public"."dogs"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "recovery_events"
  DROP CONSTRAINT IF EXISTS "recovery_events_dog_id_dogs_id_fk";
ALTER TABLE "recovery_events"
  ADD CONSTRAINT "recovery_events_dog_id_dogs_id_fk"
  FOREIGN KEY ("dog_id") REFERENCES "public"."dogs"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "anticipation_events"
  DROP CONSTRAINT IF EXISTS "anticipation_events_dog_id_dogs_id_fk";
ALTER TABLE "anticipation_events"
  ADD CONSTRAINT "anticipation_events_dog_id_dogs_id_fk"
  FOREIGN KEY ("dog_id") REFERENCES "public"."dogs"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "baseline_drift_monitor"
  DROP CONSTRAINT IF EXISTS "baseline_drift_monitor_dog_id_dogs_id_fk";
ALTER TABLE "baseline_drift_monitor"
  ADD CONSTRAINT "baseline_drift_monitor_dog_id_dogs_id_fk"
  FOREIGN KEY ("dog_id") REFERENCES "public"."dogs"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "walk_quality"
  DROP CONSTRAINT IF EXISTS "walk_quality_dog_id_dogs_id_fk";
ALTER TABLE "walk_quality"
  ADD CONSTRAINT "walk_quality_dog_id_dogs_id_fk"
  FOREIGN KEY ("dog_id") REFERENCES "public"."dogs"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "routine_stability"
  DROP CONSTRAINT IF EXISTS "routine_stability_dog_id_dogs_id_fk";
ALTER TABLE "routine_stability"
  ADD CONSTRAINT "routine_stability_dog_id_dogs_id_fk"
  FOREIGN KEY ("dog_id") REFERENCES "public"."dogs"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "user_config"
  DROP CONSTRAINT IF EXISTS "user_config_dog_id_dogs_id_fk";
ALTER TABLE "user_config"
  ADD CONSTRAINT "user_config_dog_id_dogs_id_fk"
  FOREIGN KEY ("dog_id") REFERENCES "public"."dogs"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "user_config"
  DROP CONSTRAINT IF EXISTS "user_config_user_id_users_id_fk";
ALTER TABLE "user_config"
  ADD CONSTRAINT "user_config_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT;
