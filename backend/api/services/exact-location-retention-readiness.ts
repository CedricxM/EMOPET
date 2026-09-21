import { sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { copresenceEvents } from '../../db/schema/index.js';

const MAX_EXACT_LOCATION_RETENTION_HOURS = 24;
const MAX_EXACT_LOCATION_RETENTION_MS =
  MAX_EXACT_LOCATION_RETENTION_HOURS * 60 * 60 * 1000;

export interface ExactLocationRetentionCounts {
  coordinateBearingTotal: number;
  completeCoordinatePairs: number;
  partialCoordinateRows: number;
  beyondMaxWindowTotal: number;
  beyondMaxWindowCompletePairs: number;
  beyondMaxWindowPartialRows: number;
}

export interface ExactLocationRetentionRepository {
  countAt(cutoffAt: Date): Promise<ExactLocationRetentionCounts>;
}

export interface ExactLocationRetentionReadinessReport {
  ok: true;
  mode: 'READ_ONLY_RETENTION_READINESS';
  destructiveActionAuthorized: false;
  claimsPurgeExecuted: false;
  claimsSessionEndCompliance: false;
  categoryId: 'exact_location';
  evaluationAt: string;
  cutoffAt: string;
  policyMaxHours: 24;
  status: 'NO_ROWS_BEYOND_MAX_WINDOW' | 'ROWS_BEYOND_MAX_WINDOW_PRESENT';
  counts: ExactLocationRetentionCounts;
  policyBoundary: 'MAX_24_HOURS_ONLY_SESSION_END_MAY_REQUIRE_EARLIER_DELETION';
}

export interface ExactLocationRetentionReadinessFailure {
  ok: false;
  mode: 'READ_ONLY_RETENTION_READINESS';
  destructiveActionAuthorized: false;
  claimsPurgeExecuted: false;
  claimsSessionEndCompliance: false;
  error:
    | 'invalid_evaluation_at'
    | 'invalid_repository_result'
    | 'database_unavailable';
  retryable?: boolean;
}

export type ExactLocationRetentionReadinessResult =
  | ExactLocationRetentionReadinessReport
  | ExactLocationRetentionReadinessFailure;

function failure(
  error: ExactLocationRetentionReadinessFailure['error'],
  retryable?: boolean,
): ExactLocationRetentionReadinessFailure {
  return {
    ok: false,
    mode: 'READ_ONLY_RETENTION_READINESS',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    claimsSessionEndCompliance: false,
    error,
    ...(retryable === undefined ? {} : { retryable }),
  };
}

function canonicalUtc(value: string): string | null {
  if (typeof value !== 'string' || !value.endsWith('Z')) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

function validCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function validCounts(counts: ExactLocationRetentionCounts): boolean {
  return (
    validCount(counts.coordinateBearingTotal)
    && validCount(counts.completeCoordinatePairs)
    && validCount(counts.partialCoordinateRows)
    && validCount(counts.beyondMaxWindowTotal)
    && validCount(counts.beyondMaxWindowCompletePairs)
    && validCount(counts.beyondMaxWindowPartialRows)
    && counts.completeCoordinatePairs + counts.partialCoordinateRows
      === counts.coordinateBearingTotal
    && counts.beyondMaxWindowCompletePairs + counts.beyondMaxWindowPartialRows
      === counts.beyondMaxWindowTotal
    && counts.beyondMaxWindowTotal <= counts.coordinateBearingTotal
    && counts.beyondMaxWindowCompletePairs <= counts.completeCoordinatePairs
    && counts.beyondMaxWindowPartialRows <= counts.partialCoordinateRows
  );
}

const postgresRepository: ExactLocationRetentionRepository = {
  async countAt(cutoffAt) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`);
      await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);

      const [row] = await tx
        .select({
          coordinateBearingTotal: sql<number>`count(*) FILTER (
            WHERE ${copresenceEvents.latitude} IS NOT NULL
               OR ${copresenceEvents.longitude} IS NOT NULL
          )::int`,
          completeCoordinatePairs: sql<number>`count(*) FILTER (
            WHERE ${copresenceEvents.latitude} IS NOT NULL
              AND ${copresenceEvents.longitude} IS NOT NULL
          )::int`,
          partialCoordinateRows: sql<number>`count(*) FILTER (
            WHERE (${copresenceEvents.latitude} IS NULL)
               <> (${copresenceEvents.longitude} IS NULL)
          )::int`,
          beyondMaxWindowTotal: sql<number>`count(*) FILTER (
            WHERE (${copresenceEvents.latitude} IS NOT NULL
                OR ${copresenceEvents.longitude} IS NOT NULL)
              AND ${copresenceEvents.occurredAt} <= ${cutoffAt}
          )::int`,
          beyondMaxWindowCompletePairs: sql<number>`count(*) FILTER (
            WHERE ${copresenceEvents.latitude} IS NOT NULL
              AND ${copresenceEvents.longitude} IS NOT NULL
              AND ${copresenceEvents.occurredAt} <= ${cutoffAt}
          )::int`,
          beyondMaxWindowPartialRows: sql<number>`count(*) FILTER (
            WHERE (${copresenceEvents.latitude} IS NULL)
               <> (${copresenceEvents.longitude} IS NULL)
              AND ${copresenceEvents.occurredAt} <= ${cutoffAt}
          )::int`,
        })
        .from(copresenceEvents);

      return {
        coordinateBearingTotal: Number(row?.coordinateBearingTotal ?? 0),
        completeCoordinatePairs: Number(row?.completeCoordinatePairs ?? 0),
        partialCoordinateRows: Number(row?.partialCoordinateRows ?? 0),
        beyondMaxWindowTotal: Number(row?.beyondMaxWindowTotal ?? 0),
        beyondMaxWindowCompletePairs: Number(row?.beyondMaxWindowCompletePairs ?? 0),
        beyondMaxWindowPartialRows: Number(row?.beyondMaxWindowPartialRows ?? 0),
      };
    });
  },
};

/**
 * Read-only readiness for the already-approved exact-location maximum window.
 *
 * This probe can identify copresence rows that are definitely beyond the
 * 24-hour maximum. It cannot prove compliance with the stricter
 * "feature-session end, if earlier" trigger because no canonical session-end
 * clock is currently available here.
 */
export async function inspectExactLocationRetention(
  evaluationAtInput: string,
  repository: ExactLocationRetentionRepository = postgresRepository,
): Promise<ExactLocationRetentionReadinessResult> {
  const evaluationAt = canonicalUtc(evaluationAtInput);
  if (!evaluationAt) return failure('invalid_evaluation_at');

  const cutoffAt = new Date(
    Date.parse(evaluationAt) - MAX_EXACT_LOCATION_RETENTION_MS,
  );

  try {
    const counts = await repository.countAt(cutoffAt);
    if (!validCounts(counts)) return failure('invalid_repository_result');

    return {
      ok: true,
      mode: 'READ_ONLY_RETENTION_READINESS',
      destructiveActionAuthorized: false,
      claimsPurgeExecuted: false,
      claimsSessionEndCompliance: false,
      categoryId: 'exact_location',
      evaluationAt,
      cutoffAt: cutoffAt.toISOString(),
      policyMaxHours: MAX_EXACT_LOCATION_RETENTION_HOURS,
      status: counts.beyondMaxWindowTotal > 0
        ? 'ROWS_BEYOND_MAX_WINDOW_PRESENT'
        : 'NO_ROWS_BEYOND_MAX_WINDOW',
      counts,
      policyBoundary: 'MAX_24_HOURS_ONLY_SESSION_END_MAY_REQUIRE_EARLIER_DELETION',
    };
  } catch {
    return failure('database_unavailable', true);
  }
}
