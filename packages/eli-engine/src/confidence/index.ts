/**
 * Confidence Gating — the NON-NEGOTIABLE publish/degrade/reject logic.
 *
 * CONF_PUBLISH (≥0.70): full ELI display with all details.
 * CONF_DEGRADE (0.40–0.70): show trend only, no numbers, visual indicator.
 * REJECT (<0.40): hide ELI entirely, show "insufficient data" message.
 *
 * This module computes the aggregate confidence score from per-sensor
 * reliability states and the ELI model's own uncertainty estimate.
 */

import {
  CONF_PUBLISH,
  CONF_DEGRADE,
  type GateStatus,
  type ReliabilityState,
} from '@emopet/shared';
import { type SensorId, noiseMultiplier } from '../rsm/index.js';

// ── Sensor Weights ──────────────────────────────────────────────

/** Weight of each sensor in the aggregate confidence computation. */
const SENSOR_WEIGHTS: Record<SensorId, number> = {
  pvdf: 0.25,
  loadCells: 0.20,
  imu: 0.20,
  mic: 0.10,
  piezo: 0.10,
  gps: 0.15,
};

/** Reliability state to numeric score. */
function reliabilityScore(state: ReliabilityState): number {
  switch (state) {
    case 'VALID': return 1.0;
    case 'DEGRADED': return 0.5;
    case 'SUPPRESSED': return 0.0;
  }
}

// ── Confidence Computation ──────────────────────────────────────

export interface ConfidenceInput {
  /** Per-sensor reliability states. */
  sensorStates: Record<SensorId, ReliabilityState>;
  /** ELI model's own confidence estimate [0, 1]. */
  modelConfidence: number;
  /** Cross-modal agreement score [0, 1] (e.g., PVDF RR vs radar RR). */
  crossModalAgreement?: number;
}

export interface ConfidenceResult {
  /** Aggregate confidence [0, 1]. */
  confidence: number;
  /** Gate decision. */
  gateStatus: GateStatus;
  /** Per-sensor weighted contributions (for debugging). */
  sensorContributions: Record<SensorId, number>;
  /** Total observation noise multiplier for the EKF. */
  totalNoiseMultiplier: number;
}

/**
 * Compute the aggregate confidence and gate decision.
 *
 * Formula: Conf = 0.6 × sensorScore + 0.3 × modelConf + 0.1 × agreement
 * The 60/30/10 split ensures sensor reliability dominates — we never
 * trust a model that's fed bad data.
 */
export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const { sensorStates, modelConfidence, crossModalAgreement = 0.5 } = input;

  // Weighted sensor score
  let sensorScore = 0;
  let totalWeight = 0;
  const sensorContributions = {} as Record<SensorId, number>;

  for (const [sensor, weight] of Object.entries(SENSOR_WEIGHTS) as [SensorId, number][]) {
    const state = sensorStates[sensor];
    const score = reliabilityScore(state);
    const contribution = score * weight;
    sensorContributions[sensor] = contribution;
    sensorScore += contribution;
    totalWeight += weight;
  }

  // Normalize in case weights don't sum to 1
  if (totalWeight > 0) sensorScore /= totalWeight;

  // Aggregate confidence
  const confidence = Math.min(1, Math.max(0,
    0.6 * sensorScore +
    0.3 * modelConfidence +
    0.1 * crossModalAgreement
  ));

  // Gate decision
  let gateStatus: GateStatus;
  if (confidence >= CONF_PUBLISH) {
    gateStatus = 'PUBLISH';
  } else if (confidence >= CONF_DEGRADE) {
    gateStatus = 'DEGRADE';
  } else {
    gateStatus = 'REJECT';
  }

  // Total noise multiplier = product of per-sensor noise multipliers
  // (used by EKF to inflate R matrix)
  let totalNoiseMultiplier = 1.0;
  for (const sensor of Object.keys(SENSOR_WEIGHTS) as SensorId[]) {
    const nm = noiseMultiplier(sensorStates[sensor]);
    if (!isFinite(nm)) {
      totalNoiseMultiplier = Infinity;
      break;
    }
    totalNoiseMultiplier *= nm;
  }

  return { confidence, gateStatus, sensorContributions, totalNoiseMultiplier };
}

/**
 * Quick gate check — just returns the GateStatus for a given confidence.
 */
export function gateFromConfidence(confidence: number): GateStatus {
  if (confidence >= CONF_PUBLISH) return 'PUBLISH';
  if (confidence >= CONF_DEGRADE) return 'DEGRADE';
  return 'REJECT';
}
