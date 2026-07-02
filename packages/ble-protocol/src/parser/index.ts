/**
 * BLE SensorFrame binary parser and serializer.
 *
 * All multi-byte values are little-endian to match ESP32-S3 native byte order.
 * CRC is a simple XOR of all bytes preceding the CRC byte.
 */

import { BLE_FRAME_HEADER, BLE_FRAME_VERSION } from '@emopet/shared';
import {
  type FrameHeader,
  type FrameSource,
  type MatPayload,
  type TagPayload,
  type MatFrame,
  type TagFrame,
  type SensorFrame,
  SOURCE_MAT,
  SOURCE_TAG,
  HEADER_SIZE,
  MAT_FRAME_SIZE,
  TAG_FRAME_SIZE,
} from '../frames/index.js';

// ── Error Types ─────────────────────────────────────────────────

export class BleParseError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_HEADER'
      | 'INVALID_VERSION'
      | 'INVALID_SOURCE'
      | 'INVALID_LENGTH'
      | 'CRC_MISMATCH',
  ) {
    super(message);
    this.name = 'BleParseError';
  }
}

// ── CRC ─────────────────────────────────────────────────────────

/** Compute XOR checksum of all bytes in the range [0, length). */
export function computeCrc(data: Uint8Array, length: number): number {
  let crc = 0;
  for (let i = 0; i < length; i++) {
    crc ^= data[i]!;
  }
  return crc;
}

// ── Header Parsing ──────────────────────────────────────────────

function parseHeader(view: DataView): FrameHeader {
  const header = view.getUint8(0);
  if (header !== BLE_FRAME_HEADER) {
    throw new BleParseError(
      `Expected header 0x${BLE_FRAME_HEADER.toString(16)}, got 0x${header.toString(16)}`,
      'INVALID_HEADER',
    );
  }

  const version = view.getUint8(1);
  if (version !== BLE_FRAME_VERSION) {
    throw new BleParseError(
      `Expected version 0x${BLE_FRAME_VERSION.toString(16)}, got 0x${version.toString(16)}`,
      'INVALID_VERSION',
    );
  }

  const sourceByte = view.getUint8(2);
  if (sourceByte !== SOURCE_MAT && sourceByte !== SOURCE_TAG) {
    throw new BleParseError(
      `Unknown source 0x${sourceByte.toString(16)}`,
      'INVALID_SOURCE',
    );
  }
  const source: FrameSource = sourceByte;

  return {
    header: 0xea,
    version,
    source,
    seq: view.getUint8(3),
    timestampMs: view.getUint32(4, true),
  };
}

// ── MAT Payload Parsing ─────────────────────────────────────────

function parseMatPayload(view: DataView, offset: number): MatPayload {
  let o = offset;
  const respiratoryRate = view.getUint16(o, true); o += 2;
  const respiratoryRegularity = view.getUint8(o); o += 1;
  const microMovementEnergy = view.getUint8(o); o += 1;
  const weightGrams = view.getUint16(o, true); o += 2;
  const copX = view.getInt16(o, true); o += 2;
  const copY = view.getInt16(o, true); o += 2;
  const weightStability = view.getUint16(o, true); o += 2;
  const fl = view.getUint16(o, true); o += 2;
  const fr = view.getUint16(o, true); o += 2;
  const rl = view.getUint16(o, true); o += 2;
  const rr = view.getUint16(o, true); o += 2;
  const temperatureC10 = view.getInt16(o, true); o += 2;
  const humidityPct10 = view.getUint16(o, true); o += 2;
  const pvdfReliability = view.getUint8(o); o += 1;
  const loadCellReliability = view.getUint8(o);

  return {
    respiratoryRate,
    respiratoryRegularity,
    microMovementEnergy,
    weightGrams,
    copX,
    copY,
    weightStability,
    corners: [fl, fr, rl, rr],
    temperatureC10,
    humidityPct10,
    pvdfReliability,
    loadCellReliability,
  };
}

// ── TAG Payload Parsing ─────────────────────────────────────────

