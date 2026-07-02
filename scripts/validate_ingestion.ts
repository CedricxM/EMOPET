/**
 * Dataset Ingestion Validation Suite
 *
 * Validates all ingested P0 datasets for completeness, correctness,
 * and cross-referencing integrity.
 *
 * Usage:
 *   npx tsx scripts/validate_ingestion.ts
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ─── Types ──────────────────────────────────────────────────────────

interface ValidationResult {
  name: string;
  passed: boolean;
  details: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

function check(name: string, condition: boolean, details: string): ValidationResult {
  return { name, passed: condition, details };
}

function loadJson(path: string): any {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

// ─── VBO Validation ─────────────────────────────────────────────────

function validateVbo(dataDir: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  const breedPath = resolve(dataDir, 'vbo', 'breed_canonical.json');
  const breeds = loadJson(breedPath);

  if (!breeds) {
    results.push(check('VBO: File exists', false, `breed_canonical.json not found at ${breedPath}. Run ingest_vbo.ts first.`));
    return results;
  }

  results.push(check('VBO: File exists', true, `${breedPath}`));

  // Total breeds > 300
  results.push(check(
    'VBO: Breed count >= 300',
    breeds.length >= 300,
    `Found ${breeds.length} dog breeds (expected 300+)`
  ));

  // No duplicate slugs
  const slugs = breeds.map((b: any) => b.breed_slug);
  const uniqueSlugs = new Set(slugs);
  results.push(check(
    'VBO: No duplicate slugs',
    slugs.length === uniqueSlugs.size,
    `${slugs.length} total, ${uniqueSlugs.size} unique`
  ));

  // FCI cross-reference rate
  const withFci = breeds.filter((b: any) => b.fci_number !== null).length;
  const fciPath = resolve(dataDir, 'breed_profiles.json');
  const fciBreeds = loadJson(fciPath);
  const fciTotal = fciBreeds ? fciBreeds.length : 335;
  const fciRate = fciTotal > 0 ? withFci / fciTotal : 0;

  results.push(check(
    'VBO: FCI cross-reference >= 90%',
    fciRate >= 0.9,
    `${withFci}/${fciTotal} matched (${(fciRate * 100).toFixed(1)}%)`
  ));

  // No empty VBO IDs
  const emptyIds = breeds.filter((b: any) => !b.vbo_id || b.vbo_id.length === 0);
  results.push(check(
    'VBO: All entries have VBO ID',
    emptyIds.length === 0,
    `${emptyIds.length} entries missing VBO ID`
  ));

  // Provenance present
  const withProvenance = breeds.filter((b: any) => b.provenance && b.provenance.source === 'vbo');
  results.push(check(
    'VBO: All entries have provenance',
    withProvenance.length === breeds.length,
    `${withProvenance.length}/${breeds.length} with provenance`
  ));

  return results;
}

// ─── IMU Behavior Validation ────────────────────────────────────────

function validateImuBehavior(dataDir: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  const profilePath = resolve(dataDir, 'imu_behavior', 'imu_behavior_profiles.json');
  const data = loadJson(profilePath);

  if (!data) {
    results.push(check('IMU Behavior: File exists', false, `imu_behavior_profiles.json not found. Run ingest_imu_behavior.ts first.`));
    return results;
  }

  results.push(check('IMU Behavior: File exists', true, profilePath));

  // All 7 activity labels present
  const expectedLabels = ['walking', 'trotting', 'galloping', 'sniffing', 'sitting', 'standing', 'lying_chest'];
  const foundLabels = Object.keys(data.activity_profiles || {});
  const missingLabels = expectedLabels.filter((l) => !foundLabels.includes(l));

  results.push(check(
    'IMU Behavior: All 7 activity labels',
    missingLabels.length === 0,
    missingLabels.length === 0
      ? `All labels present: ${foundLabels.join(', ')}`
      : `Missing: ${missingLabels.join(', ')}. Found: ${foundLabels.join(', ')}`
  ));

  // Feature stats have reasonable ranges
  let hasNaN = false;
  let hasNegativeAcc = false;
  for (const [label, profile] of Object.entries(data.activity_profiles || {}) as [string, any][]) {
    if (profile.acc_mean) {
      for (const v of profile.acc_mean) {
        if (isNaN(v)) hasNaN = true;
        if (v < 0) hasNegativeAcc = true;
      }
    }
  }

  results.push(check(
    'IMU Behavior: No NaN in features',
    !hasNaN,
    hasNaN ? 'Found NaN values in feature stats' : 'All features are numeric'
  ));

  results.push(check(
    'IMU Behavior: Acceleration > 0',
    !hasNegativeAcc,
    hasNegativeAcc ? 'Found negative acceleration values' : 'All acceleration values positive'
  ));

  // Discrimination thresholds produce accuracy > 0.8
  const thresholds = data.discrimination_thresholds || [];
  const lowConfidence = thresholds.filter((t: any) => t.confidence < 0.8);
  results.push(check(
    'IMU Behavior: Threshold accuracy > 0.8',
    lowConfidence.length === 0,
    lowConfidence.length === 0
      ? `All ${thresholds.length} thresholds above 0.8 confidence`
      : `${lowConfidence.length}/${thresholds.length} below 0.8: ${lowConfidence.map((t: any) => `${t.activity_a}/${t.activity_b}=${t.confidence.toFixed(2)}`).join(', ')}`
  ));

  // Metadata present
  results.push(check(
    'IMU Behavior: Metadata present',
    data.metadata?.source === 'mendeley_vxhx934tbn',
    `Source: ${data.metadata?.source}, Samples: ${data.metadata?.n_samples}`
  ));

  return results;
}

// ─── IMU Posture Validation ─────────────────────────────────────────

function validateImuPosture(dataDir: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  const profilePath = resolve(dataDir, 'imu_posture', 'imu_posture_profiles.json');
  const data = loadJson(profilePath);

  if (!data) {
    results.push(check('IMU Posture: File exists', false, `imu_posture_profiles.json not found. Run ingest_imu_posture.ts first.`));
    return results;
  }

  results.push(check('IMU Posture: File exists', true, profilePath));

  // All posture labels present
  const expectedPostures = ['standing', 'sitting', 'lying', 'walking'];
  const foundPostures = Object.keys(data.posture_profiles || {});
  const missingPostures = expectedPostures.filter((l) => !foundPostures.includes(l));

  results.push(check(
    'IMU Posture: All posture labels',
    missingPostures.length === 0,
    missingPostures.length === 0
      ? `All postures present: ${foundPostures.join(', ')}`
      : `Missing: ${missingPostures.join(', ')}`
  ));

  // Shake signature validation
  const shake = data.shake_signature;
  results.push(check(
    'IMU Posture: Shake signature present',
    shake != null,
    shake ? `Duration: ${shake.min_duration_ms}-${shake.max_duration_ms}ms` : 'No shake signature'
  ));

  if (shake) {
    results.push(check(
      'IMU Posture: Shake duration > 0',
      shake.min_duration_ms > 0 && shake.max_duration_ms > shake.min_duration_ms,
      `${shake.min_duration_ms}-${shake.max_duration_ms}ms`
    ));

    results.push(check(
      'IMU Posture: Shake acc_peak > 2g',
      shake.acc_peak_threshold_g > 2,
      `${shake.acc_peak_threshold_g}g`
    ));

    results.push(check(
      'IMU Posture: Shake freq range valid',
      shake.dominant_freq_range_hz[0] > 0 && shake.dominant_freq_range_hz[1] > shake.dominant_freq_range_hz[0],
      `${shake.dominant_freq_range_hz[0]}-${shake.dominant_freq_range_hz[1]} Hz`
    ));
  }

  // Placement comparison — check neck placement (validates collar choice)
  const placements = data.placement_comparison || {};
  const hasNeck = 'neck' in placements;
  results.push(check(
    'IMU Posture: Neck placement reported',
    hasNeck,
    hasNeck
      ? `Neck accuracy: ~${placements.neck.accuracy}, worst: ${placements.neck.worst_pair?.join(' vs ')}`
      : 'No neck placement data (may need placement column in CSV)'
  ));

  // Metadata
  results.push(check(
    'IMU Posture: Metadata present',
    data.metadata?.source === 'mendeley_mpph6bmn7g',
    `Source: ${data.metadata?.source}, Dogs: ${data.metadata?.n_dogs}`
  ));

  return results;
}

// ─── SQL Artifacts Validation ───────────────────────────────────────

function validateSqlArtifacts(dataDir: string): ValidationResult[] {
  const results: ValidationResult[] = [];

  const files = [
    ['vbo/breed_canonical_insert.sql', 'VBO breed inserts'],
    ['vbo/dataset_version_insert.sql', 'VBO dataset version'],
    ['imu_behavior/imu_behavior_insert.sql', 'IMU behavior inserts'],
    ['imu_posture/imu_posture_insert.sql', 'IMU posture inserts'],
  ];

  for (const [file, desc] of files) {
    const path = resolve(dataDir, file);
    const exists = existsSync(path);
    results.push(check(
      `SQL: ${desc}`,
      exists,
      exists ? path : `Not found — run corresponding ingestion script`
    ));
  }

  return results;
}

// ─── Main ───────────────────────────────────────────────────────────

function main() {
  const dataDir = resolve(__dirname, '..', 'data');

  console.log('═══════════════════════════════════════════════════');
  console.log('  EMOPET Dataset Ingestion Validation Suite');
  console.log('═══════════════════════════════════════════════════\n');

  const allResults: ValidationResult[] = [];

  // Run all validators
  const sections = [
    { name: 'VBO Breed Ontology', fn: () => validateVbo(dataDir) },
    { name: 'IMU Behavior Dataset', fn: () => validateImuBehavior(dataDir) },
    { name: 'IMU Posture Dataset', fn: () => validateImuPosture(dataDir) },
    { name: 'SQL Artifacts', fn: () => validateSqlArtifacts(dataDir) },
  ];

  for (const section of sections) {
    console.log(`── ${section.name} ──`);
    const results = section.fn();
    allResults.push(...results);

    for (const r of results) {
      const icon = r.passed ? 'PASS' : 'FAIL';
      console.log(`  [${icon}] ${r.name}`);
      console.log(`         ${r.details}`);
    }
    console.log();
  }

  // Summary
  const passed = allResults.filter((r) => r.passed).length;
  const failed = allResults.filter((r) => !r.passed).length;
  const total = allResults.length;

  console.log('═══════════════════════════════════════════════════');
  console.log(`  Results: ${passed}/${total} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════');

  if (failed > 0) {
    console.log('\nFailed checks:');
    for (const r of allResults.filter((r) => !r.passed)) {
      console.log(`  - ${r.name}: ${r.details}`);
    }
    process.exit(1);
  }

  console.log('\nAll validations passed!');
}

main();
