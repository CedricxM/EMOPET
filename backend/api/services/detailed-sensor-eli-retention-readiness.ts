import { sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { eliStates, sensorSummaries } from '../../db/schema/index.js';
import {
  canonicalRetentionUtc,
  shiftRetentionUtcMonths,
} from './retention-time.js';

const DETAILED_RETENTION_MONTHS = 36;

export interface DetailedSensorEliRetentionCounts {
  sensorDetailedTotal: number;
  sensorBeyondWindow: number;
  eliDetailedTotal: number;
  eliBeyondWindow: number;
}

export interface DetailedSensorEliRetentionRepository {
  countExpiredAt(evaluationAt: Date): Promise<DetailedSensorEliRetentionCounts>;
}

export interface DetailedSensorEliRetentionReadinessReport {
  ok: true;
  mode: 'READ_ONLY_RETENTION_READINESS';
  destructiveActionAuthorized: false;
  claimsPurgeExecuted: false;
  claimsAggregationCompleted: false;
  categoryIds: ['sensor_preprocessed_detailed', 'eli_inferred_detailed'];
  evaluationAt: string;
  /** Calendar reference only; eligibility uses each row clock plus policyMonths. */
  cutoffAt: string;
  expiryBasis: 'ROW_CLOCK_PLUS_UTC_CALENDAR_MONTHS';
  policyMonths: 36;
  status:
    | 'NO_DETAILED_ROWS_BEYOND_36_MONTHS'
    | 'DETAILED_ROWS_BEYOND_36_MONTHS_PRESENT';
  counts: DetailedSensorEliRetentionCounts;
  policyBoundary: 'DETAILED_ONLY_AGGREGATION_AND_PURGE_EXECUTION_NOT_VERIFIED';
}

export interface DetailedSensorEliRetentionReadinessFailure {
  ok: false;
  mode: 'READ_ONLY_RETENTION_READINESS';
  destructiveActionAuthorized: false;
  claimsPurgeExecuted: false;
  claimsAggregationCompleted: false;
  error:
    | 'invalid_evaluation_at'
    | 'invalid_repository_result'
    | 'database_unavailable';
  retryable?: boolean;
}

export type DetailedSensorEliRetentionReadinessResult =
  | DetailedSensorEliRetentionReadinessReport
  | DetailedSensorEliRetentionReadinessFailure;

function failure(
  error: DetailedSensorEliRetentionReadinessFailure['error'],
  retryable?: boolean,
): DetailedSensorEliRetentionReadinessFailure {
  return {
    ok: false,
    mode: 'READ_ONLY_RETENTION_READINESS',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    claimsAggregationCompleted: false,
    error,
    ...(retryable === undefined ? {} : { retryable }),
  };
}

function validCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function validCounts(counts: DetailedSensorEliRetentionCounts): boolean {
  return (
    validCount(counts.sensorDetailedTotal)
    && validCount(counts.sensorBeyondWindow)
    && validCount(counts.eliDetailedTotal)
    && validCount(counts.eliBeyondWindow)
    && counts.sensorBeyondWindow <= counts.sensorDetailedTotal
    && counts.eliBeyondWindow <= counts.eliDetailedTotal
  );
}

const postgresRepository: DetailedSensorEliRetentionRepository = {
  async countExpiredAt(evaluationAt) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`);
      await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);

      const [sensorTotalRow] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(sensorSummaries);

      const [sensorBeyondRow] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(sensorSummaries)
        .where(sql`
          (${sensorSummaries.timestamp} AT TIME ZONE 'UTC')
            + make_interval(months => ${DETAILED_RETENTION_MONTHS})
          <= (${evaluationAt.toISOString()}::timestamptz AT TIME ZONE 'UTC')
        `);

      const [eliTotalRow] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(eliStates);

      const [eliBeyondRow] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(eliStates)
        .where(sql`
          (${eliStates.timestamp} AT TIME ZONE 'UTC')
            + make_interval(months => ${DETAILED_RETENTION_MONTHS})
          <= (${evaluationAt.toISOString()}::timestamptz AT TIME ZONE 'UTC')
        `);

      return {
        sensorDetailedTotal: Number(sensorTotalRow?.count ?? 0),
        sensorBeyondWindow: Number(sensorBeyondRow?.count ?? 0),
        eliDetailedTotal: Number(eliTotalRow?.count ?? 0),
        eliBeyondWindow: Number(eliBeyondRow?.count ?? 0),
      };
    });
  },
};

/**
 * Read-only readiness for founder decision R3.
 *
 * This probe reports whether detailed preprocessed sensor summaries or detailed
 * ELI states have crossed the common 36-month window. It does not prove that
 * lower-granularity aggregation has happened and never authorises or executes
 * deletion, anonymisation, aggregation or mutation.
 */
export async function inspectDetailedSensorEliRetention(
  evaluationAtInput: string,
  repository: DetailedSensorEliRetentionRepository = postgresRepository,
): Promise<DetailedSensorEliRetentionReadinessResult> {
  const evaluationAt = canonicalRetentionUtc(evaluationAtInput);
  if (!evaluationAt) return failure('invalid_evaluation_at');

  const cutoffIso = shiftRetentionUtcMonths(evaluationAt, -DETAILED_RETENTION_MONTHS);
  if (!cutoffIso) return failure('invalid_evaluation_at');
  const cutoffAt = new Date(cutoffIso);

  try {
    const counts = await repository.countExpiredAt(new Date(evaluationAt));
    if (!validCounts(counts)) return failure('invalid_repository_result');

    const beyondWindow =
      counts.sensorBeyondWindow > 0 || counts.eliBeyondWindow > 0;

    return {
      ok: true,
      mode: 'READ_ONLY_RETENTION_READINESS',
      destructiveActionAuthorized: false,
      claimsPurgeExecuted: false,
      claimsAggregationCompleted: false,
      categoryIds: ['sensor_preprocessed_detailed', 'eli_inferred_detailed'],
      evaluationAt,
      cutoffAt: cutoffAt.toISOString(),
      expiryBasis: 'ROW_CLOCK_PLUS_UTC_CALENDAR_MONTHS',
      policyMonths: DETAILED_RETENTION_MONTHS,
      status: beyondWindow
        ? 'DETAILED_ROWS_BEYOND_36_MONTHS_PRESENT'
        : 'NO_DETAILED_ROWS_BEYOND_36_MONTHS',
      counts,
      policyBoundary: 'DETAILED_ONLY_AGGREGATION_AND_PURGE_EXECUTION_NOT_VERIFIED',
    };
  } catch {
    return failure('database_unavailable', true);
  }
}
