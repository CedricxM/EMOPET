import { lte, sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { authRefreshSessions } from '../../db/schema/index.js';
import { canonicalRetentionUtc } from './retention-time.js';

export interface ExpiredRefreshSessionCounts {
  expiredTotal: number;
  detachedExpired: number;
  linkedExpired: number;
  revokedExpired: number;
  unrevokedExpired: number;
}

export interface RefreshSessionRetentionRepository {
  countExpiredAt(evaluationAt: Date): Promise<ExpiredRefreshSessionCounts>;
}

export interface RefreshSessionRetentionReadinessReport {
  ok: true;
  mode: 'READ_ONLY_RETENTION_READINESS';
  destructiveActionAuthorized: false;
  claimsPurgeExecuted: false;
  categoryId: 'auth_refresh_sessions';
  evaluationAt: string;
  status: 'NO_EXPIRED_ROWS' | 'EXPIRED_ROWS_PRESENT';
  counts: ExpiredRefreshSessionCounts;
  policyBoundary: 'DELETE_ONLY_AFTER_ORIGINAL_EXPIRY';
}

export interface RefreshSessionRetentionReadinessFailure {
  ok: false;
  mode: 'READ_ONLY_RETENTION_READINESS';
  destructiveActionAuthorized: false;
  claimsPurgeExecuted: false;
  error:
    | 'invalid_evaluation_at'
    | 'invalid_repository_result'
    | 'database_unavailable';
  retryable?: boolean;
}

export type RefreshSessionRetentionReadinessResult =
  | RefreshSessionRetentionReadinessReport
  | RefreshSessionRetentionReadinessFailure;

function failure(
  error: RefreshSessionRetentionReadinessFailure['error'],
  retryable?: boolean,
): RefreshSessionRetentionReadinessFailure {
  return {
    ok: false,
    mode: 'READ_ONLY_RETENTION_READINESS',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    error,
    ...(retryable === undefined ? {} : { retryable }),
  };
}

function validCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function validCounts(counts: ExpiredRefreshSessionCounts): boolean {
  return (
    validCount(counts.expiredTotal)
    && validCount(counts.detachedExpired)
    && validCount(counts.linkedExpired)
    && validCount(counts.revokedExpired)
    && validCount(counts.unrevokedExpired)
    && counts.detachedExpired + counts.linkedExpired === counts.expiredTotal
    && counts.revokedExpired + counts.unrevokedExpired === counts.expiredTotal
  );
}

const postgresRepository: RefreshSessionRetentionRepository = {
  async countExpiredAt(evaluationAt) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`);
      await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);

      const [row] = await tx
        .select({
          expiredTotal: sql<number>`count(*)::int`,
          detachedExpired: sql<number>`count(*) FILTER (WHERE ${authRefreshSessions.userId} IS NULL)::int`,
          linkedExpired: sql<number>`count(*) FILTER (WHERE ${authRefreshSessions.userId} IS NOT NULL)::int`,
          revokedExpired: sql<number>`count(*) FILTER (WHERE ${authRefreshSessions.revokedAt} IS NOT NULL)::int`,
          unrevokedExpired: sql<number>`count(*) FILTER (WHERE ${authRefreshSessions.revokedAt} IS NULL)::int`,
        })
        .from(authRefreshSessions)
        .where(lte(authRefreshSessions.expiresAt, evaluationAt));

      return {
        expiredTotal: Number(row?.expiredTotal ?? 0),
        detachedExpired: Number(row?.detachedExpired ?? 0),
        linkedExpired: Number(row?.linkedExpired ?? 0),
        revokedExpired: Number(row?.revokedExpired ?? 0),
        unrevokedExpired: Number(row?.unrevokedExpired ?? 0),
      };
    });
  },
};

/**
 * Read-only readiness probe for the already-determined refresh-session lifecycle.
 *
 * It discovers only aggregate counts of rows whose ORIGINAL expires_at has
 * elapsed. It never returns token hashes, session ids or user ids, and it never
 * authorises or executes deletion.
 */
export async function inspectExpiredRefreshSessionRetention(
  evaluationAtInput: string,
  repository: RefreshSessionRetentionRepository = postgresRepository,
): Promise<RefreshSessionRetentionReadinessResult> {
  const evaluationAt = canonicalRetentionUtc(evaluationAtInput);
  if (!evaluationAt) return failure('invalid_evaluation_at');

  try {
    const counts = await repository.countExpiredAt(new Date(evaluationAt));
    if (!validCounts(counts)) return failure('invalid_repository_result');

    return {
      ok: true,
      mode: 'READ_ONLY_RETENTION_READINESS',
      destructiveActionAuthorized: false,
      claimsPurgeExecuted: false,
      categoryId: 'auth_refresh_sessions',
      evaluationAt,
      status: counts.expiredTotal > 0 ? 'EXPIRED_ROWS_PRESENT' : 'NO_EXPIRED_ROWS',
      counts,
      policyBoundary: 'DELETE_ONLY_AFTER_ORIGINAL_EXPIRY',
    };
  } catch {
    return failure('database_unavailable', true);
  }
}
