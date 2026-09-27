/**
 * Versioned BLE transport contract for the first deterministic ELI feature.
 *
 * Scope is intentionally narrow:
 * - host-side codec + transport semantics only;
 * - no firmware writer;
 * - no mobile subscription/runtime wiring;
 * - no backend route;
 * - no physical-device authentication;
 * - no wall-clock mapping;
 * - no ELI/scientific interpretation.
 *
 * The frame carries enough device-local provenance for a future transport
 * implementation to distinguish boot sessions, sequence/replay identity,
 * window end, coverage and feature-contract version without changing BLE V1
 * SensorFrame bytes.
 */

import {
  ACTIVITY_VARIABILITY_FEATURE_CONTRACT_VERSION,
  type ActivityVariabilityFeatureTransportFrame,
  type ActivityVariabilityNullReason,
  type ActivityVariabilityObservationStatus,
  type ActivityVariabilityQualityState,
} from '@emopet/shared';

import { SOURCE_TAG, type BleWireFrame } from './frames/index.js';
import { computeCrc } from './parser/index.js';

export const FEATURE_SUMMARY_HEADER = 0xeb as const;
export const FEATURE_SUMMARY_TRANSPORT_VERSION = 0x01 as const;
export const FEATURE_ACTIVITY_VARIABILITY = 0x01 as const;
export const FEATURE_ACTIVITY_VARIABILITY_CONTRACT_VERSION = 0x01 as const;

export const FEATURE_QUALITY_VALID = 0x00 as const;
export const FEATURE_QUALITY_DEGRADED = 0x01 as const;
export const FEATURE_QUALITY_SUPPRESSED = 0x02 as const;

export type FeatureQualityState = ActivityVariabilityQualityState;
export type { ActivityVariabilityFeatureTransportFrame } from '@emopet/shared';

const OBSERVED = 0x00;
const NOT_OBSERVED = 0x01;

const NULL_NONE = 0x00;
const NULL_INSUFFICIENT_COVERAGE = 0x01;
const NULL_MEAN_BELOW_DIVISION_GUARD = 0x02;

const HEADER_OFFSET = 0;
const VERSION_OFFSET = 1;
const SOURCE_OFFSET = 2;
const FEATURE_ID_OFFSET = 3;
const CONTRACT_VERSION_OFFSET = 4;
const SEQUENCE_OFFSET = 5;
const BOOT_SESSION_OFFSET = 7;
const WINDOW_END_OFFSET = 11;
const WINDOW_SECONDS_OFFSET = 15;
const VALID_SECONDS_OFFSET = 17;
const STATUS_OFFSET = 19;
const NULL_REASON_OFFSET = 20;
const QUALITY_OFFSET = 21;
const VALUE_OFFSET = 22;
const CRC_OFFSET = 26;

export const ACTIVITY_VARIABILITY_FEATURE_FRAME_SIZE = 27;


export class BleFeatureTransportError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_LENGTH'
      | 'INVALID_HEADER'
      | 'INVALID_VERSION'
      | 'INVALID_SOURCE'
      | 'INVALID_FEATURE'
      | 'INVALID_CONTRACT_VERSION'
      | 'CRC_MISMATCH'
      | 'INVALID_ENUM'
      | 'INVALID_RANGE'
      | 'INVALID_SEMANTICS',
  ) {
    super(message);
    this.name = 'BleFeatureTransportError';
  }
}

function assertUint(value: number, max: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) {
    throw new BleFeatureTransportError(
      `${field} must be an integer in [0, ${max}]`,
      'INVALID_RANGE',
    );
  }
}

function qualityToWire(value: FeatureQualityState): number {
  if (value === 'VALID') return FEATURE_QUALITY_VALID;
  if (value === 'DEGRADED') return FEATURE_QUALITY_DEGRADED;
  if (value === 'SUPPRESSED') return FEATURE_QUALITY_SUPPRESSED;
  throw new BleFeatureTransportError('Unknown quality state', 'INVALID_ENUM');
}

