\set ON_ERROR_STOP on

-- This fixture runs after baseline-draft prerequisites but before migration 0001.
DO $$
BEGIN
  IF to_regclass('public.dataset_registry') IS NOT NULL THEN
    RAISE EXCEPTION 'full-chain rehearsal did not start before migration 0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public'
       AND table_name='sensor_summaries'
       AND column_name='ingestion_id'
  ) THEN
    RAISE EXCEPTION 'full-chain rehearsal unexpectedly started with 0012 provenance columns';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public'
       AND table_name='devices'
       AND column_name='supports_v6_features'
  ) THEN
    RAISE EXCEPTION 'full-chain rehearsal unexpectedly started with 0004 device capability fields';
  END IF;
END $$;

INSERT INTO users (id, email, password_hash, name, locale, onboarding_complete, created_at, updated_at)
VALUES (
  '72000000-0000-4000-8000-000000000001'::uuid,
  'full-chain@emopet.invalid',
  'test-only-full-chain-fixture',
  'Full Chain Owner',
  'fr',
  true,
  '2026-08-01T08:00:00Z',
  '2026-08-02T08:00:00Z'
);

INSERT INTO dogs (
  id, owner_id, name, breed, birth_date, sex, weight, fur_class, created_at, updated_at
)
VALUES (
  '72000000-0000-4000-8000-000000000101'::uuid,
  '72000000-0000-4000-8000-000000000001'::uuid,
  'Full Chain Dog',
  'Test Breed',
  '2021-02-03',
  'female',
  21.25,
  'FC2',
  '2026-08-01T08:05:00Z',
  '2026-08-02T08:05:00Z'
);

INSERT INTO devices (
  id, dog_id, type, mac_address, firmware_version, last_seen_at, created_at
)
VALUES (
  '72000000-0000-4000-8000-000000000201'::uuid,
  '72000000-0000-4000-8000-000000000101'::uuid,
  'TAG',
  '02:00:00:72:00:01',
  '0.9.0',
  '2026-08-03T10:00:00Z',
  '2026-08-01T08:10:00Z'
);

INSERT INTO sensor_summaries (
  id,
  dog_id,
  timestamp,
  source,
  activity_minutes,
  distance_km,
  vocal_events,
  temperature_c,
  humidity_pct,
  created_at
)
VALUES (
  '72000000-0000-4000-8000-000000000301'::uuid,
  '72000000-0000-4000-8000-000000000101'::uuid,
  '2026-08-03T09:00:00Z',
  'TAG',
  22.5,
  2.125,
  3,
  20.75,
  61.0,
  '2026-08-03T09:00:04Z'
);
