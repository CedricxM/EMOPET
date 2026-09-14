-- EMOPET P0 CORE DATABASE BASELINE — DRAFT ONLY
--
-- STATUS: QA_PENDING_DISPOSABLE_POSTGRES_VALIDATION
-- AUTHORITY: NON-EXECUTABLE DRAFT / NOT AN ACTIVE MIGRATION
--
-- IMPORTANT:
-- - This file intentionally lives outside db/migrations/ so drizzle-kit migrate
--   cannot discover it as part of the active migration history.
-- - Do not copy/rename it into db/migrations/ until the existing-database gate
--   is resolved and a disposable PostgreSQL validation passes.
-- - This draft reconstructs the core tables that the checked-in 0001–0004 SQL
--   files already assume exist.
-- - It does not modify, delete, or renumber historical migrations.
-- - It does not authorize production migration or release.

BEGIN;

-- -----------------------------------------------------------------------------
-- Identity / account core
-- -----------------------------------------------------------------------------

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500),
  locale VARCHAR(10) DEFAULT 'fr',
  push_token VARCHAR(255),
  onboarding_complete BOOLEAN DEFAULT false,
  gdpr_consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  plan VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  stripe_subscription_id VARCHAR(255),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);

-- -----------------------------------------------------------------------------
-- Owner / dog / device core
-- -----------------------------------------------------------------------------

CREATE TABLE dogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(50) NOT NULL,
  breed VARCHAR(100) NOT NULL,
  breed_fci_number INTEGER,
  birth_date DATE NOT NULL,
  sex VARCHAR(10) NOT NULL,
  weight REAL NOT NULL,
  fur_class VARCHAR(5) NOT NULL,
  photo_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES dogs(id),
  type VARCHAR(5) NOT NULL,
  mac_address VARCHAR(17) NOT NULL UNIQUE,
  firmware_version VARCHAR(20),
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE health_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES dogs(id),
  type VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  title VARCHAR(200) NOT NULL,
  details VARCHAR(2000),
  value REAL,
  next_due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 0001 and 0003 both alter this table. vbo_id is intentionally omitted here
-- because migration 0001 adds it after breed_canonical exists.
CREATE TABLE breed_sensor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fci_number INTEGER UNIQUE,
  breed_name VARCHAR(100) NOT NULL,
  fur_class VARCHAR(5),
  size_class VARCHAR(10),
  is_brachycephalic INTEGER DEFAULT 0,
  mod_pvdf REAL,
  mod_load_cell REAL,
  mod_imu REAL,
  mod_mic REAL,
  mod_piezo REAL,
  mod_gps REAL,
  rho_a REAL,
  delta_l REAL,
  rr_rest_min REAL,
  rr_rest_max REAL,
  warmup_days INTEGER,
  profile_json JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Sensor / ELI core declared in current Drizzle schema
-- -----------------------------------------------------------------------------

CREATE TABLE sensor_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES dogs(id),
  timestamp TIMESTAMPTZ NOT NULL,
  source VARCHAR(5) NOT NULL,
  mat_presence_minutes REAL,
  respiratory_rate_mean REAL,
  respiratory_rate_std REAL,
  respiratory_rate_confidence REAL,
  weight_kg REAL,
  position_changes INTEGER,
  activity_minutes REAL,
  distance_km REAL,
  vocal_events INTEGER,
  vocal_energy_mean REAL,
  posture_distribution JSONB,
  agitation_events INTEGER,
  temperature_c REAL,
  humidity_pct REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE eli_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES dogs(id),
  timestamp TIMESTAMPTZ NOT NULL,
  arousal REAL NOT NULL,
  valence REAL NOT NULL,
  load REAL NOT NULL,
  confidence REAL NOT NULL,
  gate_status VARCHAR(10) NOT NULL,
  sensor_reliability JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL UNIQUE REFERENCES dogs(id),
  started_at TIMESTAMPTZ NOT NULL,
  valid_hours REAL NOT NULL DEFAULT 0,
  established INTEGER NOT NULL DEFAULT 0,
  metrics JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Community core
-- -----------------------------------------------------------------------------

CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description VARCHAR(1000),
  type VARCHAR(20) NOT NULL,
  latitude REAL,
  longitude REAL,
  radius_m INTEGER,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id),
  author_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(20) NOT NULL,
  content VARCHAR(2000) NOT NULL,
  media_urls JSONB DEFAULT '[]'::jsonb,
  sensor_overlay JSONB,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id),
  author_id UUID NOT NULL REFERENCES users(id),
  content VARCHAR(1000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE community_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id),
  created_by UUID NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description VARCHAR(2000),
  location VARCHAR(200) NOT NULL,
  latitude REAL,
  longitude REAL,
  starts_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE copresence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_a_id UUID NOT NULL,
  dog_b_id UUID NOT NULL,
  latitude REAL,
  longitude REAL,
  occurred_at TIMESTAMPTZ NOT NULL,
  recurring INTEGER DEFAULT 1
);

-- -----------------------------------------------------------------------------
-- AI message persistence core
-- -----------------------------------------------------------------------------

CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(30) NOT NULL,
  target_user_id UUID REFERENCES users(id),
  target_community_id UUID,
  dog_id UUID REFERENCES dogs(id),
  content VARCHAR(4000) NOT NULL,
  pushed_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;

-- END DRAFT
-- QA_PENDING_DISPOSABLE_POSTGRES_VALIDATION
