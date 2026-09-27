-- P0-DB path-A parity, class S3 (MIGRATION_BASELINE_RECONCILIATION.md §7.5).
-- Authority: the Drizzle source schema (§8). Two schema-only commits never got a
-- path-A migration:
--   230181c "make active membership canonical" -> uq_community_members_community_user;
--   2940465 "durable summary provenance schema" -> sensor_summaries ingestion_id,
--     device_id (+ FK), firmware_version_at_ingest, uq_sensor_summaries_ingestion_id,
--     idx_sensor_summaries_device_timestamp.
-- Without them, path A accepts duplicate memberships and cannot serve
-- POST /api/sensors/summaries (INSERT ... ON CONFLICT (ingestion_id) DO NOTHING).
--
-- Fail closed, no data rewrite: the unique index fails on duplicate memberships,
-- and the NOT NULL provenance columns fail on a non-empty sensor_summaries, because
-- a historical summary has no ingestion id or device to recover
-- (NO_EXISTING_DB_TO_PRESERVE). Re-running this file, or running it on the
-- Drizzle-generated baseline, leaves the same end state.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_community_members_community_user"
  ON "community_members" ("community_id", "user_id");

ALTER TABLE "sensor_summaries"
  ADD COLUMN IF NOT EXISTS "ingestion_id" uuid NOT NULL;
ALTER TABLE "sensor_summaries"
  ADD COLUMN IF NOT EXISTS "device_id" uuid NOT NULL;
ALTER TABLE "sensor_summaries"
  ADD COLUMN IF NOT EXISTS "firmware_version_at_ingest" varchar(20);

ALTER TABLE "sensor_summaries"
  DROP CONSTRAINT IF EXISTS "sensor_summaries_device_id_devices_id_fk";
ALTER TABLE "sensor_summaries"
  ADD CONSTRAINT "sensor_summaries_device_id_devices_id_fk"
  FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_sensor_summaries_ingestion_id"
  ON "sensor_summaries" ("ingestion_id");
CREATE INDEX IF NOT EXISTS "idx_sensor_summaries_device_timestamp"
  ON "sensor_summaries" ("device_id", "timestamp");

COMMIT;