function qualityFromWire(value: number): FeatureQualityState {
  if (value === FEATURE_QUALITY_VALID) return 'VALID';
  if (value === FEATURE_QUALITY_DEGRADED) return 'DEGRADED';
  if (value === FEATURE_QUALITY_SUPPRESSED) return 'SUPPRESSED';
  throw new BleFeatureTransportError(
    `Unknown feature quality state 0x${value.toString(16)}`,
    'INVALID_ENUM',
  );
}

function statusToWire(value: ActivityVariabilityObservationStatus): number {
  if (value === 'OBSERVED') return OBSERVED;
  if (value === 'NOT_OBSERVED') return NOT_OBSERVED;
  throw new BleFeatureTransportError('Unknown observation status', 'INVALID_ENUM');
}

function statusFromWire(value: number): ActivityVariabilityObservationStatus {
  if (value === OBSERVED) return 'OBSERVED';
  if (value === NOT_OBSERVED) return 'NOT_OBSERVED';
  throw new BleFeatureTransportError(
    `Unknown feature observation status 0x${value.toString(16)}`,
    'INVALID_ENUM',
  );
}

function nullReasonToWire(value: ActivityVariabilityNullReason | null): number {
  if (value === null) return NULL_NONE;
  if (value === 'INSUFFICIENT_COVERAGE') return NULL_INSUFFICIENT_COVERAGE;
  if (value === 'MEAN_BELOW_DIVISION_GUARD') return NULL_MEAN_BELOW_DIVISION_GUARD;
  throw new BleFeatureTransportError('Unknown null reason', 'INVALID_ENUM');
}

function nullReasonFromWire(value: number): ActivityVariabilityNullReason | null {
  if (value === NULL_NONE) return null;
  if (value === NULL_INSUFFICIENT_COVERAGE) return 'INSUFFICIENT_COVERAGE';
  if (value === NULL_MEAN_BELOW_DIVISION_GUARD) return 'MEAN_BELOW_DIVISION_GUARD';
  throw new BleFeatureTransportError(
    `Unknown feature null reason 0x${value.toString(16)}`,
    'INVALID_ENUM',
  );
}

function validateSemantics(frame: ActivityVariabilityFeatureTransportFrame): void {
  assertUint(frame.sequence, 0xffff, 'sequence');
  assertUint(frame.bootSessionId, 0xffffffff, 'bootSessionId');
  assertUint(frame.windowEndMs, 0xffffffff, 'windowEndMs');
  assertUint(frame.validSeconds, 1800, 'validSeconds');

  if (frame.transportVersion !== FEATURE_SUMMARY_TRANSPORT_VERSION) {
    throw new BleFeatureTransportError('Unsupported transport version', 'INVALID_VERSION');
  }
  if (frame.source !== 'TAG') {
    throw new BleFeatureTransportError('activity_variability source must be TAG', 'INVALID_SOURCE');
  }
  if (frame.featureKey !== 'activity_variability') {
    throw new BleFeatureTransportError('Unsupported feature key', 'INVALID_FEATURE');
  }
  if (frame.featureContractVersion !== ACTIVITY_VARIABILITY_FEATURE_CONTRACT_VERSION) {
    throw new BleFeatureTransportError('Unsupported feature-contract version', 'INVALID_CONTRACT_VERSION');
  }
  if (frame.windowSeconds !== 1800) {
    throw new BleFeatureTransportError('activity_variability window must be 1800 seconds', 'INVALID_SEMANTICS');
  }

  if (frame.observationStatus === 'OBSERVED') {
    if (
      frame.value === null
      || !Number.isFinite(frame.value)
      || frame.value < 0
      || frame.nullReason !== null
      || frame.validSeconds < 900
      || frame.qualityState === 'SUPPRESSED'
    ) {
      throw new BleFeatureTransportError('Invalid OBSERVED activity_variability shape', 'INVALID_SEMANTICS');
    }
    return;
  }

  if (frame.value !== null || frame.nullReason === null) {
    throw new BleFeatureTransportError('Invalid NOT_OBSERVED activity_variability shape', 'INVALID_SEMANTICS');
  }

  if (
    frame.nullReason === 'INSUFFICIENT_COVERAGE'
    && frame.validSeconds >= 900
  ) {
    throw new BleFeatureTransportError('INSUFFICIENT_COVERAGE requires <900 valid seconds', 'INVALID_SEMANTICS');
  }

  if (
    frame.nullReason === 'MEAN_BELOW_DIVISION_GUARD'
    && frame.validSeconds < 900
  ) {
    throw new BleFeatureTransportError('MEAN_BELOW_DIVISION_GUARD requires >=900 valid seconds', 'INVALID_SEMANTICS');
  }
}

