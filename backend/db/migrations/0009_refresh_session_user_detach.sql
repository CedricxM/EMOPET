-- EMOPET-REPLAY-PROVENANCE: original=0008_refresh_session_user_detach.sql; source_commit=dfffd871a85b4b5510a00dba76238a56d3fa04a9; source_blob=c0758fdd51aaf2d42649fdf52ac75dd43d912408
-- Support the already-approved phased account-erasure semantics for refresh sessions.
-- The user binding can detach when the account root is deleted, while the session
-- record remains bounded by its original expiry for reuse/security evidence.
-- Detached sessions must never authenticate or rotate.

ALTER TABLE "auth_refresh_sessions" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "auth_refresh_sessions"
  DROP CONSTRAINT IF EXISTS "auth_refresh_sessions_user_id_users_id_fk";
ALTER TABLE "auth_refresh_sessions"
  ADD CONSTRAINT "auth_refresh_sessions_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
