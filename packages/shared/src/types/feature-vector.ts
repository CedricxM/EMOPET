/**
 * ELI-IO feature contracts.
 *
 * Canonical boundary names:
 * - FeatureExtractionResult: features computed from parsed device data.
 * - FeatureIngestionEnvelope: device/dog/window metadata around those features.
 * - EliInput: the feature object consumed by the ELI scientific engine.
 *
 * These names are intentionally distinct from BLE wire and parsed frame types.
 * Naming a boundary does not prove that the physical device -> ELI transformation
 * is implemented or scientifically validated.
 */

export type FirmwareVersion = `${number}.${number}.${number}`;

export interface FeatureVector {
  /** Window end timestamp (ISO or Date at serialization boundary). */
  timestamp: Date;
  dogId: string;
  deviceSource: 'MAT' | 'TAG';
  firmwareVersion: FirmwareVersion;

  // ── Respiratory (from PVDF on MAT) ────────────────────────────
  /** Mean respiratory rate in breaths/min over window. */
  rr_mean: number | null;
  /** RR measurement confidence [0,1] from firmware quality metric. */
  rr_confidence: number | null;
  /** Std of inter-breath intervals (seconds) on a rolling 5-min buffer. */
  rr_variability: number | null;

  // ── Activity (from IMU BMI270 on TAG) ─────────────────────────
  /** Overall Dynamic Body Acceleration mean over window (g units). */
  odba_mean: number | null;
  /** Percent of window classified as active. */
  activity_minutes_pct: number | null;
  /** Coefficient of variation of 1-sec ODBA over a rolling 30-min buffer. */
  activity_variability: number | null;
  /** True when the firmware tremor detector qualifies the configured pattern. */
  tremor_detected: boolean;

  // ── Kinematic features (TAG) ──────────────────────────────────
  /** RMS of lateral (body-Y) acceleration during the window, in g units. */
  lateral_acc_rms: number | null;
  /** Std of gyroscope magnitude (deg/s) during the window. */
  gyro_std_deg_s: number | null;

  // ── Audio (TAG mic, privacy-preserving feature path) ──────────
  vocal_event_in_window: boolean;
  vocal_energy_mean: number | null;

  // ── Environment ───────────────────────────────────────────────
  ambient_temp_c: number | null;
  humidity_pct: number | null;

  // ── Per-sensor quality for RSM (0..1) ─────────────────────────
  quality: {
    pvdf: number;
    imu: number;
    mic: number;
    loadCells: number;
    piezo: number;
    gps: number;
  };
}

/** Canonical result of feature extraction before transport/ingestion metadata. */
export type FeatureExtractionResult = FeatureVector;

/** Canonical scientific input type accepted by the ELI engine. */
export type EliInput = FeatureVector;

/**
 * Canonical application/backend ingestion envelope around extracted features.
 * This is not the BLE wire frame and not the parsed BLE protocol object.
 */
export interface FeatureIngestionEnvelope {
  timestamp: Date;
  dogId: string;
  deviceId: string;
  windowSeconds: number;
  featureVector: FeatureExtractionResult;
}

/**
 * @deprecated Historical ambiguous name. Use FeatureIngestionEnvelope.
 */
export type SensorFrame = FeatureIngestionEnvelope;
