export interface PersistedSensorSummaryForExport {
  id: string;
  dogId: string;
  ingestionId: string | null;
  deviceId: string | null;
  timestamp: Date;
  source: string;
  firmwareVersionAtIngest: string | null;
  matPresenceMinutes: number | null;
  respiratoryRateMean: number | null;
  respiratoryRateStd: number | null;
  respiratoryRateConfidence: number | null;
  weightKg: number | null;
  positionChanges: number | null;
  activityMinutes: number | null;
  distanceKm: number | null;
  vocalEvents: number | null;
  vocalEnergyMean: number | null;
  postureDistribution: unknown;
  agitationEvents: number | null;
  temperatureC: number | null;
  humidityPct: number | null;
  createdAt: Date;
}

export interface OwnerAuthorizedSensorSummaryExport {
  id: string;
  dogId: string;
  deviceId: string | null;
  timestamp: Date;
  source: string;
  firmwareVersionAtIngest: string | null;
  matPresenceMinutes: number | null;
  respiratoryRateMean: number | null;
  respiratoryRateStd: number | null;
  respiratoryRateConfidence: number | null;
  weightKg: number | null;
  positionChanges: number | null;
  activityMinutes: number | null;
  distanceKm: number | null;
  vocalEvents: number | null;
  vocalEnergyMean: number | null;
  postureDistribution: unknown;
  agitationEvents: number | null;
  temperatureC: number | null;
  humidityPct: number | null;
  createdAt: Date;
  units: {
    matPresenceMinutes: 'min';
    respiratoryRateMean: 'breaths/min';
    respiratoryRateStd: 'breaths/min';
    weightKg: 'kg';
    activityMinutes: 'min';
    distanceKm: 'km';
    temperatureC: 'degC';
    humidityPct: '%';
  };
  quality: { respiratoryRateConfidence: number | null };
  provenance: {
    level: 'preprocessed';
    deviceSource: string;
    deviceBinding: 'SERVER_VERIFIED_REGISTRY_BINDING' | 'UNBOUND';
    eventTimeField: 'timestamp';
    receiveTimeField: 'createdAt';
    firmwareSnapshotSource: 'SERVER_DEVICE_REGISTRY' | 'UNAVAILABLE';
  };
}

/**
 * Project persisted sensor summaries onto the Owner/export surface.
 *
 * ingestionId is an internal retry/idempotency key and is deliberately not
 * disclosed merely because it exists in PostgreSQL. Device binding, firmware
 * snapshot, event time and server persistence time remain useful provenance.
 */
export function toOwnerAuthorizedSensorSummaryExport(
  row: PersistedSensorSummaryForExport,
): OwnerAuthorizedSensorSummaryExport {
  return {
    id: row.id,
    dogId: row.dogId,
    deviceId: row.deviceId,
    timestamp: row.timestamp,
    source: row.source,
    firmwareVersionAtIngest: row.firmwareVersionAtIngest,
    matPresenceMinutes: row.matPresenceMinutes,
    respiratoryRateMean: row.respiratoryRateMean,
    respiratoryRateStd: row.respiratoryRateStd,
    respiratoryRateConfidence: row.respiratoryRateConfidence,
    weightKg: row.weightKg,
    positionChanges: row.positionChanges,
    activityMinutes: row.activityMinutes,
    distanceKm: row.distanceKm,
    vocalEvents: row.vocalEvents,
    vocalEnergyMean: row.vocalEnergyMean,
    postureDistribution: row.postureDistribution,
    agitationEvents: row.agitationEvents,
    temperatureC: row.temperatureC,
    humidityPct: row.humidityPct,
    createdAt: row.createdAt,
    units: {
      matPresenceMinutes: 'min',
      respiratoryRateMean: 'breaths/min',
      respiratoryRateStd: 'breaths/min',
      weightKg: 'kg',
      activityMinutes: 'min',
      distanceKm: 'km',
      temperatureC: 'degC',
      humidityPct: '%',
    },
    quality: { respiratoryRateConfidence: row.respiratoryRateConfidence },
    provenance: {
      level: 'preprocessed',
      deviceSource: row.source,
      deviceBinding: row.deviceId ? 'SERVER_VERIFIED_REGISTRY_BINDING' : 'UNBOUND',
      eventTimeField: 'timestamp',
      receiveTimeField: 'createdAt',
      firmwareSnapshotSource: row.firmwareVersionAtIngest ? 'SERVER_DEVICE_REGISTRY' : 'UNAVAILABLE',
    },
  };
}
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
 * Project the persisted latent ELI state onto the narrower Owner-facing
 * publication authority.
 *
 * Persisted state is not automatically publishable state:
 * - valence is internal to V1 and is never exported;
 * - arousal is an internal input to the current display mapping and is not
 *   exported as a direct Owner-facing value;
 * - sensorReliability remains internal model/quality state here;
 * - load is exported only when the confidence gate explicitly says PUBLISH.
 *
 * Any unknown gate value therefore fails closed and receives no latent value.
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

  if (row.gateStatus === 'PUBLISH') {
    return { ...base, load: row.load };
  }

  return base;
}

/**
 * Project a persisted baseline onto the current Owner-facing disclosure
 * authority. Baseline lifecycle metadata can be described mechanically, but
 * the opaque `metrics` JSON is not automatically publishable just because it
 * exists in PostgreSQL.
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
