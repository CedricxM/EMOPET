/**
 * Guardrail between BLE protocol parsing and feature ingestion.
 *
 * This module intentionally does NOT implement parsed-frame -> feature
 * extraction. It only gives downstream code a narrow proof that raw BLE bytes
 * passed the canonical protocol parser before a future extractor sees them.
 */

import type { FeatureIngestionEnvelope } from '@emopet/shared';

import { parseSensorFrame } from './parser/index.js';
import type {
  BleWireFrame,
  ParsedBleSensorFrame,
  VerifiedParsedBleFrame,
} from './frames/index.js';

/**
 * Parse raw BLE bytes and attach the opaque protocol-verification proof.
 *
 * The proof covers only header, protocol version, source discriminator, exact
 * source-specific length and CRC. It does not prove device identity/trust, dog
 * binding, firmware trust, wall-clock correctness, calibration, feature-window
 * semantics or scientific validity.
 */
export function parseProtocolVerifiedSensorFrame(
  raw: BleWireFrame,
): VerifiedParsedBleFrame {
  return parseSensorFrame(raw) as VerifiedParsedBleFrame;
}

/**
 * Compile-time map of the adjacent contracts.
 *
 * This is deliberately not a transformation function and does not imply that
 * one parsed BLE frame becomes one feature envelope. A future extractor may
 * aggregate frames, buffer windows or abstain.
 */
export interface BleFeatureBoundaryTypes {
  readonly verifiedParsedFrame: VerifiedParsedBleFrame;
  readonly featureIngestionEnvelope: FeatureIngestionEnvelope;
}

type IsAssignable<From, To> = [From] extends [To] ? true : false;
type Assert<T extends true> = T;

/**
 * Compile-time invariants:
 * - verified frames remain usable as ordinary parsed frames;
 * - ordinary parsed frames cannot satisfy the verified boundary by assignment.
 */
export type BleFeatureBoundaryCompileTimeProof = readonly [
  Assert<IsAssignable<VerifiedParsedBleFrame, ParsedBleSensorFrame>>,
  Assert<
    IsAssignable<ParsedBleSensorFrame, VerifiedParsedBleFrame> extends false
      ? true
      : false
  >,
];
