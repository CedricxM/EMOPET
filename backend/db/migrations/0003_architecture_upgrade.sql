-- Migration 0003: Architecture Upgrade (Config, ELI v5 tables, constraints)

-- ============================================================
-- 1. Constraints on breed_sensor_profiles
-- ============================================================
ALTER TABLE breed_sensor_profiles
  ADD CONSTRAINT chk_height CHECK (height_min_cm > 0 AND height_max_cm > height_min_cm AND height_max_cm < 120),
  ADD CONSTRAINT chk_weight CHECK (weight_min_kg > 0 AND weight_max_kg > weight_min_kg AND weight_max_kg < 120),
  ADD CONSTRAINT chk_brachy CHECK (
    NOT (is_brachycephalic = 1 AND fci_number IN (105,205,218,230,235,249,292,344))
  );

-- ============================================================
-- 2. User configuration (per dog, per key)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_config (
  user_id TEXT NOT NULL,
  dog_id TEXT NOT NULL,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,
  source TEXT CHECK (source IN ('system', 'breed', 'learned', 'user')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, dog_id, config_key)
);

-- ============================================================
-- 3. Dog sub-baselines (contextual baseline slots)
-- ============================================================
CREATE TABLE IF NOT EXISTS dog_sub_baselines (
  dog_id TEXT NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN (
    'deep_rest_mat', 'light_rest_mat',
    'owner_present', 'owner_absent', 'daytime_active'
  )),
  rr_mean FLOAT,
  rr_std FLOAT,
  activity_mean FLOAT,
  activity_std FLOAT,
  mat_minutes_mean FLOAT,
  vocal_rate_mean FLOAT,
  sample_count INTEGER DEFAULT 0,
  confidence FLOAT DEFAULT 0,
  last_updated TIMESTAMPTZ,
  PRIMARY KEY (dog_id, slot)
);

-- ============================================================
-- 4. Baseline drift monitor
-- ============================================================
CREATE TABLE IF NOT EXISTS baseline_drift_monitor (
  dog_id TEXT PRIMARY KEY,
  long_term_rr_mean FLOAT,
  long_term_activity_mean FLOAT,
  long_term_mat_minutes_mean FLOAT,
  current_rr_mean FLOAT,
  current_activity_mean FLOAT,
  rr_drift_sigma FLOAT DEFAULT 0,
  activity_drift_sigma FLOAT DEFAULT 0,
  drift_significant BOOLEAN DEFAULT false,
  drift_start_date DATE,
  baseline_frozen BOOLEAN DEFAULT false,
  freeze_date DATE,
  freeze_reason TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. Walk quality tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS walk_quality (
  id SERIAL PRIMARY KEY,
  dog_id TEXT NOT NULL,
  walk_date DATE NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  distance_km FLOAT,
  duration_minutes FLOAT,
  exercise_score FLOAT,
  exploration_score FLOAT,
  social_score FLOAT,
  wqi FLOAT,
  sniffing_events INTEGER,
  copresence_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_walk_quality_dog_date ON walk_quality(dog_id, walk_date);

-- ============================================================
-- 6. Routine stability index
-- ============================================================
CREATE TABLE IF NOT EXISTS routine_stability (
  dog_id TEXT NOT NULL,
  date DATE NOT NULL,
  activity_pattern JSONB,
  mat_pattern JSONB,
  walk_pattern JSONB,
  rsi FLOAT,
  rsi_trend TEXT CHECK (rsi_trend IN ('stable','declining','improving')),
  routine_break_detected BOOLEAN DEFAULT false,
  PRIMARY KEY (dog_id, date)
);
