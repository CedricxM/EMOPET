export interface PersistedEliStateForExport {
  id: string;
  dogId: string;
  timestamp: Date;
  arousal: number;
  valence: number;
  load: number;
  confidence: number;
  gateStatus: string;
  sensorReliability: unknown;
  createdAt: Date;
}

export interface GuardianAuthorizedEliExport {
  id: string;
  dogId: string;
  timestamp: Date;
  gateStatus: string;
  confidence: number;
  createdAt: Date;
  load?: number;
  provenance: {
    level: 'inferred';
    warning: string;
    publicationPolicy: 'GUARDIAN_AUTHORIZED_FIELDS_ONLY';
  };
}

export interface PersistedBaselineForGuardianSurface {
  id: string;
  dogId: string;
  startedAt: Date;
  validHours: number;
  established: number;
  metrics: unknown;
  updatedAt: Date;
}

export interface GuardianAuthorizedBaseline {
  id: string;
  dogId: string;
  startedAt: Date;
  validHours: number;
  established: number;
  updatedAt: Date;
  metricsStatus: 'WITHHELD_PENDING_DISCLOSURE_AUTHORITY';
  provenance: {
    level: 'baseline_metadata';
    warning: string;
    publicationPolicy: 'GUARDIAN_AUTHORIZED_FIELDS_ONLY';
  };
}

/**
 * Project the persisted latent ELI state onto the narrower Guardian-facing
 * publication authority.
 *
 * Persisted state is not automatically publishable state:
 * - valence is internal to V1 and is never exported;
 * - arousal is an internal input to the current display mapping and is not
 *   exported as a direct Guardian-facing value;
 * - sensorReliability remains internal model/quality state here;
 * - load is exported only when the confidence gate explicitly says PUBLISH.
 *
 * Any unknown gate value therefore fails closed and receives no latent value.
 */
export function toGuardianAuthorizedEliExport(
  row: PersistedEliStateForExport,
): GuardianAuthorizedEliExport {
  const base: GuardianAuthorizedEliExport = {
    id: row.id,
    dogId: row.dogId,
    timestamp: row.timestamp,
    gateStatus: row.gateStatus,
    confidence: row.confidence,
    createdAt: row.createdAt,
    provenance: {
      level: 'inferred',
      warning: 'Derived ELI output; do not treat as raw sensor data or a veterinary diagnosis.',
      publicationPolicy: 'GUARDIAN_AUTHORIZED_FIELDS_ONLY',
    },
  };

  if (row.gateStatus === 'PUBLISH') {
    return { ...base, load: row.load };
  }

  return base;
}

/**
 * Project a persisted baseline onto the current Guardian-facing disclosure
 * authority. Baseline lifecycle metadata can be described mechanically, but
 * the opaque `metrics` JSON is not automatically publishable just because it
 * exists in PostgreSQL.
 */
export function toGuardianAuthorizedBaselineExport(
  row: PersistedBaselineForGuardianSurface,
): GuardianAuthorizedBaseline {
  return {
    id: row.id,
    dogId: row.dogId,
    startedAt: row.startedAt,
    validHours: row.validHours,
    established: row.established,
    updatedAt: row.updatedAt,
    metricsStatus: 'WITHHELD_PENDING_DISCLOSURE_AUTHORITY',
    provenance: {
      level: 'baseline_metadata',
      warning: 'Opaque baseline metrics are withheld pending explicit Guardian disclosure authority; persistence alone does not authorize publication.',
      publicationPolicy: 'GUARDIAN_AUTHORIZED_FIELDS_ONLY',
    },
  };
}
