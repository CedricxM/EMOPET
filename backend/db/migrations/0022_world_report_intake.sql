-- WORLD-SOCIAL-01 / #594 - World report intake in the canonical moderation queue.
-- World reports reuse community_reports so they inherit moderation-evidence
-- retention (final_action_at clock) and the approved reporter DETACH (#446).
-- subject_user_id names the reported person; its account-erasure disposition is
-- TO_CONFIRM, so the reference keeps PostgreSQL NO ACTION (nothing inferred).
-- World message content is never persisted (decision #48 L6): only its id is kept.

BEGIN;

ALTER TABLE community_reports ALTER COLUMN content_id DROP NOT NULL;
ALTER TABLE community_reports ALTER COLUMN community_id DROP NOT NULL;

ALTER TABLE community_reports ADD COLUMN IF NOT EXISTS subject_user_id UUID;
ALTER TABLE community_reports
  DROP CONSTRAINT IF EXISTS community_reports_subject_user_id_users_id_fk;
ALTER TABLE community_reports
  ADD CONSTRAINT community_reports_subject_user_id_users_id_fk
  FOREIGN KEY (subject_user_id) REFERENCES users(id);

ALTER TABLE community_reports DROP CONSTRAINT IF EXISTS chk_community_reports_target_shape;
ALTER TABLE community_reports ADD CONSTRAINT chk_community_reports_target_shape CHECK (
  (content_type IN ('post', 'comment') AND content_id IS NOT NULL AND community_id IS NOT NULL AND subject_user_id IS NULL)
  OR (content_type = 'world_user' AND subject_user_id IS NOT NULL AND content_id IS NULL AND community_id IS NULL)
  OR (content_type = 'world_message' AND subject_user_id IS NOT NULL AND content_id IS NOT NULL AND community_id IS NULL)
);

ALTER TABLE community_reports DROP CONSTRAINT IF EXISTS chk_community_reports_not_self;
ALTER TABLE community_reports ADD CONSTRAINT chk_community_reports_not_self CHECK (
  reporter_user_id IS NULL OR subject_user_id IS NULL OR reporter_user_id <> subject_user_id
);

CREATE INDEX IF NOT EXISTS idx_community_reports_subject_created
  ON community_reports (subject_user_id, created_at DESC);

COMMIT;
