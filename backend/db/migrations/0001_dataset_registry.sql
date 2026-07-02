-- Migration: Dataset Ingestion Pipeline (P0 Datasets)
-- Date: 2026-03-31
-- Description: Dataset governance layer + VBO breed canonical + IMU activity/posture tables

-- ─── Helper: updated_at trigger function ────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Dataset Registry ───────────────────────────────────────────────

CREATE TABLE dataset_registry (
    dataset_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner TEXT,
    license_id TEXT NOT NULL,
    license_url TEXT,
    source_url TEXT NOT NULL,
    refresh_policy TEXT NOT NULL,
    ingestion_status TEXT NOT NULL DEFAULT 'planned',
    attribution_text TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dataset_versions (
    dataset_id TEXT REFERENCES dataset_registry(dataset_id) ON DELETE CASCADE,
    version_tag TEXT NOT NULL,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_last_updated DATE,
    checksum_sha256 TEXT NOT NULL,
    record_count INTEGER,
    notes TEXT,
    PRIMARY KEY (dataset_id, version_tag)
);

CREATE TRIGGER update_dataset_registry_updated_at
    BEFORE UPDATE ON dataset_registry
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ─── Breed Canonical (VBO) ──────────────────────────────────────────

CREATE TABLE breed_canonical (
    vbo_id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    display_name TEXT NOT NULL,
    breed_slug TEXT NOT NULL UNIQUE,
    synonyms JSONB DEFAULT '[]',
    fci_number INTEGER,
    provenance JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_breed_canonical_slug ON breed_canonical(breed_slug);
CREATE INDEX idx_breed_canonical_fci ON breed_canonical(fci_number);

CREATE TRIGGER update_breed_canonical_updated_at
    BEFORE UPDATE ON breed_canonical
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ─── IMU Activity Profiles (Behavior Dataset) ──────────────────────

CREATE TABLE imu_activity_profiles (
    activity_label TEXT PRIMARY KEY,
    feature_stats JSONB NOT NULL,
    placement TEXT NOT NULL,
    source_dataset TEXT REFERENCES dataset_registry(dataset_id),
    sample_count INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE imu_discrimination_thresholds (
    id SERIAL PRIMARY KEY,
    activity_a TEXT NOT NULL,
    activity_b TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    threshold_value FLOAT NOT NULL,
    confidence FLOAT NOT NULL,
    placement TEXT NOT NULL,
    source_dataset TEXT REFERENCES dataset_registry(dataset_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(activity_a, activity_b, feature_name, placement)
);

-- ─── IMU Shake Filter (Posture Dataset) ─────────────────────────────

CREATE TABLE imu_shake_filter (
    id SERIAL PRIMARY KEY,
    parameter TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    source_dataset TEXT REFERENCES dataset_registry(dataset_id),
    confidence FLOAT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Add VBO cross-reference to breed_sensor_profiles ──────────────

ALTER TABLE breed_sensor_profiles
    ADD COLUMN IF NOT EXISTS vbo_id TEXT REFERENCES breed_canonical(vbo_id);

-- ─── Seed: Dataset Registry ────────────────────────────────────────

INSERT INTO dataset_registry (dataset_id, name, owner, license_id, license_url, source_url, refresh_policy, ingestion_status, attribution_text) VALUES
('vbo', 'Vertebrate Breed Ontology', 'OBO Foundry / Monarch Initiative', 'CC-BY-4.0', 'https://creativecommons.org/licenses/by/4.0/', 'http://purl.obolibrary.org/obo/vbo.owl', 'manual', 'planned', 'Vertebrate Breed Ontology (VBO), OBO Foundry, CC BY 4.0'),
('mendeley_dog_behavior', 'Movement Sensor Dataset for Dog Behavior Classification', 'Mendeley Data', 'CC-BY-4.0', 'https://creativecommons.org/licenses/by/4.0/', 'https://data.mendeley.com/datasets/vxhx934tbn', 'static', 'planned', 'Movement Sensor Dataset for Dog Behavior Classification, Mendeley Data, CC BY 4.0'),
('mendeley_dog_posture', 'Inertial sensor dataset for Dog Posture Recognition', 'Mendeley Data', 'CC-BY-4.0', 'https://creativecommons.org/licenses/by/4.0/', 'https://data.mendeley.com/datasets/mpph6bmn7g/1', 'static', 'planned', 'Inertial sensor dataset for Dog Posture Recognition, Mendeley Data, CC BY 4.0'),
('anses_vet_meds', 'Base medicaments veterinaires autorises France', 'ANMV/Anses', 'CC-BY', 'https://www.etalab.gouv.fr/licence-ouverte-open-licence', 'https://www.data.gouv.fr/datasets/base-de-donnees-publique-des-medicaments-veterinaires-autorises-en-france-1', 'weekly', 'planned', 'Base de donnees publique des medicaments veterinaires, ANMV/Anses, Licence Ouverte Etalab 2.0'),
('osm_canine_infra', 'Distributeurs sacs et poubelles dejections canines France', 'OpenStreetMap contributors', 'ODbL-1.0', 'https://opendatacommons.org/licenses/odbl/summary/', 'https://www.data.gouv.fr/datasets/distributeurs-de-sacs-et-poubelles-pour-dejections-canines-en-france-openstreetmap', 'monthly', 'planned', 'Data (c) OpenStreetMap contributors, ODbL 1.0'),
('fci_standards', 'FCI Breed Standards PDFs', 'FCI', 'public-reference', '', 'https://www.fci.be/', 'manual', 'active', 'Federation Cynologique Internationale (FCI) breed standards');

-- ─── Seed: Shake Filter Initial Estimates ──────────────────────────

INSERT INTO imu_shake_filter (parameter, value, source_dataset, confidence, notes) VALUES
('min_duration_ms', '500', 'mendeley_dog_posture', 0.7, 'Initial estimate, refine after processing'),
('max_duration_ms', '3000', 'mendeley_dog_posture', 0.7, 'Initial estimate'),
('acc_peak_threshold_g', '4.0', 'mendeley_dog_posture', 0.7, 'Body shake peak acceleration'),
('dominant_freq_range_hz', '[4, 8]', 'mendeley_dog_posture', 0.7, 'Shake oscillation frequency band'),
('gyro_peak_threshold_dps', '500', 'mendeley_dog_posture', 0.6, 'Rotational velocity during shake');