/**
 * Serialize the first feature-summary transport frame.
 *
 * Null observations encode the float slot as 0.0, but the status/null-reason
 * bytes remain authoritative. Parser validation rejects any non-zero hidden
 * value in a NOT_OBSERVED frame.
 */
export function serializeActivityVariabilityFeatureFrame(
  frame: ActivityVariabilityFeatureTransportFrame,
): BleWireFrame {
  validateSemantics(frame);

  const bytes = new Uint8Array(ACTIVITY_VARIABILITY_FEATURE_FRAME_SIZE);
  const view = new DataView(bytes.buffer);

  view.setUint8(HEADER_OFFSET, FEATURE_SUMMARY_HEADER);
  view.setUint8(VERSION_OFFSET, FEATURE_SUMMARY_TRANSPORT_VERSION);
  view.setUint8(SOURCE_OFFSET, SOURCE_TAG);
  view.setUint8(FEATURE_ID_OFFSET, FEATURE_ACTIVITY_VARIABILITY);
  view.setUint8(CONTRACT_VERSION_OFFSET, FEATURE_ACTIVITY_VARIABILITY_CONTRACT_VERSION);
  view.setUint16(SEQUENCE_OFFSET, frame.sequence, true);
  view.setUint32(BOOT_SESSION_OFFSET, frame.bootSessionId, true);
  view.setUint32(WINDOW_END_OFFSET, frame.windowEndMs, true);
  view.setUint16(WINDOW_SECONDS_OFFSET, frame.windowSeconds, true);
  view.setUint16(VALID_SECONDS_OFFSET, frame.validSeconds, true);
  view.setUint8(STATUS_OFFSET, statusToWire(frame.observationStatus));
  view.setUint8(NULL_REASON_OFFSET, nullReasonToWire(frame.nullReason));
  view.setUint8(QUALITY_OFFSET, qualityToWire(frame.qualityState));
  view.setFloat32(VALUE_OFFSET, frame.value ?? 0, true);
  view.setUint8(CRC_OFFSET, computeCrc(bytes, CRC_OFFSET));

  return bytes;
}

