import {
  gatePhysicalMovementObservation,
  PHYSICAL_MOVEMENT_RUNTIME_VERSION,
} from '@emopet/eli-engine';
import type { EliPhysicalMovementApiResponse } from '@emopet/shared';

import { readLatestActivityVariabilityObservation } from '../activity-variability-feature-read.js';

export type PhysicalMovementProjectionResult =
  | {
      ok: true;
      response: EliPhysicalMovementApiResponse;
    }
  | {
      ok: false;
      error: 'INVALID_SUBJECT' | 'DOG_NOT_FOUND' | 'DATABASE_UNAVAILABLE';
      retryable?: boolean;
    };

const LIMITS = [
  'physical movement variability only',
  'no arousal, valence, stress, emotion, wellbeing or behavioural interpretation',
  'no contextual ELI veto chain is inferred from missing context',
  'device binding is repository attribution, not physical-device attestation',
];

/**
 * First live #479 vertical slice.
 *
 * The source is the already-persisted, Owner-scoped physical feature authority.
 * The canonical ELI package owns the publish/abstain gate, but the latent EKF
 * remains outside this path. This service can never write or expose eli_states.
 */
export async function projectLatestPhysicalMovementObservation(
  ownerId: string,
  dogId: string,
  evaluationAt = new Date(),
): Promise<PhysicalMovementProjectionResult> {
  const read = await readLatestActivityVariabilityObservation(ownerId, dogId);

  if (!read.ok) {
    return {
      ok: false,
      error: read.error,
      ...(read.retryable !== undefined ? { retryable: read.retryable } : {}),
    };
  }

  if (read.status === 'NONE_FOUND') {
    return {
      ok: true,
      response: {
        schemaVersion: 'eli-physical-movement-api-v1',
        dogId,
        status: 'NONE_FOUND',
        authoritative: true,
        retryable: false,
        reason: 'no_physical_movement_observation',
        queriedThrough: evaluationAt.toISOString(),
      },
    };
  }

  const observation = read.observation;
  const gate = gatePhysicalMovementObservation({
    observationStatus: observation.observationStatus,
    value: observation.value,
    validSeconds: observation.validSeconds,
    qualityState: observation.qualityState,
    featureContractVersion: observation.featureContractVersion,
    eventTimeResolution: observation.eventTimeResolution,
    eventTimeUncertaintyMs: observation.eventTimeUncertaintyMs,
    firmwareVersionAtIngest: observation.firmwareVersionAtIngest,
  });

  if (gate.decision === 'ABSTAIN') {
    return {
      ok: true,
      response: {
        schemaVersion: 'eli-physical-movement-api-v1',
        dogId,
        status: 'UNAVAILABLE',
        authoritative: true,
        retryable: false,
        reason: gate.reason,
      },
    };
  }

  return {
    ok: true,
    response: {
      schemaVersion: 'eli-physical-movement-api-v1',
      dogId,
      status: 'AVAILABLE',
      authoritative: true,
      observation: {
        schemaVersion: 'eli-physical-movement-observation-v1',
        observationKind: 'PHYSICAL_MOVEMENT_VARIABILITY',
        dogId,
        observedAt: observation.observedAt,
        windowSeconds: 1800,
        validSeconds: observation.validSeconds,
        value: observation.value as number,
        unit: 'ODBA_COEFFICIENT_OF_VARIATION',
        qualityState: gate.qualityState,
        interpretationAuthority: 'PHYSICAL_MOVEMENT_VARIABILITY_ONLY',
        affectiveInterpretationAuthorized: false,
        latentStatePublished: false,
        runtimeVersion: PHYSICAL_MOVEMENT_RUNTIME_VERSION,
        featureContractVersion: observation.featureContractVersion,
        sourceDevice: {
          deviceId: observation.deviceId,
          source: 'TAG',
          firmwareVersion: observation.firmwareVersionAtIngest as string,
        },
        eventTime: {
          resolution: observation.eventTimeResolution as 'BOOT_ANCHOR_V1',
          uncertaintyMs: observation.eventTimeUncertaintyMs as number,
        },
        limits: LIMITS,
      },
    },
  };
}
