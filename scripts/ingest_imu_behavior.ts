/**
 * IMU Dog Behavior Dataset Ingestion Script
 *
 * Processes the Mendeley "Movement Sensor Dataset for Dog Behavior Classification"
 * (dataset: vxhx934tbn) and extracts activity feature statistics, discrimination
 * thresholds, and confusion pairs for BMI270 calibration.
 *
 * Expected input: CSV files in data/imu_behavior/ with columns:
 *   timestamp, acc_x, acc_y, acc_z, gyro_x, gyro_y, gyro_z, label
 *
 * Activity labels: walking, trotting, galloping, sniffing, sitting, standing, lying_chest
 *
 * Usage:
 *   npx tsx scripts/ingest_imu_behavior.ts
 *   npx tsx scripts/ingest_imu_behavior.ts --dry-run
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
}

interface WindowFeatures {
  acc_magnitude_mean: number;
  acc_magnitude_std: number;
  gyro_magnitude_mean: number;
  gyro_magnitude_std: number;
  odba: number;
  dominant_frequency: number;
}

interface ActivityProfile {
  acc_mean: [number, number, number]; // [min, median, max]
  acc_std: [number, number, number];
  gyro_mean: [number, number, number];
  gyro_std: [number, number, number];
  odba: [number, number, number];
  dominant_freq: [number, number, number];
  sample_count: number;
}

interface Threshold {
  activity_a: string;
  activity_b: string;
  feature: string;
  threshold: number;
  confidence: number;
}

interface ConfusionPair {
  a: string;
  b: string;
  confusion_rate: number;
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
  const labelIdx = header.findIndex((h) => h === 'label' || h === 'activity' || h === 'class');

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

    if (isNaN(acc_x) || isNaN(acc_y) || isNaN(acc_z)) continue;

    samples.push({ acc_x, acc_y, acc_z, gyro_x, gyro_y, gyro_z, label });
  }

  return samples;
}

function computeWindowFeatures(samples: ImuSample[], samplingHz: number): WindowFeatures {
  const accMags = samples.map((s) => Math.sqrt(s.acc_x ** 2 + s.acc_y ** 2 + s.acc_z ** 2));
  const gyroMags = samples.map((s) => Math.sqrt(s.gyro_x ** 2 + s.gyro_y ** 2 + s.gyro_z ** 2));

  const accMean = mean(accMags);
  const accStd = std(accMags);
  const gyroMean = mean(gyroMags);
  const gyroStd = std(gyroMags);

  // ODBA: sum of absolute deviations from mean for each axis
  const axMean = mean(samples.map((s) => s.acc_x));
  const ayMean = mean(samples.map((s) => s.acc_y));
  const azMean = mean(samples.map((s) => s.acc_z));
  const odba = mean(
    samples.map((s) => Math.abs(s.acc_x - axMean) + Math.abs(s.acc_y - ayMean) + Math.abs(s.acc_z - azMean))
  );

  // Dominant frequency via zero-crossing rate (simplified FFT proxy)
  const demeaned = accMags.map((v) => v - accMean);
  let zeroCrossings = 0;
  for (let i = 1; i < demeaned.length; i++) {
    if ((demeaned[i] >= 0) !== (demeaned[i - 1] >= 0)) zeroCrossings++;
  }
  const dominantFreq = (zeroCrossings / 2) * (samplingHz / demeaned.length);

  return {
    acc_magnitude_mean: accMean,
    acc_magnitude_std: accStd,
    gyro_magnitude_mean: gyroMean,
    gyro_magnitude_std: gyroStd,
    odba,
    dominant_frequency: dominantFreq,
  };
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1));
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function minMaxMedian(arr: number[]): [number, number, number] {
  return [percentile(arr, 5), median(arr), percentile(arr, 95)];
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const dataDir = resolve(__dirname, '..', 'data', 'imu_behavior');
  const samplingHz = 100; // Dataset sampling rate
  const windowSize = 200; // 2 seconds at 100Hz

  if (!existsSync(dataDir)) {
    console.error(`Data directory not found: ${dataDir}`);
    console.error('Download the Mendeley dataset (vxhx934tbn) to this directory first.');
    process.exit(1);
  }

  // Find all CSV files
  const csvFiles = readdirSync(dataDir).filter((f) => f.endsWith('.csv'));
  if (csvFiles.length === 0) {
    console.error(`No CSV files found in ${dataDir}`);
    console.error('Download the Mendeley dataset (vxhx934tbn) and place CSV files here.');
    process.exit(1);
  }

  console.log(`Found ${csvFiles.length} CSV files`);

  // Parse all samples
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

  // Group by label
  const byLabel = new Map<string, ImuSample[]>();
  for (const sample of allSamples) {
    const existing = byLabel.get(sample.label) || [];
    existing.push(sample);
    byLabel.set(sample.label, existing);
  }

  console.log(`Activity labels: ${[...byLabel.keys()].join(', ')}`);

  // Compute windowed features per activity
  const windowedFeatures = new Map<string, WindowFeatures[]>();

  for (const [label, samples] of byLabel) {
    const features: WindowFeatures[] = [];
    for (let i = 0; i + windowSize <= samples.length; i += windowSize) {
      const window = samples.slice(i, i + windowSize);
      features.push(computeWindowFeatures(window, samplingHz));
    }
    windowedFeatures.set(label, features);
    console.log(`  ${label}: ${features.length} windows`);
  }

  // Build activity profiles
  const activityProfiles: Record<string, ActivityProfile> = {};

  for (const [label, features] of windowedFeatures) {
    if (features.length === 0) continue;
    activityProfiles[label] = {
      acc_mean: minMaxMedian(features.map((f) => f.acc_magnitude_mean)),
      acc_std: minMaxMedian(features.map((f) => f.acc_magnitude_std)),
      gyro_mean: minMaxMedian(features.map((f) => f.gyro_magnitude_mean)),
      gyro_std: minMaxMedian(features.map((f) => f.gyro_magnitude_std)),
      odba: minMaxMedian(features.map((f) => f.odba)),
      dominant_freq: minMaxMedian(features.map((f) => f.dominant_frequency)),
      sample_count: features.length,
    };
  }

  // Compute discrimination thresholds
  const thresholds: Threshold[] = [];
  const labels = [...windowedFeatures.keys()];

  const discriminationPairs: [string, string, string][] = [
    ['walking', 'standing', 'acc_magnitude_mean'],
    ['lying_chest', 'sitting', 'acc_magnitude_mean'],
    ['trotting', 'walking', 'dominant_frequency'],
    ['galloping', 'trotting', 'acc_magnitude_mean'],
    ['sniffing', 'standing', 'gyro_magnitude_std'],
  ];

  for (const [a, b, feature] of discriminationPairs) {
    const featA = windowedFeatures.get(a);
    const featB = windowedFeatures.get(b);
    if (!featA || !featB) continue;

    const valuesA = featA.map((f) => f[feature as keyof WindowFeatures]);
    const valuesB = featB.map((f) => f[feature as keyof WindowFeatures]);

    // Simple threshold: midpoint of medians
    const medA = median(valuesA);
    const medB = median(valuesB);
    const threshold = (medA + medB) / 2;

    // Confidence: fraction correctly classified by this threshold
    const correctA = valuesA.filter((v) => (medA > medB ? v > threshold : v < threshold)).length;
    const correctB = valuesB.filter((v) => (medA > medB ? v <= threshold : v >= threshold)).length;
    const confidence = (correctA + correctB) / (valuesA.length + valuesB.length);

    thresholds.push({ activity_a: a, activity_b: b, feature, threshold, confidence });
  }

  // Compute confusion pairs (simplified: overlap of acc_magnitude distributions)
  const confusionPairs: ConfusionPair[] = [];
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      const featI = windowedFeatures.get(labels[i])!;
      const featJ = windowedFeatures.get(labels[j])!;
      if (!featI.length || !featJ.length) continue;

      const valsI = featI.map((f) => f.acc_magnitude_mean);
      const valsJ = featJ.map((f) => f.acc_magnitude_mean);

      // Overlap: fraction of samples within 1 std of each other's mean
      const meanI = mean(valsI);
      const meanJ = mean(valsJ);
      const stdI = std(valsI);
      const stdJ = std(valsJ);

      const overlapI = valsI.filter((v) => Math.abs(v - meanJ) < stdJ).length / valsI.length;
      const overlapJ = valsJ.filter((v) => Math.abs(v - meanI) < stdI).length / valsJ.length;
      const confusionRate = (overlapI + overlapJ) / 2;

      if (confusionRate > 0.05) {
        confusionPairs.push({ a: labels[i], b: labels[j], confusion_rate: Math.round(confusionRate * 100) / 100 });
      }
    }
  }
  confusionPairs.sort((a, b) => b.confusion_rate - a.confusion_rate);

  // Build output
  const output = {
    activity_profiles: activityProfiles,
    discrimination_thresholds: thresholds,
    confusion_pairs: confusionPairs,
    metadata: {
      source: 'mendeley_vxhx934tbn',
      n_samples: allSamples.length,
      n_windows: Object.values(activityProfiles).reduce((s, p) => s + p.sample_count, 0),
      sampling_hz: samplingHz,
      window_size_samples: windowSize,
      checksum: checksum.slice(0, 12),
      processed_at: new Date().toISOString(),
    },
  };

  // Write output JSON
  const outputPath = resolve(dataDir, 'imu_behavior_profiles.json');
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nWritten profiles to ${outputPath}`);

  if (dryRun) {
    console.log('\n[DRY RUN] Skipping SQL generation.');
    return;
  }

  // Generate SQL inserts
  const sqlLines: string[] = [];

  // Activity profiles
  for (const [label, profile] of Object.entries(activityProfiles)) {
    const statsJson = JSON.stringify(profile).replace(/'/g, "''");
    sqlLines.push(
      `INSERT INTO imu_activity_profiles (activity_label, feature_stats, placement, source_dataset, sample_count) VALUES ('${label}', '${statsJson}'::jsonb, 'collar', 'mendeley_dog_behavior', ${profile.sample_count}) ON CONFLICT (activity_label) DO UPDATE SET feature_stats = EXCLUDED.feature_stats, sample_count = EXCLUDED.sample_count;`
    );
  }

  // Discrimination thresholds
  for (const t of thresholds) {
    sqlLines.push(
      `INSERT INTO imu_discrimination_thresholds (activity_a, activity_b, feature_name, threshold_value, confidence, placement, source_dataset) VALUES ('${t.activity_a}', '${t.activity_b}', '${t.feature}', ${t.threshold}, ${t.confidence}, 'collar', 'mendeley_dog_behavior') ON CONFLICT (activity_a, activity_b, feature_name, placement) DO UPDATE SET threshold_value = EXCLUDED.threshold_value, confidence = EXCLUDED.confidence;`
    );
  }

  // Dataset version
  sqlLines.push(
    `INSERT INTO dataset_versions (dataset_id, version_tag, checksum_sha256, record_count, notes) VALUES ('mendeley_dog_behavior', '${checksum.slice(0, 12)}', '${checksum}', ${allSamples.length}, 'Auto-ingested by ingest_imu_behavior.ts') ON CONFLICT DO NOTHING;`
  );

  const sqlPath = resolve(dataDir, 'imu_behavior_insert.sql');
  writeFileSync(sqlPath, sqlLines.join('\n'));
  console.log(`SQL written to ${sqlPath}`);

  // Summary
  console.log('\n── IMU Behavior Ingestion Summary ──');
  console.log(`  Activities:    ${Object.keys(activityProfiles).length}`);
  console.log(`  Thresholds:    ${thresholds.length}`);
  console.log(`  Confusion:     ${confusionPairs.length} pairs`);
  console.log(`  Top confusion: ${confusionPairs[0]?.a} vs ${confusionPairs[0]?.b} (${confusionPairs[0]?.confusion_rate})`);
}

main().catch((err) => {
  console.error('IMU behavior ingestion failed:', err);
  process.exit(1);
});
