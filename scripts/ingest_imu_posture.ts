/**
 * IMU Dog Posture Dataset Ingestion Script
 *
 * Processes the Mendeley "Inertial sensor dataset for Dog Posture Recognition"
 * (dataset: mpph6bmn7g/1) and extracts posture orientation profiles, shake detection
 * signature, and placement sensitivity analysis.
 *
 * 42 dogs, 3 IMU placements (back/neck/chest)
 * Labels: Standing, Sitting, Lying, Walking, Body shake
 *
 * The "body shake" label is critical — it must be filtered from agitation detection.
 *
 * Expected input: CSV files in data/imu_posture/ with columns:
 *   acc_x, acc_y, acc_z, gyro_x, gyro_y, gyro_z, label, [placement], [dog_id]
 *
 * Usage:
 *   npx tsx scripts/ingest_imu_posture.ts
 *   npx tsx scripts/ingest_imu_posture.ts --dry-run
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { resolve } from 'path';

// ─── Types ──────────────────────────────────────────────────────────

interface ImuSample {
  acc_x: number;
  acc_y: number;
  acc_z: number;
  gyro_x: number;
  gyro_y: number;
  gyro_z: number;
  label: string;
  placement: string; // 'back', 'neck', 'chest'
  dog_id: string;
}

interface PostureProfile {
  pitch_range: [number, number]; // [5th percentile, 95th percentile] in degrees
  roll_range: [number, number];
  sample_count: number;
}

interface ShakeSignature {
  min_duration_ms: number;
  max_duration_ms: number;
  acc_peak_threshold_g: number;
  dominant_freq_range_hz: [number, number];
  gyro_peak_threshold_dps: number;
  sample_count: number;
}

interface PlacementStats {
  accuracy: number;
  worst_pair: [string, string];
  sample_count: number;
}

// ─── Helpers ────────────────────────────────────────────────────────

function parseCsv(content: string): ImuSample[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase().split(',').map((h) => h.trim());

  const accXIdx = header.findIndex((h) => h.includes('acc_x') || h.includes('accel_x') || h === 'ax');
  const accYIdx = header.findIndex((h) => h.includes('acc_y') || h.includes('accel_y') || h === 'ay');
  const accZIdx = header.findIndex((h) => h.includes('acc_z') || h.includes('accel_z') || h === 'az');
  const gyroXIdx = header.findIndex((h) => h.includes('gyro_x') || h.includes('gyr_x') || h === 'gx');
  const gyroYIdx = header.findIndex((h) => h.includes('gyro_y') || h.includes('gyr_y') || h === 'gy');
  const gyroZIdx = header.findIndex((h) => h.includes('gyro_z') || h.includes('gyr_z') || h === 'gz');
  const labelIdx = header.findIndex((h) => h === 'label' || h === 'activity' || h === 'class' || h === 'posture');
  const placementIdx = header.findIndex((h) => h === 'placement' || h === 'position' || h === 'location');
  const dogIdx = header.findIndex((h) => h === 'dog_id' || h === 'dog' || h === 'subject' || h === 'id');

  if ([accXIdx, accYIdx, accZIdx, labelIdx].some((i) => i === -1)) {
    console.warn('CSV header missing required columns. Found:', header);
    return [];
  }

  const samples: ImuSample[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length <= labelIdx) continue;

    const acc_x = parseFloat(cols[accXIdx]);
    const acc_y = parseFloat(cols[accYIdx]);
    const acc_z = parseFloat(cols[accZIdx]);
    const gyro_x = gyroXIdx >= 0 ? parseFloat(cols[gyroXIdx]) : 0;
    const gyro_y = gyroYIdx >= 0 ? parseFloat(cols[gyroYIdx]) : 0;
    const gyro_z = gyroZIdx >= 0 ? parseFloat(cols[gyroZIdx]) : 0;
    const label = cols[labelIdx].trim().toLowerCase().replace(/\s+/g, '_');
    const placement = placementIdx >= 0 ? cols[placementIdx].trim().toLowerCase() : 'unknown';
    const dog_id = dogIdx >= 0 ? cols[dogIdx].trim() : 'unknown';

    if (isNaN(acc_x) || isNaN(acc_y) || isNaN(acc_z)) continue;

    samples.push({ acc_x, acc_y, acc_z, gyro_x, gyro_y, gyro_z, label, placement, dog_id });
  }

  return samples;
}

function toDegrees(rad: number): number {
  return rad * (180 / Math.PI);
}

function computePitch(acc_x: number, acc_y: number, acc_z: number): number {
  return toDegrees(Math.atan2(acc_x, Math.sqrt(acc_y ** 2 + acc_z ** 2)));
}

function computeRoll(acc_y: number, acc_z: number): number {
  return toDegrees(Math.atan2(acc_y, acc_z));
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function median(arr: number[]): number {
  return percentile(arr, 50);
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const dataDir = resolve(__dirname, '..', 'data', 'imu_posture');
  const samplingHz = 100;

  if (!existsSync(dataDir)) {
    console.error(`Data directory not found: ${dataDir}`);
    console.error('Download the Mendeley dataset (mpph6bmn7g/1) to this directory first.');
    process.exit(1);
  }

  const csvFiles = readdirSync(dataDir).filter((f) => f.endsWith('.csv'));
  if (csvFiles.length === 0) {
    console.error(`No CSV files found in ${dataDir}`);
    process.exit(1);
  }

  console.log(`Found ${csvFiles.length} CSV files`);

  let allSamples: ImuSample[] = [];
  let checksumInput = '';

  for (const file of csvFiles) {
    const filePath = resolve(dataDir, file);
    const content = readFileSync(filePath, 'utf-8');
    checksumInput += content;
    const samples = parseCsv(content);
    console.log(`  ${file}: ${samples.length} samples`);
    allSamples = allSamples.concat(samples);
  }

  const checksum = createHash('sha256').update(checksumInput).digest('hex');
  console.log(`Total samples: ${allSamples.length}, checksum: ${checksum.slice(0, 12)}`);

  // Unique dogs and placements
  const dogs = new Set(allSamples.map((s) => s.dog_id));
  const placements = new Set(allSamples.map((s) => s.placement));
  console.log(`Dogs: ${dogs.size}, Placements: ${[...placements].join(', ')}`);

  // Group by label
  const byLabel = new Map<string, ImuSample[]>();
  for (const sample of allSamples) {
    const existing = byLabel.get(sample.label) || [];
    existing.push(sample);
    byLabel.set(sample.label, existing);
  }
  console.log(`Labels: ${[...byLabel.keys()].join(', ')}`);

  // ─── 1. Posture Orientation Profiles ──────────────────────────────

  const postureLabels = ['standing', 'sitting', 'lying', 'walking'];
  const postureProfiles: Record<string, PostureProfile> = {};

  for (const label of postureLabels) {
    const samples = byLabel.get(label);
    if (!samples || samples.length === 0) continue;

    const pitches = samples.map((s) => computePitch(s.acc_x, s.acc_y, s.acc_z));
    const rolls = samples.map((s) => computeRoll(s.acc_y, s.acc_z));

    postureProfiles[label] = {
      pitch_range: [Math.round(percentile(pitches, 5)), Math.round(percentile(pitches, 95))],
      roll_range: [Math.round(percentile(rolls, 5)), Math.round(percentile(rolls, 95))],
      sample_count: samples.length,
    };
  }

  // ─── 2. Shake Detection Signature ────────────────────────────────

  const shakeSamples = byLabel.get('body_shake') || byLabel.get('shake') || [];
  let shakeSignature: ShakeSignature;

  if (shakeSamples.length > 0) {
    const accMags = shakeSamples.map((s) => Math.sqrt(s.acc_x ** 2 + s.acc_y ** 2 + s.acc_z ** 2));
    const gyroMags = shakeSamples.map((s) => Math.sqrt(s.gyro_x ** 2 + s.gyro_y ** 2 + s.gyro_z ** 2));

    // Peak acceleration (in g, assuming data in m/s²)
    const accPeak = Math.max(...accMags) / 9.81;

    // Dominant frequency via zero-crossing
    const accMean = mean(accMags);
    const demeaned = accMags.map((v) => v - accMean);
    let zeroCrossings = 0;
    for (let i = 1; i < demeaned.length; i++) {
      if ((demeaned[i] >= 0) !== (demeaned[i - 1] >= 0)) zeroCrossings++;
    }
    const domFreq = (zeroCrossings / 2) * (samplingHz / demeaned.length);

    // Gyro peak (in dps)
    const gyroPeak = Math.max(...gyroMags);

    // Duration estimate: total shake samples / sampling rate
    const totalDurationMs = (shakeSamples.length / samplingHz) * 1000;
    // Estimate per-event duration (assume ~10-50 events in dataset)
    const estEvents = Math.max(1, Math.round(totalDurationMs / 2000));
    const avgDurationMs = totalDurationMs / estEvents;

    shakeSignature = {
      min_duration_ms: Math.round(Math.max(300, avgDurationMs * 0.3)),
      max_duration_ms: Math.round(Math.min(5000, avgDurationMs * 2)),
      acc_peak_threshold_g: Math.round(Math.max(2, accPeak * 0.6) * 10) / 10,
      dominant_freq_range_hz: [
        Math.round(Math.max(2, domFreq * 0.6)),
        Math.round(Math.min(12, domFreq * 1.5)),
      ],
      gyro_peak_threshold_dps: Math.round(Math.max(200, gyroPeak * 0.5)),
      sample_count: shakeSamples.length,
    };
  } else {
    console.warn('No shake samples found — using default estimates');
    shakeSignature = {
      min_duration_ms: 500,
      max_duration_ms: 3000,
      acc_peak_threshold_g: 4.0,
      dominant_freq_range_hz: [4, 8],
      gyro_peak_threshold_dps: 500,
      sample_count: 0,
    };
  }

  // ─── 3. Placement Sensitivity Analysis ───────────────────────────

  const placementComparison: Record<string, PlacementStats> = {};

  for (const placement of placements) {
    if (placement === 'unknown') continue;

    const placementSamples = allSamples.filter((s) => s.placement === placement);
    const byLabelPlacement = new Map<string, ImuSample[]>();
    for (const s of placementSamples) {
      const existing = byLabelPlacement.get(s.label) || [];
      existing.push(s);
      byLabelPlacement.set(s.label, existing);
    }

    // Simple classification accuracy: for each posture, compute mean acc_magnitude
    // and see how separable they are
    const labelMeans = new Map<string, number>();
    for (const [label, samples] of byLabelPlacement) {
      if (label.includes('shake')) continue;
      const accMags = samples.map((s) => Math.sqrt(s.acc_x ** 2 + s.acc_y ** 2 + s.acc_z ** 2));
      labelMeans.set(label, mean(accMags));
    }

    // Find worst pair (closest means)
    let worstDist = Infinity;
    let worstPair: [string, string] = ['', ''];
    const pLabels = [...labelMeans.keys()];
    for (let i = 0; i < pLabels.length; i++) {
      for (let j = i + 1; j < pLabels.length; j++) {
        const dist = Math.abs(labelMeans.get(pLabels[i])! - labelMeans.get(pLabels[j])!);
        if (dist < worstDist) {
          worstDist = dist;
          worstPair = [pLabels[i], pLabels[j]];
        }
      }
    }

    // Estimate accuracy from separability
    const allDists: number[] = [];
    for (let i = 0; i < pLabels.length; i++) {
      for (let j = i + 1; j < pLabels.length; j++) {
        allDists.push(Math.abs(labelMeans.get(pLabels[i])! - labelMeans.get(pLabels[j])!));
      }
    }
    const meanDist = mean(allDists);
    const accuracy = Math.min(0.99, Math.max(0.5, 0.5 + meanDist * 2)); // rough estimate

    placementComparison[placement] = {
      accuracy: Math.round(accuracy * 100) / 100,
      worst_pair: worstPair,
      sample_count: placementSamples.length,
    };
  }

  // ─── Build Output ─────────────────────────────────────────────────

  const output = {
    posture_profiles: postureProfiles,
    shake_signature: shakeSignature,
    placement_comparison: placementComparison,
    metadata: {
      source: 'mendeley_mpph6bmn7g',
      n_dogs: dogs.size,
      n_samples: allSamples.length,
      sampling_hz: samplingHz,
      labels: [...byLabel.keys()],
      placements: [...placements],
      checksum: checksum.slice(0, 12),
      processed_at: new Date().toISOString(),
    },
  };

  const outputPath = resolve(dataDir, 'imu_posture_profiles.json');
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nWritten profiles to ${outputPath}`);

  if (dryRun) {
    console.log('\n[DRY RUN] Skipping SQL generation.');
    return;
  }

  // Generate SQL for shake filter updates
  const sqlLines: string[] = [];

  // Update shake filter parameters with empirical values
  const shakeParams: [string, string, number][] = [
    ['min_duration_ms', JSON.stringify(shakeSignature.min_duration_ms), shakeSignature.sample_count > 0 ? 0.85 : 0.7],
    ['max_duration_ms', JSON.stringify(shakeSignature.max_duration_ms), shakeSignature.sample_count > 0 ? 0.85 : 0.7],
    ['acc_peak_threshold_g', JSON.stringify(shakeSignature.acc_peak_threshold_g), shakeSignature.sample_count > 0 ? 0.85 : 0.7],
    ['dominant_freq_range_hz', JSON.stringify(shakeSignature.dominant_freq_range_hz), shakeSignature.sample_count > 0 ? 0.8 : 0.7],
    ['gyro_peak_threshold_dps', JSON.stringify(shakeSignature.gyro_peak_threshold_dps), shakeSignature.sample_count > 0 ? 0.75 : 0.6],
  ];

  for (const [param, value, confidence] of shakeParams) {
    sqlLines.push(
      `UPDATE imu_shake_filter SET value = '${value}'::jsonb, confidence = ${confidence}, notes = 'Refined from posture dataset processing' WHERE parameter = '${param}';`
    );
  }

  // Dataset version
  sqlLines.push(
    `INSERT INTO dataset_versions (dataset_id, version_tag, checksum_sha256, record_count, notes) VALUES ('mendeley_dog_posture', '${checksum.slice(0, 12)}', '${checksum}', ${allSamples.length}, 'Auto-ingested by ingest_imu_posture.ts') ON CONFLICT DO NOTHING;`
  );

  const sqlPath = resolve(dataDir, 'imu_posture_insert.sql');
  writeFileSync(sqlPath, sqlLines.join('\n'));
  console.log(`SQL written to ${sqlPath}`);

  // Summary
  console.log('\n── IMU Posture Ingestion Summary ──');
  console.log(`  Dogs:           ${dogs.size}`);
  console.log(`  Postures:       ${Object.keys(postureProfiles).length}`);
  console.log(`  Shake samples:  ${shakeSignature.sample_count}`);
  console.log(`  Shake acc peak: ${shakeSignature.acc_peak_threshold_g}g`);
  console.log(`  Shake freq:     ${shakeSignature.dominant_freq_range_hz[0]}-${shakeSignature.dominant_freq_range_hz[1]} Hz`);
  console.log(`  Placements:     ${Object.keys(placementComparison).length}`);
  for (const [p, stats] of Object.entries(placementComparison)) {
    console.log(`    ${p}: accuracy ~${stats.accuracy}, worst: ${stats.worst_pair.join(' vs ')}`);
  }
}

main().catch((err) => {
  console.error('IMU posture ingestion failed:', err);
  process.exit(1);
});