function parseTagPayload(view: DataView, offset: number): TagPayload {
  let o = offset;
  const activityMg = view.getUint16(o, true); o += 2;
  const posture = view.getUint8(o); o += 1;
  const agitationIndex = view.getUint8(o); o += 1;
  const collarOrientationOk = view.getUint8(o); o += 1;
  const vocalEvents = view.getUint8(o); o += 1;
  const vocalEnergyMean = view.getUint16(o, true); o += 2;
  const vocalCentroidHz = view.getUint16(o, true); o += 2;
  const vibroConfirmed = view.getUint8(o); o += 1;
  const throatRespRate = view.getUint16(o, true); o += 2;
  const latitudeE6 = view.getInt32(o, true); o += 4;
  const longitudeE6 = view.getInt32(o, true); o += 4;
  const imuReliability = view.getUint8(o); o += 1;
  const micReliability = view.getUint8(o); o += 1;
  const piezoReliability = view.getUint8(o); o += 1;
  const gpsReliability = view.getUint8(o);

  return {
    activityMg,
    posture,
    agitationIndex,
    collarOrientationOk,
    vocalEvents,
    vocalEnergyMean,
    vocalCentroidHz,
    vibroConfirmed,
    throatRespRate,
    latitudeE6,
    longitudeE6,
    imuReliability,
    micReliability,
    piezoReliability,
    gpsReliability,
  };
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Parse a raw BLE notification into a typed SensorFrame.
 * Validates header, version, source, length, and CRC.
 */
export function parseSensorFrame(raw: Uint8Array): SensorFrame {
  if (raw.length < HEADER_SIZE + 1) {
    throw new BleParseError(
      `Frame too short: ${raw.length} bytes`,
      'INVALID_LENGTH',
    );
  }

  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const header = parseHeader(view);

  const expectedSize = header.source === SOURCE_MAT ? MAT_FRAME_SIZE : TAG_FRAME_SIZE;
  if (raw.length !== expectedSize) {
    throw new BleParseError(
      `Expected ${expectedSize} bytes for source 0x${header.source.toString(16)}, got ${raw.length}`,
      'INVALID_LENGTH',
    );
  }

  // CRC check: XOR of all bytes except the last one
  const expectedCrc = computeCrc(raw, raw.length - 1);
  const actualCrc = raw[raw.length - 1]!;
  if (expectedCrc !== actualCrc) {
    throw new BleParseError(
      `CRC mismatch: expected 0x${expectedCrc.toString(16)}, got 0x${actualCrc.toString(16)}`,
      'CRC_MISMATCH',
    );
  }

  if (header.source === SOURCE_MAT) {
    return { header, payload: parseMatPayload(view, HEADER_SIZE) } satisfies MatFrame;
  }
  return { header, payload: parseTagPayload(view, HEADER_SIZE) } satisfies TagFrame;
}

/**
 * Check if a frame is from the MAT.
 */
export function isMatFrame(frame: SensorFrame): frame is MatFrame {
  return frame.header.source === SOURCE_MAT;
}

/**
 * Check if a frame is from the TAG.
 */
export function isTagFrame(frame: SensorFrame): frame is TagFrame {
  return frame.header.source === SOURCE_TAG;
}

// ── Serialization (for testing / simulator) ─────────────────────

function writeHeader(view: DataView, header: FrameHeader): void {
  view.setUint8(0, BLE_FRAME_HEADER);
  view.setUint8(1, header.version);
  view.setUint8(2, header.source);
  view.setUint8(3, header.seq);
  view.setUint32(4, header.timestampMs, true);
}

function writeMatPayload(view: DataView, offset: number, p: MatPayload): void {
  let o = offset;
  view.setUint16(o, p.respiratoryRate, true); o += 2;
  view.setUint8(o, p.respiratoryRegularity); o += 1;
  view.setUint8(o, p.microMovementEnergy); o += 1;
  view.setUint16(o, p.weightGrams, true); o += 2;
  view.setInt16(o, p.copX, true); o += 2;
  view.setInt16(o, p.copY, true); o += 2;
  view.setUint16(o, p.weightStability, true); o += 2;
  view.setUint16(o, p.corners[0], true); o += 2;
  view.setUint16(o, p.corners[1], true); o += 2;
  view.setUint16(o, p.corners[2], true); o += 2;
  view.setUint16(o, p.corners[3], true); o += 2;
  view.setInt16(o, p.temperatureC10, true); o += 2;
  view.setUint16(o, p.humidityPct10, true); o += 2;
  view.setUint8(o, p.pvdfReliability); o += 1;
  view.setUint8(o, p.loadCellReliability);
}

function writeTagPayload(view: DataView, offset: number, p: TagPayload): void {
  let o = offset;
  view.setUint16(o, p.activityMg, true); o += 2;
  view.setUint8(o, p.posture); o += 1;
  view.setUint8(o, p.agitationIndex); o += 1;
  view.setUint8(o, p.collarOrientationOk); o += 1;
  view.setUint8(o, p.vocalEvents); o += 1;
  view.setUint16(o, p.vocalEnergyMean, true); o += 2;
  view.setUint16(o, p.vocalCentroidHz, true); o += 2;
  view.setUint8(o, p.vibroConfirmed); o += 1;
  view.setUint16(o, p.throatRespRate, true); o += 2;
  view.setInt32(o, p.latitudeE6, true); o += 4;
  view.setInt32(o, p.longitudeE6, true); o += 4;
  view.setUint8(o, p.imuReliability); o += 1;
  view.setUint8(o, p.micReliability); o += 1;
  view.setUint8(o, p.piezoReliability); o += 1;
  view.setUint8(o, p.gpsReliability);
}

/** Serialize a MatFrame to a Uint8Array with CRC. */
export function serializeMatFrame(frame: MatFrame): Uint8Array {
  const buf = new Uint8Array(MAT_FRAME_SIZE);
  const view = new DataView(buf.buffer);
  writeHeader(view, frame.header);
  writeMatPayload(view, HEADER_SIZE, frame.payload);
  buf[MAT_FRAME_SIZE - 1] = computeCrc(buf, MAT_FRAME_SIZE - 1);
  return buf;
}

/** Serialize a TagFrame to a Uint8Array with CRC. */
export function serializeTagFrame(frame: TagFrame): Uint8Array {
  const buf = new Uint8Array(TAG_FRAME_SIZE);
  const view = new DataView(buf.buffer);
  writeHeader(view, frame.header);
  writeTagPayload(view, HEADER_SIZE, frame.payload);
  buf[TAG_FRAME_SIZE - 1] = computeCrc(buf, TAG_FRAME_SIZE - 1);
  return buf;
}

/** Serialize any SensorFrame. */
export function serializeFrame(frame: SensorFrame): Uint8Array {
  if (isMatFrame(frame)) return serializeMatFrame(frame);
  return serializeTagFrame(frame as TagFrame);
}
