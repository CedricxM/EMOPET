-- DEVICE-TRUST-ID-16 — domain-separated manufacturing PoP purpose
-- Extends the durable replay store without changing telemetry authority.

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
