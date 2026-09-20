-- INT-06 durable Community core fresh-baseline preparation.
-- This file is deliberately outside backend/db/migrations/.
-- It does not allocate or reserve an active migration number.

CREATE TABLE IF NOT EXISTS community_rules_acceptances (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  rules_version varchar(64) NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid NOT NULL REFERENCES users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  content_type varchar(20) NOT NULL DEFAULT 'post',
  content_id uuid NOT NULL,
  community_id uuid NOT NULL,
  reason varchar(20) NOT NULL,
  details varchar(500),
  status varchar(20) NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_community_created_id
  ON posts (community_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_community_reports_reporter_created
  ON community_reports (reporter_user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_community_reports_content
  ON community_reports (content_type, content_id, created_at DESC, id DESC);
