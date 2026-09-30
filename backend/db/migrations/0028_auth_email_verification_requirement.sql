-- AUTH-EMAIL-VERIFY-01 — explicit verification-enforcement boundary
-- Existing rows remain NULL and are not implicitly called verified.
-- New registrations set this timestamp at application level.

ALTER TABLE users
  ADD COLUMN email_verification_required_at timestamptz;

COMMENT ON COLUMN users.email_verification_required_at IS
  'Non-null means normal session issuance requires email_verified_at. NULL preserves legacy-account state pending explicit rollout authority.';
