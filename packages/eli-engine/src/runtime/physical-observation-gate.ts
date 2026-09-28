export const PHYSICAL_MOVEMENT_RUNTIME_VERSION =
  'eli-runtime-physical-movement-v1' as const;

export const PHYSICAL_MOVEMENT_FEATURE_CONTRACT_VERSION =
  'tag-activity-variability-cv30m-v1' as const;

export type PhysicalMovementGateReason =
  | 'NOT_OBSERVED'
  | 'INVALID_VALUE'
  | 'INSUFFICIENT_COVERAGE'
  | 'QUALITY_MISSING'
  | 'QUALITY_SUPPRESSED'
  | 'EVENT_TIME_PROVENANCE_MISSING'
  | 'FIRMWARE_PROVENANCE_MISSING'
  | 'FEATURE_CONTRACT_MISMATCH';

export type PhysicalMovementGateResult =
  | {
      decision: 'PUBLISH';
      runtimeVersion: typeof PHYSICAL_MOVEMENT_RUNTIME_VERSION;
      qualityState: 'VALID' | 'DEGRADED';
    }
  | {
      decision: 'ABSTAIN';
      runtimeVersion: typeof PHYSICAL_MOVEMENT_RUNTIME_VERSION;
      reason: PhysicalMovementGateReason;
    };

export interface PhysicalMovementGateInput {
  observationStatus: 'OBSERVED' | 'NOT_OBSERVED';
  value: number | null;
  validSeconds: number;
  qualityState: 'VALID' | 'DEGRADED' | 'SUPPRESSED' | null;
  featureContractVersion: string;
  eventTimeResolution: 'BOOT_ANCHOR_V1' | null;
  eventTimeUncertaintyMs: number | null;
  firmwareVersionAtIngest: string | null;
}

/**
 * Canonical #479 publication gate for the first live ELI-adjacent vertical slice.
 *
 * This gate authorizes only a deterministic PHYSICAL movement-variability
 * observation. It does not invoke the latent EKF and does not authorize arousal,
 * valence, load, emotion, stress, wellbeing or behavioural interpretation.
 *
 * Full contextual vetoes are deliberately not fabricated here: their required
 * context is not present in the persisted feature row. Any future latent
 * interpretation must pass the complete science/context authority separately.
 */
export function gatePhysicalMovementObservation(
  input: PhysicalMovementGateInput,
): PhysicalMovementGateResult {
  const abstain = (reason: PhysicalMovementGateReason): PhysicalMovementGateResult => ({
    decision: 'ABSTAIN',
    runtimeVersion: PHYSICAL_MOVEMENT_RUNTIME_VERSION,
    reason,
  });

  if (input.featureContractVersion !== PHYSICAL_MOVEMENT_FEATURE_CONTRACT_VERSION) {
    return abstain('FEATURE_CONTRACT_MISMATCH');
  }
  if (input.observationStatus !== 'OBSERVED') return abstain('NOT_OBSERVED');
  if (input.value == null || !Number.isFinite(input.value) || input.value < 0) {
    return abstain('INVALID_VALUE');
  }
  if (!Number.isSafeInteger(input.validSeconds) || input.validSeconds < 900 || input.validSeconds > 1800) {
    return abstain('INSUFFICIENT_COVERAGE');
  }
  if (input.qualityState == null) return abstain('QUALITY_MISSING');
  if (input.qualityState === 'SUPPRESSED') return abstain('QUALITY_SUPPRESSED');
  if (
    input.eventTimeResolution !== 'BOOT_ANCHOR_V1'
    || input.eventTimeUncertaintyMs == null
    || !Number.isSafeInteger(input.eventTimeUncertaintyMs)
    || input.eventTimeUncertaintyMs < 0
  ) {
    return abstain('EVENT_TIME_PROVENANCE_MISSING');
  }
  if (!input.firmwareVersionAtIngest?.trim()) {
    return abstain('FIRMWARE_PROVENANCE_MISSING');
  }

  return {
    decision: 'PUBLISH',
    runtimeVersion: PHYSICAL_MOVEMENT_RUNTIME_VERSION,
    qualityState: input.qualityState,
  };
}
