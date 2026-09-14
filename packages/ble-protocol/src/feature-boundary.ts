/**
 * Type-only guardrail between BLE protocol parsing and feature ingestion.
 *
 * This module intentionally does NOT implement parsed-frame -> feature
 * extraction. It only gives downstream code a narrow proof that raw BLE bytes
 * passed the canonical protocol parser before they can satisfy a future feature
 * extraction boundary.
 */

import type { FeatureIngestionEnvelope } from '@emopet/shared';

import {
  parseSensorFrame,
} from './parser/index.js';
import type {
  BleWireFrame,
  ParsedBleSensorFrame,
  VerifiedParsedBleFrame,
} from './frames/index.js';

/**
 * Parse raw BLE bytes and attach the opaque protocol-verification proof.
 *
 * The proof covers only what parseSensorFrame validates today:
 * header, protocol version, source discriminator, exact source-specific length,
 * and CRC. It does not prove device identity/trust, dog binding, firmware trust,
 * wall-clock correctness, calibration, feature-window semantics, or science.
 */
export function parseProtocolVerifiedSensorFrame(
  raw: BleWireFrame,
): VerifiedParsedBleFrame {
  return parseSensorFrame(raw) as VerifiedParsedBleFrame;
}

/**
 * Compile-time map of the two adjacent contracts.
 *
 * This is deliberately not a transformation function and does not imply that
 * one parsed BLE frame becomes one feature envelope. A future extractor may
 * aggregate multiple verified frames, buffer windows, or abstain. Those rules
 * remain open until the device/clock/calibration/feature authorities are set.
 */
export interface BleFeatureBoundaryTypes {
  readonly verifiedParsedFrame: VerifiedParsedBleFrame;
  readonly featureIngestionEnvelope: FeatureIngestionEnvelope;
}

// Compile-time invariants: protocol verification is additive, not structural
// renaming. A plain parsed frame cannot satisfy the verified boundary by normal
// assignment, while a verified frame remains usable anywhere the parsed shape
// is expected.
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type Assert<T extends true> = T;

export type BleFeatureBoundaryCompileTimeProof = readonly [
  Assert<IsAssignable<VerifiedParsedBleFrame, ParsedBleSensorFrame>>,
  Assert<
    IsAssignable<ParsedBleSensorFrame, VerifiedParsedBleFrame> extends false
      ? true
      : false
  >,
];
