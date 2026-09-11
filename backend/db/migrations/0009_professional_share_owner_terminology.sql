-- Migration 0009: Owner terminology for professional-share persistence (2026-09-11)
--
-- DOMAIN-TERM #245 Phase C. This is a terminology-only persistence migration:
-- authorization scope, grant lifecycle and recipient policy do not change.
--
-- Historical migration 0006 intentionally remains unchanged as evidence of the
-- schema that existed when it was authored. This migration advances the live
-- schema from guardian_user_id to owner_user_id and renames the matching index.

BEGIN;

ALTER TABLE professional_share_grants
  RENAME COLUMN guardian_user_id TO owner_user_id;

ALTER INDEX IF EXISTS idx_prof_share_grant_guardian_dog
  RENAME TO idx_prof_share_grant_owner_dog;

COMMIT;

-- Rollback, only when reverting this exact migration before dependent changes:
--   BEGIN;
--   ALTER INDEX IF EXISTS idx_prof_share_grant_owner_dog
--     RENAME TO idx_prof_share_grant_guardian_dog;
--   ALTER TABLE professional_share_grants
--     RENAME COLUMN owner_user_id TO guardian_user_id;
--   COMMIT;
