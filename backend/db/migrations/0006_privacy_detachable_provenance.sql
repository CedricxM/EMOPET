-- Privacy-first account-erasure support for approved D1-D4 product decisions.
-- D1 behavioral_assessments.respondent_user_id is already nullable; make deletion detach it.
-- D2-D4 provenance/report identity becomes nullable and detaches on user deletion.
-- community_rules_acceptances, research_data_consents and subscriptions are intentionally untouched.

ALTER TABLE "behavioral_assessments"
  DROP CONSTRAINT IF EXISTS "behavioral_assessments_respondent_user_id_users_id_fk";
ALTER TABLE "behavioral_assessments"
  ADD CONSTRAINT "behavioral_assessments_respondent_user_id_users_id_fk"
  FOREIGN KEY ("respondent_user_id") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "communities" ALTER COLUMN "created_by" DROP NOT NULL;
ALTER TABLE "communities"
  DROP CONSTRAINT IF EXISTS "communities_created_by_users_id_fk";
ALTER TABLE "communities"
  ADD CONSTRAINT "communities_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "community_events" ALTER COLUMN "created_by" DROP NOT NULL;
ALTER TABLE "community_events"
  DROP CONSTRAINT IF EXISTS "community_events_created_by_users_id_fk";
ALTER TABLE "community_events"
  ADD CONSTRAINT "community_events_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "community_reports" ALTER COLUMN "reporter_user_id" DROP NOT NULL;
ALTER TABLE "community_reports"
  DROP CONSTRAINT IF EXISTS "community_reports_reporter_user_id_users_id_fk";
ALTER TABLE "community_reports"
  ADD CONSTRAINT "community_reports_reporter_user_id_users_id_fk"
  FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
