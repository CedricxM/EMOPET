-- Community chronological feed candidate under #54 / #98 / #223.
-- Disposable migration evidence only; no production rollout is authorized.
-- Supports community equality + (created_at, id) cursor seek in the same order.
CREATE INDEX IF NOT EXISTS idx_posts_community_created_id
  ON posts (community_id, created_at DESC, id DESC);

-- Rollback (requires a separately reviewed operation):
-- DROP INDEX IF EXISTS idx_posts_community_created_id;
