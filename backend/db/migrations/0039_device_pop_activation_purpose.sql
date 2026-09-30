-- DEVICE-TRUST-ID-16 — separate manufacturing PoP purpose from telemetry.
-- Extends replay-state purpose only. No route, activation or Device Data Trust grant.

ALTER TABLE device_pop_challenges
  DROP CONSTRAINT chk_device_pop_challenges_purpose;

ALTER TABLE device_pop_challenges
  ADD CONSTRAINT chk_device_pop_challenges_purpose
  CHECK (
    purpose IN (
      'DEVICE_DATA_TELEMETRY_INGRESS',
      'DEVICE_CREDENTIAL_ACTIVATION'
    )
  );
