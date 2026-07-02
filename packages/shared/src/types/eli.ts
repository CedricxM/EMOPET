/**
 * ELI — Emotional Load Index types.
 *
 * Reference: ELI Scientific Foundation v3.0
 * Core invariant: NEVER display a value the system is not confident about.
 */

/** Confidence gate status. Non-negotiable output gating. */
export type GateStatus = 'PUBLISH' | 'DEGRADE' | 'REJECT';

/** Per-sensor reliability state (firmware RSM output). */
export type ReliabilityState = 'VALID' | 'DEGRADED' | 'SUPPRESSED';

/** ELI latent state at time t, as received from firmware. */
export interface ELIState {
  timestamp: Date;
  dogId: string;
  /** Arousal proxy a_t in [0, 1]. */
  arousal: number;
  /** Valence proxy v_t in [-1, 1]. Internal to V1 — NOT published. */
  valence: number;
  /** Cumulative emotional load L_t in [0, 1]. The ELI value. */
  load: number;
  /** Composite confidence Conf_t in [0, 1]. */
  confidence: number;
  /** Gate decision from confidence thresholds. */
  gateStatus: GateStatus;
  /** Per-sensor reliability from the RSM. */
  sensorReliability: SensorReliabilityMap;
}

export interface SensorReliabilityMap {
  pvdf: ReliabilityState;
  loadCells: ReliabilityState;
  imu: ReliabilityState;
  mic: ReliabilityState;
  piezo: ReliabilityState;
  gps: ReliabilityState;
}

/** Human-readable ELI label for the UI. */
export type ELILabel = 'calme' | 'activation' | 'tension_possible';

/** What the UI should display based on gate status. */
export interface ELIDisplay {
  gateStatus: GateStatus;
  /** Only defined when PUBLISH. */
  label?: ELILabel;
  /** Only defined when PUBLISH. Load value 0-1. */
  load?: number;
  /** Confidence band [lower, upper] around load. */
  band?: [number, number];
  /** 0-5 confidence dots for UI. */
  confidenceDots: number;
  /** French explanation for current state. */
  explanation: string;
  /** Suggestion for the user when data is insufficient. */
  suggestion?: string;
}

/** Derive display state from ELI. Never shows fake data. */
export function eliToDisplay(eli: ELIState, dogName: string): ELIDisplay {
  if (eli.gateStatus === 'PUBLISH') {
    const label: ELILabel =
      eli.arousal > 0.40 && eli.load > 0.50
        ? 'tension_possible'
        : eli.arousal > 0.40
          ? 'activation'
          : 'calme';

    const bandWidth = (1 - eli.confidence) * 0.3;
    return {
      gateStatus: 'PUBLISH',
      label,
      load: eli.load,
      band: [
        Math.max(0, eli.load - bandWidth),
        Math.min(1, eli.load + bandWidth),
      ],
      confidenceDots: Math.round(eli.confidence * 5),
      explanation: label === 'calme'
        ? `${dogName} est calme`
        : label === 'activation'
          ? `${dogName} est actif`
          : `${dogName} semble un peu tendu`,
    };
  }

  if (eli.gateStatus === 'DEGRADE') {
    return {
      gateStatus: 'DEGRADE',
      confidenceDots: Math.round(eli.confidence * 5),
      explanation: 'Donnees partielles',
      suggestion: `Le collier ou le mat de ${dogName} ne capte pas assez de donnees`,
    };
  }

  // REJECT
  return {
    gateStatus: 'REJECT',
    confidenceDots: 0,
    explanation: 'Donnees insuffisantes',
    suggestion: `${dogName} n'est pas sur le mat ou le collier est mal positionne`,
  };
}
