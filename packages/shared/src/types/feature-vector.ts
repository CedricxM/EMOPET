/**
 * FeatureVector — candidate per-window input shape consumed by the ELI engine.
 *
 * IMPORTANT RUNTIME BOUNDARY:
 * The repository does not currently prove an implemented device ->
 * FeatureVector uplink. The active BLE parser uses the distinct binary
 * `SensorFrame` contract owned by `@emopet/ble-protocol`, while mobile BLE
 * subscription and backend ingestion remain incomplete. Do not treat this type
 * as evidence that firmware, mobile or backend currently emits/transports it.
 *
 * Null means the feature could not be computed for the relevant window. The
 * ELI observation code treats null as a missing observation rather than
 * substituting a mean or zero.
 *
 * v6 candidate additions include rr_variability, activity_variability and
 * tremor_detected, plus kinematic features needed by V11. Exact feature
 * semantics remain controlled by their dedicated science/firmware gates.
 */

export type FirmwareVersion = `${number}.${number}.${number}`;

export interface FeatureVector {
  /** Candidate wall-clock window end; authoritative event-time mapping remains OPEN. */
  timestamp: Date;
  /** Canonical dog binding is required before runtime use; current BLE frames do not carry this UUID. */
  dogId: string;
  deviceSource: 'MAT' | 'TAG';
  firmwareVersion: FirmwareVersion;

  // ── Respiratory (from PVDF on MAT) ────────────────────────────
  /** Mean respiratory rate in breaths/min over window. */
  rr_mean: number | null;
  /** RR measurement confidence [0,1] from firmware quality metric. */
  rr_confidence: number | null;
  /**
   * Current code-shape candidate: std of inter-breath intervals (seconds) on a
   * rolling 5-min buffer, null with insufficient valid breaths.
   *
   * WARNING: #86 records a conflicting CV/60 s contract in controlled docs.
   * This comment describes the current typed/code candidate only and is NOT a
   * settled scientific or firmware semantic authority.
   */
  rr_variability: number | null;

  // ── Activity (from IMU BMI270 on TAG) ─────────────────────────
  /** Overall Dynamic Body Acceleration mean over window (g units). */
  odba_mean: number | null;
  /** Percent of window classified as "active" (ODBA above threshold). */
  activity_minutes_pct: number | null;
  /**
   * Candidate deterministic feature: coefficient of variation (std/mean) of
   * 1-sec ODBA over a rolling 30-min buffer, null when <50% of samples are
   * valid after BODY_SHAKE suppression. The ELI interpretation remains OPEN
   * under #87.
   */
  activity_variability: number | null;
  /**
   * Candidate deterministic event flag: IMU HF band (8-15 Hz) RMS > 0.08 g
   * for >=3 consecutive seconds in the window. Validation authority is
   * separate from this transport type.
   */
  tremor_detected: boolean;

  // ── Kinematic features (TAG) used by V11 HIGH_ANIMAL_INTERACTION ──
  /** RMS of lateral (body-Y) accel during the window, in g units. */
  lateral_acc_rms: number | null;
  /** Std of gyroscope magnitude (deg/s) during the window. */
  gyro_std_deg_s: number | null;

  // ── Audio (TAG mic, privacy-preserving energy-only candidate) ──
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
 * Candidate application/backend envelope for an already-derived FeatureVector.
 *
 * This is NOT the BLE `SensorFrame`. The parsed BLE wire contract is
 * `@emopet/ble-protocol::SensorFrame` (`MatFrame | TagFrame`) and contains a
 * protocol header plus source-specific binary payload fields. No authoritative
 * runtime conversion from that BLE frame to this envelope is currently
 * implemented/located at the snapshot boundary.
 */
export interface FeatureVectorEnvelope {
  timestamp: Date;
  dogId: string;
  deviceId: string;
  windowSeconds: number;
  featureVector: FeatureVector;
}

/**
 * @deprecated Historical ambiguous alias. This is not the BLE SensorFrame.
 * Use `FeatureVectorEnvelope` for this shared shape and
 * `@emopet/ble-protocol::SensorFrame` for parsed BLE frames.
 */
export type SensorFrame = FeatureVectorEnvelope;
