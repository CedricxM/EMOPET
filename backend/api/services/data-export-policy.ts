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

export interface OwnerAuthorizedEliExport {
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
    publicationPolicy: 'OWNER_AUTHORIZED_FIELDS_ONLY';
  };
}

export interface PersistedBaselineForOwnerSurface {
  id: string;
  dogId: string;
  startedAt: Date;
  validHours: number;
  established: number;
  metrics: unknown;
  updatedAt: Date;
}

export interface OwnerAuthorizedBaseline {
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
    publicationPolicy: 'OWNER_AUTHORIZED_FIELDS_ONLY';
  };
}

/**
 * Persistence is not publication authority.
 *
 * valence, direct arousal and sensorReliability stay internal on the current
 * Owner-facing export surface. load is exposed only for an explicit PUBLISH
 * gate. Unknown/non-publish gate values fail closed.
 */
export function toOwnerAuthorizedEliExport(
  row: PersistedEliStateForExport,
): OwnerAuthorizedEliExport {
  const base: OwnerAuthorizedEliExport = {
    id: row.id,
    dogId: row.dogId,
    timestamp: row.timestamp,
    gateStatus: row.gateStatus,
    confidence: row.confidence,
    createdAt: row.createdAt,
    provenance: {
      level: 'inferred',
      warning: 'Derived ELI output; do not treat as raw sensor data or a veterinary diagnosis.',
      publicationPolicy: 'OWNER_AUTHORIZED_FIELDS_ONLY',
    },
  };

  return row.gateStatus === 'PUBLISH' ? { ...base, load: row.load } : base;
}

/**
 * Opaque baseline metrics are withheld until a separate disclosure authority
 * explicitly makes their contents publishable.
 */
export function toOwnerAuthorizedBaselineExport(
  row: PersistedBaselineForOwnerSurface,
): OwnerAuthorizedBaseline {
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
      warning: 'Opaque baseline metrics are withheld pending explicit Owner disclosure authority; persistence alone does not authorize publication.',
      publicationPolicy: 'OWNER_AUTHORIZED_FIELDS_ONLY',
    },
  };
}
