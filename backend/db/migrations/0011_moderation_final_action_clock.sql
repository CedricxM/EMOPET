-- Provide a canonical retention clock for moderation evidence without
-- inventing historical final-action timestamps or inferring finality from status.
ALTER TABLE "community_reports"
  ADD COLUMN IF NOT EXISTS "final_action_at" timestamptz;

CREATE INDEX IF NOT EXISTS "idx_community_reports_final_action_at"
  ON "community_reports" ("final_action_at");
