-- Migration 0004: v6 Additions (2026-04)
--   * dog_sub_baselines: rr_variability + activity_variability stats and
--     recovery_time_to_baseline_minutes tracking
--   * devices: firmware feature-flag columns so backend can adapt to v5/v6
--   * anticipation_events: persists detected anticipation patterns for Bleiz
--   * recovery_events: persists completed recovery episodes (trend_4w_pct)
--
-- Rollback instructions at bottom.

BEGIN;

-- ============================================================
-- 1. Extend dog_sub_baselines with v6 fields
-- ============================================================
ALTER TABLE dog_sub_baselines
  ADD COLUMN IF NOT EXISTS rr_variability_mean FLOAT,
  ADD COLUMN IF NOT EXISTS rr_variability_std FLOAT,
  ADD COLUMN IF NOT EXISTS activity_variability_mean FLOAT,
  ADD COLUMN IF NOT EXISTS activity_variability_std FLOAT,
  ADD COLUMN IF NOT EXISTS recovery_time_mean FLOAT,
  ADD COLUMN IF NOT EXISTS recovery_time_std FLOAT,
  ADD COLUMN IF NOT EXISTS recovery_sample_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovery_trend_4w_pct FLOAT,
  ADD COLUMN IF NOT EXISTS recovery_last_updated TIMESTAMPTZ;

-- ============================================================
-- 2. Per-episode recovery events (drives the 4-week trend)
-- ============================================================
CREATE TABLE IF NOT EXISTS recovery_events (
  id SERIAL PRIMARY KEY,
  dog_id TEXT NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN (
    'deep_rest_mat', 'light_rest_mat',
    'owner_present', 'owner_absent', 'daytime_active'
  )),
  started_at TIMESTAMPTZ NOT NULL,
  returned_to_baseline_at TIMESTAMPTZ NOT NULL,
  recovery_minutes FLOAT NOT NULL,
  peak_arousal FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recovery_events_dog_time
  ON recovery_events (dog_id, returned_to_baseline_at DESC);

-- ============================================================
-- 3. Anticipation events (feeds InferenceResult.anticipation_detected)
-- ============================================================
CREATE TABLE IF NOT EXISTS anticipation_events (
  id SERIAL PRIMARY KEY,
  dog_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'owner_departure', 'walk_time', 'meal_time'
  )),
  predicted_event_time TIMESTAMPTZ NOT NULL,
  pre_event_window_start TIMESTAMPTZ NOT NULL,
  mean_pre_event_odba FLOAT,
  mean_baseline_odba FLOAT,
  activity_ratio FLOAT,
  threshold_met BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_anticipation_events_dog_time
  ON anticipation_events (dog_id, predicted_event_time DESC);

-- ============================================================
-- 4. Firmware capability indicator on devices
-- ============================================================
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS firmware_major INT,
  ADD COLUMN IF NOT EXISTS firmware_minor INT,
  ADD COLUMN IF NOT EXISTS firmware_patch INT,
  ADD COLUMN IF NOT EXISTS supports_v6_features BOOLEAN DEFAULT false;

COMMIT;

-- ============================================================
-- Rollback (manual):
--   BEGIN;
--   DROP TABLE IF EXISTS anticipation_events;
--   DROP TABLE IF EXISTS recovery_events;
--   ALTER TABLE dog_sub_baselines
--     DROP COLUMN IF EXISTS rr_variability_mean,
--     DROP COLUMN IF EXISTS rr_variability_std,
--     DROP COLUMN IF EXISTS activity_variability_mean,
--     DROP COLUMN IF EXISTS activity_variability_std,
--     DROP COLUMN IF EXISTS recovery_time_mean,
--     DROP COLUMN IF EXISTS recovery_time_std,
--     DROP COLUMN IF EXISTS recovery_sample_count,
--     DROP COLUMN IF EXISTS recovery_trend_4w_pct,
--     DROP COLUMN IF EXISTS recovery_last_updated;
--   ALTER TABLE devices
--     DROP COLUMN IF EXISTS firmware_major,
--     DROP COLUMN IF EXISTS firmware_minor,
--     DROP COLUMN IF EXISTS firmware_patch,
--     DROP COLUMN IF EXISTS supports_v6_features;
--   COMMIT;
