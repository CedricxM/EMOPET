/**
 * BLE SensorFrame binary protocol types.
 *
 * Frame layout (little-endian unless noted):
 * ┌─────────┬─────────┬────────┬──────┬─────────┬─────────────┬────┐
 * │ header  │ version │ source │ seq  │ ts_ms   │ payload     │ crc│
 * │ 1 byte  │ 1 byte  │ 1 byte │ 1 B  │ 4 bytes │ variable    │ 1B │
 * └─────────┴─────────┴────────┴──────┴─────────┴─────────────┴────┘
 *
 * header  = 0xEA (constant)
 * version = 0x01 (V1 protocol)
 * source  = 0x01 (MAT) | 0x02 (TAG)
 * seq     = rolling 0–255 sequence number
 * ts_ms   = milliseconds since device boot (uint32, wraps at ~49 days)
 * payload = source-dependent sensor data
 * crc     = XOR of all preceding bytes (simple integrity check)
 */

// ── Source Identifiers ──────────────────────────────────────────

export const SOURCE_MAT = 0x01 as const;
export const SOURCE_TAG = 0x02 as const;
export type FrameSource = typeof SOURCE_MAT | typeof SOURCE_TAG;

// ── Common Frame Header ─────────────────────────────────────────

export interface FrameHeader {
  header: 0xea;
  version: number;
  source: FrameSource;
  seq: number;
  /** Milliseconds since device boot. */
  timestampMs: number;
}

// ── MAT Payload ─────────────────────────────────────────────────
// Total payload: 28 bytes

export interface MatPayload {
  /** PVDF respiratory rate in bpm × 10 (uint16). 0 = invalid. */
  respiratoryRate: number;
  /** PVDF respiratory regularity index × 100 (uint8, 0–100). */
  respiratoryRegularity: number;
  /** PVDF micro-movement energy × 100 (uint8). */
  microMovementEnergy: number;
  /** Total weight in grams (uint16). */
  weightGrams: number;
  /** Center of pressure X in mm from center (int16, signed). */
  copX: number;
  /** Center of pressure Y in mm from center (int16, signed). */
  copY: number;
  /** Weight stability index × 100 (uint16). */
  weightStability: number;
  /** Load cell per-corner readings in grams [FL, FR, RL, RR] (uint16 × 4). */
  corners: [number, number, number, number];
  /** BME280 temperature in °C × 10 (int16, signed). */
  temperatureC10: number;
  /** BME280 humidity in % × 10 (uint16). */
  humidityPct10: number;
  /** PVDF reliability state: 0=VALID, 1=DEGRADED, 2=SUPPRESSED (uint8). */
  pvdfReliability: number;
  /** Load cell reliability state (uint8). */
  loadCellReliability: number;
}

// ── TAG Payload ─────────────────────────────────────────────────
// Total payload: 22 bytes

export interface TagPayload {
  /** IMU activity magnitude × 1000 (uint16, in milli-g). */
  activityMg: number;
  /** Posture class: 0=unknown, 1=prone, 2=lateral_left, 3=lateral_right, 4=sitting, 5=standing (uint8). */
  posture: number;
  /** Agitation index × 100 (uint8). */
  agitationIndex: number;
  /** Collar orientation quality: 0=bad, 1=good (uint8). */
  collarOrientationOk: number;
  /** Vocal event count in this interval (uint8). */
  vocalEvents: number;
  /** Vocal energy mean × 100 (uint16). */
  vocalEnergyMean: number;
  /** Vocal spectral centroid in Hz (uint16). */
  vocalCentroidHz: number;
  /** Throat vibration confirmation flag (uint8, 0 or 1). */
  vibroConfirmed: number;
  /** Throat respiratory rate × 10 (uint16). 0 = invalid. */
  throatRespRate: number;
  /** GPS latitude × 1e6 (int32, signed). 0x7FFFFFFF = no fix. */
  latitudeE6: number;
  /** GPS longitude × 1e6 (int32, signed). 0x7FFFFFFF = no fix. */
  longitudeE6: number;
  /** IMU reliability state (uint8). */
  imuReliability: number;
  /** Mic reliability state (uint8). */
  micReliability: number;
  /** Piezo reliability state (uint8). */
  piezoReliability: number;
  /** GPS reliability state (uint8). */
  gpsReliability: number;
}

// ── Parsed Frame ────────────────────────────────────────────────

export interface MatFrame {
  header: FrameHeader;
  payload: MatPayload;
}

export interface TagFrame {
  header: FrameHeader;
  payload: TagPayload;
}

export type SensorFrame = MatFrame | TagFrame;

// ── Frame Sizes ─────────────────────────────────────────────────

/** Header (1+1+1+1+4) = 8 bytes. */
export const HEADER_SIZE = 8;
/** MAT payload size in bytes. */
export const MAT_PAYLOAD_SIZE = 28;
/** TAG payload size in bytes. */
export const TAG_PAYLOAD_SIZE = 22;
/** CRC size = 1 byte. */
export const CRC_SIZE = 1;

export const MAT_FRAME_SIZE = HEADER_SIZE + MAT_PAYLOAD_SIZE + CRC_SIZE; // 37
export const TAG_FRAME_SIZE = HEADER_SIZE + TAG_PAYLOAD_SIZE + CRC_SIZE; // 31
