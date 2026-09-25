import type {
  EKFState,
  VetoContext,
} from '@emopet/eli-engine';
import {
  noiseMultiplier,
  runVetoPipeline,
  stepEKF,
} from '@emopet/eli-engine';
import type {
  FeatureVector,
  FirmwareVersion,
  ReliabilityState,
  SubBaseline,
} from '@emopet/shared';

export const ACTIVITY_VARIABILITY_FEATURE_CONTRACT_VERSION =
  'tag-activity-variability-cv30m-v1' as const;

export type CandidatePublicationState =
  | 'SCIENCE_HOLD'
  | 'VETOED'
  | 'INSUFFICIENT_FEATURE'
  | 'INVALID_PROVENANCE';

export interface ActivityVariabilitySliceInput {
  dogId: string;
  deviceId: string;
  eventAt: Date;
  windowSeconds: 1800;
  firmwareVersion: FirmwareVersion;
  featureContractVersion: typeof ACTIVITY_VARIABILITY_FEATURE_CONTRACT_VERSION;
  activityVariability: number | null;
  imuReliability: ReliabilityState;
  baseline: SubBaseline;
  previousState: EKFState;
  vetoContext: VetoContext;
}

export interface ActivityVariabilitySliceCandidate {
  publicationState: CandidatePublicationState;
  userProjection: null;
  internalCandidate?: {
    state: EKFState;
    contributed: string[];
    agreement: number;
  };
  provenance: {
    dogId: string;
    deviceId: string;
    eventAt: Date;
    windowSeconds: 1800;
    firmwareVersion: FirmwareVersion;
    featureContractVersion: typeof ACTIVITY_VARIABILITY_FEATURE_CONTRACT_VERSION;
    source: 'TAG';
    baselineSlot: SubBaseline['slot'];
  };
  limits: string[];
}

/**
 * Architecture/conformance candidate for #479.
 *
 * This deliberately exercises the canonical @emopet/eli-engine boundary
 * without creating a user-visible inference. The activity-variability
 * measurement contract is mechanically coherent, but its positive mapping to
 * latent arousal remains an unvalidated EMOPET hypothesis under #87.
 *
 * Therefore userProjection is ALWAYS null in this candidate. Removing that
 * hold requires a separate science/product authority change, not merely a code
 * change.
 */
export function runActivityVariabilitySliceCandidate(
  input: ActivityVariabilitySliceInput,
): ActivityVariabilitySliceCandidate {
  const provenance = {
    dogId: input.dogId,
    deviceId: input.deviceId,
    eventAt: input.eventAt,
    windowSeconds: input.windowSeconds,
    firmwareVersion: input.firmwareVersion,
    featureContractVersion: input.featureContractVersion,
    source: 'TAG' as const,
    baselineSlot: input.baseline.slot,
  };

  const limits = [
    'activity_variability is a movement feature, not an emotion label',
    'activity_variability -> arousal is an EMOPET hypothesis pending validation (#87)',
    'valence and load are not part of the user projection for this slice',
  ];

  if (input.baseline.dogId !== input.dogId) {
    return { publicationState: 'INVALID_PROVENANCE', userProjection: null, provenance, limits };
  }

  if (
    input.featureContractVersion !== ACTIVITY_VARIABILITY_FEATURE_CONTRACT_VERSION ||
    input.windowSeconds !== 1800
  ) {
    return { publicationState: 'INVALID_PROVENANCE', userProjection: null, provenance, limits };
  }

  if (
    input.activityVariability == null ||
    !Number.isFinite(input.activityVariability) ||
    input.activityVariability < 0
  ) {
    return { publicationState: 'INSUFFICIENT_FEATURE', userProjection: null, provenance, limits };
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
    return { publicationState: 'VETOED', userProjection: null, provenance, limits };
  }

  const sensorNoiseMultiplier = noiseMultiplier(input.imuReliability);
  if (!Number.isFinite(sensorNoiseMultiplier)) {
    return { publicationState: 'INSUFFICIENT_FEATURE', userProjection: null, provenance, limits };
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

  // Critical boundary: the engine result is available for conformance work,
  // but publication remains held by science/product authority.
  return {
    publicationState: 'SCIENCE_HOLD',
    userProjection: null,
    internalCandidate: result,
    provenance,
    limits,
  };
}
