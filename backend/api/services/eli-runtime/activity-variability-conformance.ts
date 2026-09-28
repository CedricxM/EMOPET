import type { EKFState, VetoContext } from '@emopet/eli-engine';
import { noiseMultiplier, runVetoPipeline, stepEKF } from '@emopet/eli-engine';
import type {
  FeatureVector,
  FirmwareVersion,
  ReliabilityState,
  SubBaseline,
} from '@emopet/shared';

export const ACTIVITY_VARIABILITY_CONFORMANCE_CONTRACT_VERSION =
  'tag-activity-variability-cv30m-v1' as const;

export type EliConformanceState =
  | 'SCIENCE_HOLD'
  | 'VETOED'
  | 'INSUFFICIENT_FEATURE'
  | 'INVALID_PROVENANCE';

export interface ActivityVariabilityConformanceInput {
  mode: 'CONFORMANCE_ONLY_SYNTHETIC';
  scenarioId: string;
  dogId: string;
  deviceId: string;
  eventAt: Date;
  windowSeconds: 1800;
  firmwareVersion: FirmwareVersion;
  featureContractVersion: typeof ACTIVITY_VARIABILITY_CONFORMANCE_CONTRACT_VERSION;
  activityVariability: number | null;
  imuReliability: ReliabilityState;
  baseline: SubBaseline;
  previousState: EKFState;
  vetoContext: VetoContext;
}

export interface ActivityVariabilityConformanceResult {
  state: EliConformanceState;
  internalEngineCandidate?: {
    state: EKFState;
    contributed: string[];
    agreement: number;
  };
  userProjection: null;
  persistenceWrite: null;
  apiRoute: null;
  provenance: {
    scenarioId: string;
    dogId: string;
    deviceId: string;
    eventAt: Date;
    windowSeconds: 1800;
    firmwareVersion: FirmwareVersion;
    featureContractVersion: typeof ACTIVITY_VARIABILITY_CONFORMANCE_CONTRACT_VERSION;
    source: 'SYNTHETIC_TEST_INJECTION';
    baselineSlot: SubBaseline['slot'];
  };
  limits: string[];
}

/**
 * Internal software-conformance harness for #479.
 *
 * This deliberately proves that backend code can invoke the canonical ELI engine,
 * propagate veto/reliability/provenance boundaries, and abstain safely.
 *
 * It is NOT a runtime producer. Inputs are explicitly synthetic/test-injected.
 * The real TAG -> BLE -> backend feature path remains open under #122 because
 * BLE V1 does not transport activity_variability.
 *
 * The activity_variability -> arousal mapping remains an unvalidated EMOPET
 * hypothesis under #87. Therefore this function can inspect an internal engine
 * candidate for conformance purposes only. It can never project, persist, or
 * activate an API route.
 */
export function runActivityVariabilityConformanceHarness(
  input: ActivityVariabilityConformanceInput,
): ActivityVariabilityConformanceResult {
  const provenance = {
    scenarioId: input.scenarioId,
    dogId: input.dogId,
    deviceId: input.deviceId,
    eventAt: input.eventAt,
    windowSeconds: input.windowSeconds,
    firmwareVersion: input.firmwareVersion,
    featureContractVersion: input.featureContractVersion,
    source: 'SYNTHETIC_TEST_INJECTION' as const,
    baselineSlot: input.baseline.slot,
  };

  const limits = [
    'software conformance only; not a live ELI runtime',
    'activity_variability is a movement feature, not an emotion label',
    'activity_variability -> arousal remains an unvalidated EMOPET hypothesis (#87)',
    'BLE V1 does not transport activity_variability (#122)',
    'no Owner-facing projection, persistence, or API activation is authorized',
  ];

  const hold = (
    state: EliConformanceState,
    internalEngineCandidate?: ActivityVariabilityConformanceResult['internalEngineCandidate'],
  ): ActivityVariabilityConformanceResult => ({
    state,
    ...(internalEngineCandidate ? { internalEngineCandidate } : {}),
    userProjection: null,
    persistenceWrite: null,
    apiRoute: null,
    provenance,
    limits,
  });

  if (input.mode !== 'CONFORMANCE_ONLY_SYNTHETIC' || input.scenarioId.trim().length === 0) {
    return hold('INVALID_PROVENANCE');
  }

  if (input.baseline.dogId !== input.dogId) {
    return hold('INVALID_PROVENANCE');
  }

  if (
    input.featureContractVersion !== ACTIVITY_VARIABILITY_CONFORMANCE_CONTRACT_VERSION ||
    input.windowSeconds !== 1800
  ) {
    return hold('INVALID_PROVENANCE');
  }

  if (
    input.activityVariability == null ||
    !Number.isFinite(input.activityVariability) ||
    input.activityVariability < 0
  ) {
    return hold('INSUFFICIENT_FEATURE');
  }

  const featureVector: FeatureVector = {
    timestamp: input.eventAt,
    dogId: input.dogId,
    deviceSource: 'TAG',
    firmwareVersion: input.firmwareVersion,
    rr_mean: null,
    rr_confidence: null,
    rr_variability: null,
    odba_mean: null,
    activity_minutes_pct: null,
    activity_variability: input.activityVariability,
    tremor_detected: false,
    lateral_acc_rms: null,
    gyro_std_deg_s: null,
    vocal_event_in_window: false,
    vocal_energy_mean: null,
    ambient_temp_c: null,
    humidity_pct: null,
    quality: {
      pvdf: 0,
      imu: input.imuReliability === 'VALID' ? 1 : input.imuReliability === 'DEGRADED' ? 0.5 : 0,
      mic: 0,
      loadCells: 0,
      piezo: 0,
      gps: 0,
    },
  };

  const veto = runVetoPipeline(featureVector, input.vetoContext);
  const featureWeight = veto.weight_multipliers.activity_variability ?? 1;

  if (
    veto.denyingVeto ||
    veto.suppress.includes('imu') ||
    veto.suppress.includes('TAG') ||
    featureWeight !== 1
  ) {
    return hold('VETOED');
  }

  const sensorNoiseMultiplier = noiseMultiplier(input.imuReliability);
  if (!Number.isFinite(sensorNoiseMultiplier)) {
    return hold('INSUFFICIENT_FEATURE');
  }

  const result = stepEKF(
    input.previousState,
    featureVector,
    input.baseline,
    {
      slot: input.baseline.slot,
      sensorNoiseMultiplier,
      recoveryTrend4wPct: null,
    },
  );

  return hold('SCIENCE_HOLD', result);
}
