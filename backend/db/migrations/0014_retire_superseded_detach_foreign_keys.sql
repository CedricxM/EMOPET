-- Migration 0014: retire superseded NO ACTION foreign keys that defeat detach (2026-09-28)
--
-- Migrations 0006, 0008 and 0009 implemented the approved D1-D4 decision that
-- identity references detach on account erasure rather than blocking it. Each did
-- so by dropping a constraint under its Drizzle-convention name and re-adding it
-- with ON DELETE SET NULL:
--
--   ALTER TABLE x DROP CONSTRAINT IF EXISTS "x_col_users_id_fk";
--   ALTER TABLE x ADD  CONSTRAINT "x_col_users_id_fk" ... ON DELETE SET NULL;
--
-- But the draft baseline had created those foreign keys under PostgreSQL's own
-- generated name, "x_col_fkey". The DROP therefore matched nothing, the ADD created
-- a SECOND foreign key, and both survived: one NO ACTION, one SET NULL.
--
-- The consequence is not cosmetic. PostgreSQL enforces every foreign key, so the
-- residual NO ACTION constraint blocks the very deletion that SET NULL was added to
-- permit. Measured on a database built from the migration sequence, deleting a user
-- who is a respondent on a behavioural assessment is refused by
-- behavioral_assessments_respondent_user_id_fkey — so the approved detach semantics
-- do not work on that path at all. On the Drizzle-generated schema, where no
-- duplicate exists, the same deletion detaches correctly. CI exercises the generated
-- schema, which is why this stayed invisible.
--
-- This migration drops the five superseded constraints. It is deliberately
-- conservative: each drop happens only when the intended SET NULL counterpart is
-- present, so the column can never be left with no foreign key at all. Nothing is
-- added, no data is touched, and re-running is a no-op.
--
-- Out of scope, recorded rather than fixed here: ten foreign keys on ELI and sensor
-- tables exist in the generated schema and not on the migration path
-- (anticipation_events, baseline_drift_monitor, copresence_events,
-- dog_sub_baselines, recovery_events, routine_stability, user_config, walk_quality).
-- That is a baseline reconciliation question, not a redundant-constraint one, and
-- adding ten constraints to an existing database needs its own decision.

BEGIN;

DO $$
DECLARE
  entry RECORD;
  superseded_name text;
  intended_name text;
  intended_action "char";
BEGIN
  FOR entry IN
    SELECT *
    FROM (VALUES
      ('auth_refresh_sessions',  'auth_refresh_sessions_user_id_fkey',             'auth_refresh_sessions_user_id_users_id_fk'),
      ('behavioral_assessments', 'behavioral_assessments_respondent_user_id_fkey',  'behavioral_assessments_respondent_user_id_users_id_fk'),
      ('communities',            'communities_created_by_fkey',                     'communities_created_by_users_id_fk'),
      ('community_events',       'community_events_created_by_fkey',                'community_events_created_by_users_id_fk'),
      ('community_reports',      'community_reports_reporter_user_id_fkey',         'community_reports_reporter_user_id_users_id_fk')
    ) AS t(table_name, superseded, intended)
  LOOP
    superseded_name := entry.superseded;
    intended_name := entry.intended;

    -- Nothing to do on a database that never had the duplicate, such as a fresh
    -- Drizzle-generated schema.
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = entry.table_name::regclass
        AND conname = superseded_name
        AND contype = 'f'
    ) THEN
      CONTINUE;
    END IF;

    SELECT confdeltype INTO intended_action
    FROM pg_constraint
    WHERE conrelid = entry.table_name::regclass
      AND conname = intended_name
      AND contype = 'f';

    -- Refuse to drop unless the detaching constraint is really there. Dropping the
    -- only foreign key on an identity column would turn a blocked deletion into a
    -- silent orphan, which is worse than the defect being fixed.
    IF intended_action IS NULL THEN
      RAISE EXCEPTION
        'Refusing to drop % because its SET NULL counterpart % is absent',
        superseded_name, intended_name;
    END IF;

    IF intended_action <> 'n' THEN
      RAISE EXCEPTION
        'Refusing to drop % because % has delete action % rather than SET NULL',
        superseded_name, intended_name, intended_action;
    END IF;

    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', entry.table_name, superseded_name);
    RAISE NOTICE 'Dropped superseded foreign key % on %', superseded_name, entry.table_name;
  END LOOP;
END
$$;

COMMIT;

-- ============================================================
-- Rollback (manual, and only if a NO ACTION identity reference is wanted back —
-- note that restoring it re-breaks the approved D1-D4 detach semantics):
--   BEGIN;
--   ALTER TABLE "auth_refresh_sessions"
--     ADD CONSTRAINT "auth_refresh_sessions_user_id_fkey"
--     FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");
--   ALTER TABLE "behavioral_assessments"
--     ADD CONSTRAINT "behavioral_assessments_respondent_user_id_fkey"
--     FOREIGN KEY ("respondent_user_id") REFERENCES "public"."users"("id");
--   ALTER TABLE "communities"
--     ADD CONSTRAINT "communities_created_by_fkey"
--     FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");
--   ALTER TABLE "community_events"
--     ADD CONSTRAINT "community_events_created_by_fkey"
--     FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");
--   ALTER TABLE "community_reports"
--     ADD CONSTRAINT "community_reports_reporter_user_id_fkey"
--     FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id");
--   COMMIT;
-- ============================================================
