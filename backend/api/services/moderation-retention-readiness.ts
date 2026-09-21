import { isNotNull, isNull, lte, sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { communityReports } from '../../db/schema/index.js';
import {
  canonicalRetentionUtc,
  shiftRetentionUtcMonths,
} from './retention-time.js';

const MODERATION_RETENTION_MONTHS = 12;

export interface ModerationRetentionCounts {
  total: number;
  clockedTotal: number;
  unclockedTotal: number;
  beyondWindowTotal: number;
}

export interface ModerationRetentionRepository {
  countAt(cutoffAt: Date): Promise<ModerationRetentionCounts>;
}

export interface ModerationRetentionReadinessReport {
  ok: true;
  mode: 'READ_ONLY_RETENTION_READINESS';
  destructiveActionAuthorized: false;
  claimsPurgeExecuted: false;
  claimsRuntimeFinalActionStampingImplemented: false;
  claimsHistoricalBackfillComplete: false;
  categoryId: 'moderation_evidence';
  evaluationAt: string;
  cutoffAt: string;
  policyMonths: 12;
  status:
    | 'ROWS_BEYOND_12_MONTHS_PRESENT'
    | 'NO_ROWS_BEYOND_12_MONTHS_CLOCK_GAPS_PRESENT'
    | 'NO_ROWS_BEYOND_12_MONTHS';
  counts: ModerationRetentionCounts;
  policyBoundary:
    'FINAL_ACTION_CLOCK_READINESS_ONLY_RUNTIME_STAMPING_AND_HISTORICAL_BACKFILL_NOT_VERIFIED';
}

export interface ModerationRetentionReadinessFailure {
  ok: false;
  mode: 'READ_ONLY_RETENTION_READINESS';
  destructiveActionAuthorized: false;
  claimsPurgeExecuted: false;
  claimsRuntimeFinalActionStampingImplemented: false;
  claimsHistoricalBackfillComplete: false;
  error:
    | 'invalid_evaluation_at'
    | 'invalid_repository_result'
    | 'database_unavailable';
  retryable?: boolean;
}

export type ModerationRetentionReadinessResult =
  | ModerationRetentionReadinessReport
  | ModerationRetentionReadinessFailure;

function failure(
  error: ModerationRetentionReadinessFailure['error'],
  retryable?: boolean,
): ModerationRetentionReadinessFailure {
  return {
    ok: false,
    mode: 'READ_ONLY_RETENTION_READINESS',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    claimsRuntimeFinalActionStampingImplemented: false,
    claimsHistoricalBackfillComplete: false,
    error,
    ...(retryable === undefined ? {} : { retryable }),
  };
}

function validCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function validCounts(counts: ModerationRetentionCounts): boolean {
  return (
    validCount(counts.total)
    && validCount(counts.clockedTotal)
    && validCount(counts.unclockedTotal)
    && validCount(counts.beyondWindowTotal)
    && counts.clockedTotal + counts.unclockedTotal === counts.total
    && counts.beyondWindowTotal <= counts.clockedTotal
  );
}

const postgresRepository: ModerationRetentionRepository = {
  async countAt(cutoffAt) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`);
      await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);

      const [totalRow] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(communityReports);

      const [clockedRow] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(communityReports)
        .where(isNotNull(communityReports.finalActionAt));

      const [unclockedRow] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(communityReports)
        .where(isNull(communityReports.finalActionAt));

      const [beyondRow] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(communityReports)
        .where(lte(communityReports.finalActionAt, cutoffAt));

      return {
        total: Number(totalRow?.count ?? 0),
        clockedTotal: Number(clockedRow?.count ?? 0),
        unclockedTotal: Number(unclockedRow?.count ?? 0),
        beyondWindowTotal: Number(beyondRow?.count ?? 0),
      };
    });
  },
};

/**
 * Read-only readiness for the already-approved 12-month moderation-evidence window.
 *
 * This can report rows with an explicit final_action_at beyond the candidate
 * window and rows that still have no final-action clock. It cannot prove
 * runtime final-action stamping, historical clock backfill or purge execution.
 */
export async function inspectModerationRetention(
  evaluationAtInput: string,
  repository: ModerationRetentionRepository = postgresRepository,
): Promise<ModerationRetentionReadinessResult> {
  const evaluationAt = canonicalRetentionUtc(evaluationAtInput);
  if (!evaluationAt) return failure('invalid_evaluation_at');

  const cutoffIso = shiftRetentionUtcMonths(evaluationAt, -MODERATION_RETENTION_MONTHS);
  if (!cutoffIso) return failure('invalid_evaluation_at');
  const cutoffAt = new Date(cutoffIso);

  try {
    const counts = await repository.countAt(cutoffAt);
    if (!validCounts(counts)) return failure('invalid_repository_result');

    const status = counts.beyondWindowTotal > 0
      ? 'ROWS_BEYOND_12_MONTHS_PRESENT'
      : counts.unclockedTotal > 0
        ? 'NO_ROWS_BEYOND_12_MONTHS_CLOCK_GAPS_PRESENT'
        : 'NO_ROWS_BEYOND_12_MONTHS';

    return {
      ok: true,
      mode: 'READ_ONLY_RETENTION_READINESS',
      destructiveActionAuthorized: false,
      claimsPurgeExecuted: false,
      claimsRuntimeFinalActionStampingImplemented: false,
      claimsHistoricalBackfillComplete: false,
      categoryId: 'moderation_evidence',
      evaluationAt,
      cutoffAt: cutoffAt.toISOString(),
      policyMonths: MODERATION_RETENTION_MONTHS,
      status,
      counts,
      policyBoundary:
        'FINAL_ACTION_CLOCK_READINESS_ONLY_RUNTIME_STAMPING_AND_HISTORICAL_BACKFILL_NOT_VERIFIED',
    };
  } catch {
    return failure('database_unavailable', true);
  }
}
