-- P0-DB path-A constraint/index parity repair (2026-09-27).
-- Authority: the Drizzle source schema (MIGRATION_BASELINE_RECONCILIATION.md §8).
--
-- 1. The baseline-draft files declare these user references inline, so PostgreSQL
--    named them <table>_<column>_fkey (NO ACTION). Migrations 0006 (approved D1-D4
--    DETACH, #446) and 0009 (approved refresh-session detach) only dropped the
--    Drizzle-named <table>_<column>_users_id_fk before re-adding it as SET NULL, so
--    path A kept both constraints and the NO ACTION one still blocked account
--    deletion. Same repair as 0010 for devices_dog_id_fkey: drop the baseline name,
--    then re-assert the single canonical SET NULL constraint.
-- 2. idx_community_reports_content carried an extra "id DESC" key in
--    0000d_community_durable_core.sql; the Drizzle schema declares
--    (content_type, content_id, created_at DESC) and no query orders by id there.
-- 3. 0020_device_identity_credentials.sql (#662) declares device_id inline too, so
--    path A named that FK device_identity_credentials_device_id_fkey while the
--    Drizzle schema names it ..._device_id_devices_id_fk. Same NO ACTION definition;
--    only the name is aligned, so a later DROP CONSTRAINT IF EXISTS by the Drizzle
--    name cannot miss path A.
--
-- Databases built from the Drizzle-generated baseline never had the _fkey names;
-- there the statements below re-create the same constraints and index.
-- Gate: backend/test/schema-constraint-index-parity.sql (P0 workflow).

BEGIN;

-- D1: behavioral_assessments.respondent_user_id
ALTER TABLE "behavioral_assessments"
  DROP CONSTRAINT IF EXISTS "behavioral_assessments_respondent_user_id_fkey";
ALTER TABLE "behavioral_assessments"
  DROP CONSTRAINT IF EXISTS "behavioral_assessments_respondent_user_id_users_id_fk";
ALTER TABLE "behavioral_assessments"
  ADD CONSTRAINT "behavioral_assessments_respondent_user_id_users_id_fk"
  FOREIGN KEY ("respondent_user_id") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

-- D2: communities.created_by
ALTER TABLE "communities"
  DROP CONSTRAINT IF EXISTS "communities_created_by_fkey";
ALTER TABLE "communities"
  DROP CONSTRAINT IF EXISTS "communities_created_by_users_id_fk";
ALTER TABLE "communities"
  ADD CONSTRAINT "communities_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

-- D3: community_events.created_by
ALTER TABLE "community_events"
  DROP CONSTRAINT IF EXISTS "community_events_created_by_fkey";
ALTER TABLE "community_events"
  DROP CONSTRAINT IF EXISTS "community_events_created_by_users_id_fk";
ALTER TABLE "community_events"
  ADD CONSTRAINT "community_events_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

-- D4: community_reports.reporter_user_id
ALTER TABLE "community_reports"
  DROP CONSTRAINT IF EXISTS "community_reports_reporter_user_id_fkey";
ALTER TABLE "community_reports"
  DROP CONSTRAINT IF EXISTS "community_reports_reporter_user_id_users_id_fk";
ALTER TABLE "community_reports"
  ADD CONSTRAINT "community_reports_reporter_user_id_users_id_fk"
  FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

-- Refresh-session detach (0009): auth_refresh_sessions.user_id
ALTER TABLE "auth_refresh_sessions"
  DROP CONSTRAINT IF EXISTS "auth_refresh_sessions_user_id_fkey";
ALTER TABLE "auth_refresh_sessions"
  DROP CONSTRAINT IF EXISTS "auth_refresh_sessions_user_id_users_id_fk";
ALTER TABLE "auth_refresh_sessions"
  ADD CONSTRAINT "auth_refresh_sessions_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

-- Device Trust (0020, #662): device_identity_credentials.device_id, name only
ALTER TABLE "device_identity_credentials"
  DROP CONSTRAINT IF EXISTS "device_identity_credentials_device_id_fkey";
ALTER TABLE "device_identity_credentials"
  DROP CONSTRAINT IF EXISTS "device_identity_credentials_device_id_devices_id_fk";
ALTER TABLE "device_identity_credentials"
  ADD CONSTRAINT "device_identity_credentials_device_id_devices_id_fk"
  FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

DROP INDEX IF EXISTS "idx_community_reports_content";
CREATE INDEX "idx_community_reports_content"
  ON "community_reports" ("content_type", "content_id", "created_at" DESC NULLS FIRST);

COMMIT;
