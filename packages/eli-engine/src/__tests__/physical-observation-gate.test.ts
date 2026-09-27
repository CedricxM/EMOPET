import { describe, expect, it } from 'vitest';

import {
  gatePhysicalMovementObservation,
  PHYSICAL_MOVEMENT_RUNTIME_VERSION,
} from '../runtime/physical-observation-gate.js';

const valid = {
  observationStatus: 'OBSERVED' as const,
  value: 0.37,
  validSeconds: 1710,
  qualityState: 'VALID' as const,
  featureContractVersion: 'tag-activity-variability-cv30m-v1',
  eventTimeResolution: 'BOOT_ANCHOR_V1' as const,
  eventTimeUncertaintyMs: 120,
  firmwareVersionAtIngest: '6.1.0',
};

describe('gatePhysicalMovementObservation', () => {
  it('publishes a provenance-complete physical observation without authorizing latent semantics', () => {
    expect(gatePhysicalMovementObservation(valid)).toEqual({
      decision: 'PUBLISH',
      runtimeVersion: PHYSICAL_MOVEMENT_RUNTIME_VERSION,
      qualityState: 'VALID',
    });
  });

  it('allows degraded physical quality while preserving that state', () => {
    expect(gatePhysicalMovementObservation({ ...valid, qualityState: 'DEGRADED' })).toEqual({
      decision: 'PUBLISH',
      runtimeVersion: PHYSICAL_MOVEMENT_RUNTIME_VERSION,
      qualityState: 'DEGRADED',
    });
  });

  it.each([
    [{ ...valid, observationStatus: 'NOT_OBSERVED' as const, value: null }, 'NOT_OBSERVED'],
    [{ ...valid, qualityState: null }, 'QUALITY_MISSING'],
    [{ ...valid, qualityState: 'SUPPRESSED' as const }, 'QUALITY_SUPPRESSED'],
    [{ ...valid, eventTimeResolution: null, eventTimeUncertaintyMs: null }, 'EVENT_TIME_PROVENANCE_MISSING'],
    [{ ...valid, firmwareVersionAtIngest: null }, 'FIRMWARE_PROVENANCE_MISSING'],
    [{ ...valid, validSeconds: 899 }, 'INSUFFICIENT_COVERAGE'],
    [{ ...valid, featureContractVersion: 'other' }, 'FEATURE_CONTRACT_MISMATCH'],
  ])('abstains instead of fabricating authority: %s', (input, reason) => {
    expect(gatePhysicalMovementObservation(input)).toEqual({
      decision: 'ABSTAIN',
      runtimeVersion: PHYSICAL_MOVEMENT_RUNTIME_VERSION,
      reason,
    });
  });
});
