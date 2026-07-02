/**
 * FeatureVector — per-window features sent from firmware to backend.
 *
 * A FeatureVector is the canonical input to the ELI EKF observation update.
 * Each field is extracted by firmware on a sliding window (typically 5 min
 * for respiratory features, 30 min for activity features). Null means the
 * feature could not be computed on this window (insufficient valid samples).
 * The EKF treats null as a missing observation (R_t -> infinity), never
 * substitutes a mean or zero.
 *
 * v6 additions (spec 2026-04): rr_variability, activity_variability,
 * tremor_detected, plus kinematic features needed by V11.
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
  /**
   * v6: Std of inter-breath intervals (seconds) on a rolling 5-min buffer.
   * Null if fewer than 30 valid breaths in the buffer.
   * Reference: Homma & Masaoka (2008), Exp Physiol — expiratory-time
   * variability tracks individual anxiety independent of metabolic demand.
   */
  rr_variability: number | null;

  // ── Activity (from IMU BMI270 on TAG) ─────────────────────────
  /** Overall Dynamic Body Acceleration mean over window (g units). */
  odba_mean: number | null;
  /** Percent of window classified as "active" (ODBA above threshold). */
  activity_minutes_pct: number | null;
  /**
   * v6: Coefficient of variation (std/mean) of 1-sec ODBA over a rolling
   * 30-min buffer. Null when <50% of samples are valid (after BODY_SHAKE
   * suppression).
   */
  activity_variability: number | null;
  /**
   * v6: True if IMU HF band (8-15 Hz) RMS > 0.08 g for >=3 consecutive
   * seconds in the window.
   */
  tremor_detected: boolean;

  // ── Kinematic features (TAG) used by V11 HIGH_ANIMAL_INTERACTION ──
  /** RMS of lateral (body-Y) accel during the window, in g units. */
  lateral_acc_rms: number | null;
  /** Std of gyroscope magnitude (deg/s) during the window. */
  gyro_std_deg_s: number | null;

  // ── Audio (TAG mic, privacy-preserving energy-only) ───────────
  vocal_event_in_window: boolean;
  vocal_energy_mean: number | null;

  // ── Environment (BME280) ──────────────────────────────────────
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

/**
 * SensorFrame — a raw or summarized multi-sensor snapshot from firmware.
 * Unchanged vs v5: it carries windowed sensor data from which FeatureVector
 * is derived. Kept here as a type for protocol clarity.
 */
export interface SensorFrame {
  timestamp: Date;
  dogId: string;
  deviceId: string;
  windowSeconds: number;
  featureVector: FeatureVector;
}
