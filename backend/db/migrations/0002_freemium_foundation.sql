-- Migration: Freemium App Data Foundation
-- Creates tables for breed knowledge, content templates, local directory,
-- weather context, and seasonal alerts.

-- ─── Breed Knowledge Database ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS breed_knowledge (
  breed_id TEXT PRIMARY KEY,
  fci_number INTEGER,
  display_name_fr TEXT NOT NULL,
  display_name_en TEXT NOT NULL,

  -- Morphology
  size_class TEXT NOT NULL CHECK (size_class IN ('xs','small','medium','large','giant')),
  weight_min_kg REAL,
  weight_max_kg REAL,
  height_min_cm REAL,
  height_max_cm REAL,
  is_brachycephalic BOOLEAN DEFAULT false,
  is_long_backed BOOLEAN DEFAULT false,
  is_giant BOOLEAN DEFAULT false,

  -- Fur & contact
  fur_length TEXT CHECK (fur_length IN ('hairless','short','medium','long','wire','curly')),
  fur_density TEXT CHECK (fur_density IN ('sparse','moderate','dense','very_dense')),
  has_double_coat BOOLEAN DEFAULT false,
  fur_contact_class TEXT CHECK (fur_contact_class IN ('FC-1','FC-2','FC-3')),
  shedding_level TEXT CHECK (shedding_level IN ('none','low','moderate','heavy','seasonal_heavy')),

  -- Activity needs
  activity_level TEXT CHECK (activity_level IN ('low','moderate','high','very_high')),
  daily_exercise_min_minutes INTEGER,
  daily_exercise_max_minutes INTEGER,
  daily_walk_km_min REAL,
  daily_walk_km_max REAL,
  exercise_type_preference JSONB DEFAULT '[]',

  -- Behavior (C-BARQ simplified)
  separation_anxiety_tendency TEXT CHECK (separation_anxiety_tendency IN ('low','moderate','high')),
  vocalization_tendency TEXT CHECK (vocalization_tendency IN ('quiet','moderate','vocal','very_vocal')),
  sociability_dogs TEXT CHECK (sociability_dogs IN ('low','moderate','high')),
  sociability_humans TEXT CHECK (sociability_humans IN ('reserved','moderate','friendly','very_friendly')),
  trainability TEXT CHECK (trainability IN ('independent','moderate','eager','very_eager')),
  energy_indoor TEXT CHECK (energy_indoor IN ('calm','moderate','active')),
  destructiveness_tendency TEXT CHECK (destructiveness_tendency IN ('low','moderate','high')),

  -- Health sensitivities (non-medical, content targeting)
  heat_sensitivity TEXT CHECK (heat_sensitivity IN ('low','moderate','high','very_high')),
  cold_sensitivity TEXT CHECK (cold_sensitivity IN ('low','moderate','high')),
  heat_alert_threshold_c REAL,
  common_breed_concerns JSONB DEFAULT '[]',

  -- Lifespan
  lifespan_min_years INTEGER,
  lifespan_max_years INTEGER,

  -- Content metadata
  onboarding_tips JSONB DEFAULT '[]',
  fun_facts JSONB DEFAULT '[]',
  breed_group_fci TEXT,
  origin_country TEXT,

  -- Data quality
  data_completeness REAL DEFAULT 0,
  source TEXT DEFAULT 'fci_standard',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_breed_size ON breed_knowledge(size_class);
CREATE INDEX IF NOT EXISTS idx_breed_activity ON breed_knowledge(activity_level);
CREATE INDEX IF NOT EXISTS idx_breed_brachy ON breed_knowledge(is_brachycephalic);

-- ─── Bleiz Freemium Templates ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS bleiz_freemium_templates (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  subcategory TEXT,

  -- Targeting
  breed_filter JSONB DEFAULT '[]',
  size_filter JSONB DEFAULT '[]',
  age_min_months INTEGER,
  age_max_months INTEGER,
  season_filter JSONB DEFAULT '[]',
  month_filter JSONB DEFAULT '[]',
  region_filter JSONB DEFAULT '["all"]',

  -- Content
  title_fr TEXT NOT NULL,
  body_fr TEXT NOT NULL,
  source_type TEXT NOT NULL,

  -- Safety
  never_say JSONB NOT NULL DEFAULT '[]',
  suffix TEXT,
  requires_vet_disclaimer BOOLEAN DEFAULT false,

  -- Scheduling
  channel TEXT NOT NULL DEFAULT 'home_insight',
  priority INTEGER NOT NULL DEFAULT 5,
  cooldown_hours INTEGER NOT NULL DEFAULT 168,
  max_per_month INTEGER NOT NULL DEFAULT 2,

  -- Personalization
  uses_dog_name BOOLEAN DEFAULT true,
  uses_breed_name BOOLEAN DEFAULT true,
  uses_age BOOLEAN DEFAULT false,
  uses_location BOOLEAN DEFAULT false,
  uses_season BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_bft_category ON bleiz_freemium_templates(category);

-- ─── Local Directory ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS local_directory (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'veterinaire', 'educateur', 'toiletteur',
    'pension', 'parc_chien', 'animalerie',
    'promeneur', 'osteopathe_canin', 'comportementaliste'
  )),

  -- Location
  address TEXT,
  city TEXT NOT NULL,
  postal_code TEXT,
  department TEXT,
  region TEXT DEFAULT 'bretagne',
  latitude REAL,
  longitude REAL,

  -- Contact
  phone TEXT,
  website TEXT,
  email TEXT,

  -- Details
  hours JSONB,
  specialties JSONB DEFAULT '[]',
  accepts_emergencies BOOLEAN DEFAULT false,

  -- Community
  rating_avg REAL,
  rating_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,

  -- Source
  source TEXT DEFAULT 'manual',
  source_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dir_category ON local_directory(category);
CREATE INDEX IF NOT EXISTS idx_dir_city ON local_directory(city);
CREATE INDEX IF NOT EXISTS idx_dir_geo ON local_directory(latitude, longitude);

-- ─── Weather Context ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS weather_context (
  id SERIAL PRIMARY KEY,
  location_key TEXT NOT NULL,
  date DATE NOT NULL,
  temperature_c REAL,
  feels_like_c REAL,
  humidity_pct INTEGER,
  wind_speed_ms REAL,
  weather_condition TEXT,
  uv_index REAL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_key, date)
);

-- ─── Seasonal Alerts ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS seasonal_alerts (
  id SERIAL PRIMARY KEY,
  alert_type TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'bretagne',
  severity TEXT NOT NULL CHECK (severity IN ('info','attention','urgent')),
  title_fr TEXT NOT NULL,
  body_fr TEXT NOT NULL,
  active_from DATE NOT NULL,
  active_to DATE NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
