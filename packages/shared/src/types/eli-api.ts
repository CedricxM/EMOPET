/**
 * Public ELI API availability/projection contract.
 *
 * This contract defines what a future authoritative backend may expose to clients.
 * It intentionally excludes internal latent fields such as valence, cumulative load
 * and per-sensor internal reliability.
 *
 * Defining the type does NOT activate an endpoint. Current runtime remains
 * NOT_IMPLEMENTED under #124/#118 until producer, persistence, science and
 * projection gates are explicitly satisfied.
 */

export type EliApiAvailabilityStatus =
  | 'NOT_IMPLEMENTED'
  | 'UNAVAILABLE'
  | 'NONE_FOUND'
  | 'AVAILABLE';

export interface EliApiCommon {
  schemaVersion: 'eli-api-availability-v1';
  dogId: string;
  authoritative: boolean;
}

export interface EliApiNotImplemented extends EliApiCommon {
  status: 'NOT_IMPLEMENTED';
  authoritative: false;
  retryable: false;
  reason: 'eli_runtime_not_implemented';
}

export interface EliApiUnavailable extends EliApiCommon {
  status: 'UNAVAILABLE';
  authoritative: true;
  retryable: boolean;
  reason: string;
  unavailableSince?: Date;
}

export interface EliApiNoneFound extends EliApiCommon {
  status: 'NONE_FOUND';
  authoritative: true;
  retryable: false;
  reason: 'no_publishable_observation';
  queriedThrough: Date;
}

export interface EliPublicObservationProvenance {
  engineVersion: string;
  modelVersion: string;
  configVersion: string;
  featureContractVersion: string;
  baselineVersion: string;
  /** Opaque baseline identity/version receipt, never the private baseline itself. */
  baselineReceipt: string;
  sourceDevices: Array<{
    deviceId: string;
    source: 'MAT' | 'TAG';
    firmwareVersion: string;
  }>;
}

/**
 * Common envelope for a future user-publishable Care observation.
 *
 * No semantic observation payload is authorized yet. #87 and the runtime gate
 * must approve a concrete observation before a subtype can be added.
 *
 * This base deliberately has no internal valence, cumulative load, raw latent
 * score, sensor reliability map, private veto chain, or generic wellbeing score.
 */
export interface EliPublicObservationBase {
  schemaVersion: 'eli-public-observation-v1';
  observationId: string;
  dogId: string;
  observedAt: Date;
  windowStart: Date;
  windowEnd: Date;
  publicationState: 'PUBLISH';
  confidence: number;
  context: string;
  reference: string;
  sourceSummary: string;
  limits: string[];
  provenance: EliPublicObservationProvenance;
}

/**
 * Placeholder for the future semantic subtype.
 *
 * Kept intentionally uninhabitable until Science/Product authorize one concrete
 * public observation contract. This prevents a generic internal ELI state from
 * being passed through the API by convenience.
 */
export type EliAuthorizedPublicObservation = never;

export interface EliApiAvailable extends EliApiCommon {
  status: 'AVAILABLE';
  authoritative: true;
  retryable: false;
  observation: EliAuthorizedPublicObservation;
}

export type EliApiResponse =
  | EliApiNotImplemented
  | EliApiUnavailable
  | EliApiNoneFound
  | EliApiAvailable;


/**
 * First authorised live #479 observation contract.
 *
 * This is deliberately a PHYSICAL movement measurement only. It is not an ELI
 * latent state and carries no arousal, valence, load, emotion, stress,
 * wellbeing or behavioural interpretation.
 */
export interface EliPhysicalMovementObservation {
  schemaVersion: 'eli-physical-movement-observation-v1';
  observationKind: 'PHYSICAL_MOVEMENT_VARIABILITY';
  dogId: string;
  observedAt: string;
  windowSeconds: 1800;
  validSeconds: number;
  value: number;
  unit: 'ODBA_COEFFICIENT_OF_VARIATION';
  qualityState: 'VALID' | 'DEGRADED';
  interpretationAuthority: 'PHYSICAL_MOVEMENT_VARIABILITY_ONLY';
  affectiveInterpretationAuthorized: false;
  latentStatePublished: false;
  runtimeVersion: 'eli-runtime-physical-movement-v1';
  featureContractVersion: 'tag-activity-variability-cv30m-v1';
  sourceDevice: {
    deviceId: string;
    source: 'TAG';
    firmwareVersion: string;
  };
  eventTime: {
    resolution: 'BOOT_ANCHOR_V1';
    uncertaintyMs: number;
  };
  limits: string[];
}

export type EliPhysicalMovementUnavailableReason =
  | 'NOT_OBSERVED'
  | 'INVALID_VALUE'
  | 'INSUFFICIENT_COVERAGE'
  | 'QUALITY_MISSING'
  | 'QUALITY_SUPPRESSED'
  | 'EVENT_TIME_PROVENANCE_MISSING'
  | 'FIRMWARE_PROVENANCE_MISSING'
  | 'FEATURE_CONTRACT_MISMATCH';

export type EliPhysicalMovementApiResponse =
  | {
      schemaVersion: 'eli-physical-movement-api-v1';
      dogId: string;
      status: 'AVAILABLE';
      authoritative: true;
      observation: EliPhysicalMovementObservation;
    }
  | {
      schemaVersion: 'eli-physical-movement-api-v1';
      dogId: string;
      status: 'NONE_FOUND';
      authoritative: true;
      retryable: false;
      reason: 'no_physical_movement_observation';
      queriedThrough: string;
    }
  | {
      schemaVersion: 'eli-physical-movement-api-v1';
      dogId: string;
      status: 'UNAVAILABLE';
      authoritative: true;
      retryable: false;
      reason: EliPhysicalMovementUnavailableReason;
    };
