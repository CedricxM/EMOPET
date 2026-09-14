-- Migration 0007: Durable Community rules acceptance authority (2026-09-11)
--
-- Adds the smallest durable Community authority needed to stop relying on
-- process-local rules acceptance for Product V1 Community access. This does
-- not activate moderation, reports, blocks, copresence or public discovery.
-- Rules acceptance is server-versioned and account-bound.

BEGIN;

CREATE TABLE IF NOT EXISTS community_rules_acceptances (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  rules_version VARCHAR(64) NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_rules_acceptances_version
  ON community_rules_acceptances(rules_version, accepted_at);

COMMIT;

-- Manual rollback, only for disposable/non-production environments:
--   BEGIN;
--   DROP TABLE IF EXISTS community_rules_acceptances;
--   COMMIT;
