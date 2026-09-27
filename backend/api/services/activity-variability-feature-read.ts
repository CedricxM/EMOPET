import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
  dogs,
  sensorFeatureObservations,
} from '../../db/schema/index.js';
import { isCanonicalSubjectUuid } from './subject-access.js';

export const ACTIVITY_FEATURE_HISTORY_RANGES = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
} as const;

export type ActivityFeatureHistoryRange =
  keyof typeof ACTIVITY_FEATURE_HISTORY_RANGES;

export interface ActivityFeatureReadObservation {
  featureKey: 'activity_variability';
  featureContractVersion: 'tag-activity-variability-cv30m-v1';
  observationStatus: 'OBSERVED' | 'NOT_OBSERVED';
  value: number | null;
  nullReason: 'INSUFFICIENT_COVERAGE' | 'MEAN_BELOW_DIVISION_GUARD' | null;
  observedAt: string;
  source: 'TAG';
  deviceId: string;
  firmwareVersionAtIngest: string | null;
  windowSeconds: 1800;
  validSeconds: number;
  interpretationAuthority: 'PHYSICAL_MOVEMENT_VARIABILITY_ONLY';
  affectiveInterpretationAuthorized: false;
  eliInvocationAuthorized: false;
  deviceTrustStatus: 'BOUND_DEVICE_NOT_CRYPTOGRAPHICALLY_ATTESTED_BY_THIS_SLICE';
}

export type ActivityFeatureLatestReadResult =
  | {
      ok: true;
      status: 'AVAILABLE';
      observation: ActivityFeatureReadObservation;
    }
  | {
      ok: true;
      status: 'NONE_FOUND';
      observation: null;
    }
  | {
      ok: false;
      error: 'INVALID_SUBJECT' | 'DOG_NOT_FOUND' | 'DATABASE_UNAVAILABLE';
      retryable?: boolean;
    };

export type ActivityFeatureHistoryReadResult =
  | {
      ok: true;
      status: 'AVAILABLE' | 'NONE_FOUND';
      range: ActivityFeatureHistoryRange;
      observations: ActivityFeatureReadObservation[];
    }
  | {
      ok: false;
      error:
        | 'INVALID_SUBJECT'
        | 'INVALID_RANGE'
        | 'INVALID_EVALUATION_AT'
        | 'DOG_NOT_FOUND'
        | 'DATABASE_UNAVAILABLE';
      retryable?: boolean;
    };

function project(
  row: typeof sensorFeatureObservations.$inferSelect,
): ActivityFeatureReadObservation {
  return {
    featureKey: 'activity_variability',
    featureContractVersion: 'tag-activity-variability-cv30m-v1',
    observationStatus: row.observationStatus as 'OBSERVED' | 'NOT_OBSERVED',
    value: row.value,
    nullReason: row.nullReason as ActivityFeatureReadObservation['nullReason'],
    observedAt: row.observedAt.toISOString(),
    source: 'TAG',
    deviceId: row.deviceId,
    firmwareVersionAtIngest: row.firmwareVersionAtIngest,
    windowSeconds: 1800,
    validSeconds: row.validSeconds,
    interpretationAuthority: 'PHYSICAL_MOVEMENT_VARIABILITY_ONLY',
    affectiveInterpretationAuthorized: false,
    eliInvocationAuthorized: false,
    deviceTrustStatus: 'BOUND_DEVICE_NOT_CRYPTOGRAPHICALLY_ATTESTED_BY_THIS_SLICE',
  };
}

async function ownerOwnsDog(
  tx: any,
  ownerId: string,
  dogId: string,
): Promise<boolean> {
  const [dog] = await tx
    .select({ id: dogs.id })
    .from(dogs)
    .where(and(eq(dogs.id, dogId), eq(dogs.ownerId, ownerId)))
    .for('share')
    .limit(1);
  return Boolean(dog);
}

/**
 * Read authority for the persisted physical activity feature only.
 *
 * This service is intentionally route-less. It must not be used to inhabit the
 * ELI AVAILABLE state, derive arousal, or imply cryptographic device trust.
 */
export async function readLatestActivityVariabilityObservation(
  ownerId: string,
  dogId: string,
): Promise<ActivityFeatureLatestReadResult> {
  if (!isCanonicalSubjectUuid(ownerId) || !isCanonicalSubjectUuid(dogId)) {
    return { ok: false, error: 'INVALID_SUBJECT' };
  }

  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`);
      await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);

      if (!await ownerOwnsDog(tx, ownerId, dogId)) {
        return { ok: false, error: 'DOG_NOT_FOUND' } as const;
      }

      const [row] = await tx
        .select()
        .from(sensorFeatureObservations)
        .where(and(
          eq(sensorFeatureObservations.dogId, dogId),
          eq(sensorFeatureObservations.featureKey, 'activity_variability'),
          eq(
            sensorFeatureObservations.featureContractVersion,
            'tag-activity-variability-cv30m-v1',
          ),
        ))
        .orderBy(
          desc(sensorFeatureObservations.observedAt),
          desc(sensorFeatureObservations.createdAt),
        )
        .limit(1);

      if (!row) {
        return { ok: true, status: 'NONE_FOUND', observation: null } as const;
      }

      return {
        ok: true,
        status: 'AVAILABLE',
        observation: project(row),
      } as const;
    });
  } catch {
    return {
      ok: false,
      error: 'DATABASE_UNAVAILABLE',
      retryable: true,
    };
  }
}

export async function readActivityVariabilityObservationHistory(
  ownerId: string,
  dogId: string,
  range: ActivityFeatureHistoryRange,
  evaluationAt: Date,
): Promise<ActivityFeatureHistoryReadResult> {
  if (!isCanonicalSubjectUuid(ownerId) || !isCanonicalSubjectUuid(dogId)) {
    return { ok: false, error: 'INVALID_SUBJECT' };
  }

  const rangeMs = ACTIVITY_FEATURE_HISTORY_RANGES[range];
  if (!rangeMs) return { ok: false, error: 'INVALID_RANGE' };
  if (!(evaluationAt instanceof Date) || !Number.isFinite(evaluationAt.getTime())) {
    return { ok: false, error: 'INVALID_EVALUATION_AT' };
  }

  const from = new Date(evaluationAt.getTime() - rangeMs);

  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`);
      await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);

      if (!await ownerOwnsDog(tx, ownerId, dogId)) {
        return { ok: false, error: 'DOG_NOT_FOUND' } as const;
      }

      const rows = await tx
        .select()
        .from(sensorFeatureObservations)
        .where(and(
          eq(sensorFeatureObservations.dogId, dogId),
          eq(sensorFeatureObservations.featureKey, 'activity_variability'),
          eq(
            sensorFeatureObservations.featureContractVersion,
            'tag-activity-variability-cv30m-v1',
          ),
          gte(sensorFeatureObservations.observedAt, from),
          lte(sensorFeatureObservations.observedAt, evaluationAt),
        ))
        .orderBy(
          desc(sensorFeatureObservations.observedAt),
          desc(sensorFeatureObservations.createdAt),
        )
        .limit(1440);

      return {
        ok: true,
        status: rows.length > 0 ? 'AVAILABLE' : 'NONE_FOUND',
        range,
        observations: rows.map(project),
      } as const;
    });
  } catch {
    return {
      ok: false,
      error: 'DATABASE_UNAVAILABLE',
      retryable: true,
    };
  }
}
