-- Migration 0010: Durable authenticated Contact request candidate (2026-09-12)
--
-- CONTACT-AUTH-01 Phase B/C foundation. Replaces caller-controlled contact
-- owner tokens with the canonical authenticated core-user UUID and moves the
-- smallest Owner-facing support intake state onto PostgreSQL.
--
-- This migration does NOT authorize production enablement, staff/admin access,
-- retention/purge, rights workflows, or storage of a separate phone/email
-- contact value. Those remain explicit CONTACT-AUTH-01 gates.

BEGIN;

CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID NOT NULL REFERENCES users(id),
  reason VARCHAR(40) NOT NULL,
  message VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  consent_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_requests_requester_created
  ON contact_requests(requester_user_id, created_at DESC, id DESC);

COMMIT;

-- Manual rollback, only for disposable/non-production environments:
--   BEGIN;
--   DROP TABLE IF EXISTS contact_requests;
--   COMMIT;
