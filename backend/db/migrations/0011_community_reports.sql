-- Migration 0011: Durable Community UGC report candidate (2026-09-12)
--
-- COMMUNITY-API-01 moderation intake foundation. Persists authenticated reports
-- for posts in communities the reporter currently belongs to. This does NOT
-- claim that moderation triage, adjudication, notification, retention, erasure,
-- or user blocking are production-ready.
--
-- content_id/community_id are stored as moderation snapshots rather than hard
-- foreign keys so later post/community deletion or anonymisation policy does not
-- silently erase or block moderation evidence before that policy is approved.

BEGIN;

CREATE TABLE IF NOT EXISTS community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL REFERENCES users(id),
  content_type VARCHAR(20) NOT NULL DEFAULT 'post',
  content_id UUID NOT NULL,
  community_id UUID NOT NULL,
  reason VARCHAR(20) NOT NULL,
  details VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_reports_reporter_created
  ON community_reports(reporter_user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_community_reports_content
  ON community_reports(content_type, content_id, created_at DESC);

COMMIT;

-- Manual rollback, only for disposable/non-production environments:
--   BEGIN;
--   DROP TABLE IF EXISTS community_reports;
--   COMMIT;
