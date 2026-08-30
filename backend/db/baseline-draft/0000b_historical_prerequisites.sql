-- EMOPET P0 HISTORICAL PREREQUISITES — DRAFT ONLY
--
-- STATUS: QA_PENDING_DISPOSABLE_POSTGRES_VALIDATION
-- AUTHORITY: NON-EXECUTABLE DRAFT / NOT AN ACTIVE MIGRATION
--
-- The current Drizzle schema no longer declares these morphology columns on
-- breed_sensor_profiles, but checked-in migration 0003 adds CHECK constraints
-- that reference them. They therefore belong to the historical prerequisite
-- state required to replay 0001–0004 from an empty database.
--
-- Keeping this as a separate draft makes the schema/history drift explicit
-- rather than silently pretending the columns are current canonical fields.

BEGIN;

ALTER TABLE breed_sensor_profiles
  ADD COLUMN height_min_cm REAL,
  ADD COLUMN height_max_cm REAL,
  ADD COLUMN weight_min_kg REAL,
  ADD COLUMN weight_max_kg REAL;

COMMIT;

-- These columns are historical replay prerequisites only.
-- Final disposition requires schema-parity review after disposable execution.