export function parseActivityVariabilityFeatureFrame(
  raw: BleWireFrame,
): ActivityVariabilityFeatureTransportFrame {
  if (raw.length !== ACTIVITY_VARIABILITY_FEATURE_FRAME_SIZE) {
    throw new BleFeatureTransportError(
      `Expected ${ACTIVITY_VARIABILITY_FEATURE_FRAME_SIZE} feature bytes, got ${raw.length}`,
      'INVALID_LENGTH',
    );
  }

  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

  if (view.getUint8(HEADER_OFFSET) !== FEATURE_SUMMARY_HEADER) {
    throw new BleFeatureTransportError('Invalid feature-summary header', 'INVALID_HEADER');
  }
  if (view.getUint8(VERSION_OFFSET) !== FEATURE_SUMMARY_TRANSPORT_VERSION) {
    throw new BleFeatureTransportError('Unsupported feature transport version', 'INVALID_VERSION');
  }
  if (view.getUint8(SOURCE_OFFSET) !== SOURCE_TAG) {
    throw new BleFeatureTransportError('activity_variability source must be TAG', 'INVALID_SOURCE');
  }
  if (view.getUint8(FEATURE_ID_OFFSET) !== FEATURE_ACTIVITY_VARIABILITY) {
    throw new BleFeatureTransportError('Unsupported feature identifier', 'INVALID_FEATURE');
  }
  if (
    view.getUint8(CONTRACT_VERSION_OFFSET)
    !== FEATURE_ACTIVITY_VARIABILITY_CONTRACT_VERSION
  ) {
    throw new BleFeatureTransportError('Unsupported feature-contract version', 'INVALID_CONTRACT_VERSION');
  }

  const expectedCrc = computeCrc(raw, CRC_OFFSET);
  const actualCrc = view.getUint8(CRC_OFFSET);
  if (expectedCrc !== actualCrc) {
    throw new BleFeatureTransportError(
      `Feature CRC mismatch: expected 0x${expectedCrc.toString(16)}, got 0x${actualCrc.toString(16)}`,
      'CRC_MISMATCH',
    );
  }

  const observationStatus = statusFromWire(view.getUint8(STATUS_OFFSET));
  const nullReason = nullReasonFromWire(view.getUint8(NULL_REASON_OFFSET));
  const qualityState = qualityFromWire(view.getUint8(QUALITY_OFFSET));
  const encodedValue = view.getFloat32(VALUE_OFFSET, true);

  if (!Number.isFinite(encodedValue) || encodedValue < 0) {
    throw new BleFeatureTransportError('Feature value must be finite and non-negative', 'INVALID_RANGE');
  }

  if (observationStatus === 'NOT_OBSERVED' && encodedValue !== 0) {
    throw new BleFeatureTransportError(
      'NOT_OBSERVED frame must not carry a hidden numeric value',
      'INVALID_SEMANTICS',
    );
  }

  const frame: ActivityVariabilityFeatureTransportFrame = {
    transportVersion: FEATURE_SUMMARY_TRANSPORT_VERSION,
    source: 'TAG',
    featureKey: 'activity_variability',
    featureContractVersion: ACTIVITY_VARIABILITY_FEATURE_CONTRACT_VERSION,
    sequence: view.getUint16(SEQUENCE_OFFSET, true),
    bootSessionId: view.getUint32(BOOT_SESSION_OFFSET, true),
    windowEndMs: view.getUint32(WINDOW_END_OFFSET, true),
    windowSeconds: view.getUint16(WINDOW_SECONDS_OFFSET, true) as 1800,
    validSeconds: view.getUint16(VALID_SECONDS_OFFSET, true),
    observationStatus,
    nullReason,
    qualityState,
    value: observationStatus === 'OBSERVED' ? encodedValue : null,
  };

  validateSemantics(frame);
  return frame;
}

export type FeatureSequenceRelation =
  | 'NEW_BOOT_SESSION'
  | 'DUPLICATE_SEQUENCE'
  | 'CONTIGUOUS'
  | 'FORWARD_GAP'
  | 'OUT_OF_ORDER';

/**
 * Wrap-aware sequence relation for one canonical device stream.
 *
 * This is transport ordering evidence only. Runtime deduplication still needs
 * the canonical device identity and payload/ingestion policy.
 */
export function classifyFeatureSequence(
  previous: Pick<ActivityVariabilityFeatureTransportFrame, 'bootSessionId' | 'sequence'>,
  current: Pick<ActivityVariabilityFeatureTransportFrame, 'bootSessionId' | 'sequence'>,
): FeatureSequenceRelation {
  if (previous.bootSessionId !== current.bootSessionId) return 'NEW_BOOT_SESSION';

  const delta = (current.sequence - previous.sequence + 0x10000) & 0xffff;
  if (delta === 0) return 'DUPLICATE_SEQUENCE';
  if (delta === 1) return 'CONTIGUOUS';
  if (delta <= 0x8000) return 'FORWARD_GAP';
  return 'OUT_OF_ORDER';
}
