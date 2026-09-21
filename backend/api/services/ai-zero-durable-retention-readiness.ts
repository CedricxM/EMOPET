import { sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { aiMessages } from '../../db/schema/index.js';

export interface AiZeroDurableRetentionRepository {
  countDurableRows(): Promise<number>;
}

export interface AiZeroDurableRetentionReadinessReport {
  ok: true;
  mode: 'READ_ONLY_RETENTION_READINESS';
  destructiveActionAuthorized: false;
  claimsPurgeExecuted: false;
  claimsWritePreventionImplemented: false;
  claimsRepositoryRuntimePersistenceGuardImplemented: true;
  claimsDatabaseWritePreventionImplemented: true;
  claimsDatabaseWritePreventionVerifiedAtRuntime: false;
  categoryId: 'ai_messages';
  policySeconds: 0;
  status: 'NO_DURABLE_AI_ROWS_PRESENT' | 'DURABLE_AI_ROWS_PRESENT';
  durableRowCount: number;
  policyBoundary: 'REPOSITORY_AND_DATABASE_WRITE_GUARDS_IMPLEMENTED_RUNTIME_DATABASE_ATTESTATION_AND_PURGE_NOT_IMPLEMENTED';
}

export interface AiZeroDurableRetentionReadinessFailure {
  ok: false;
  mode: 'READ_ONLY_RETENTION_READINESS';
  destructiveActionAuthorized: false;
  claimsPurgeExecuted: false;
  claimsWritePreventionImplemented: false;
  claimsRepositoryRuntimePersistenceGuardImplemented: true;
  claimsDatabaseWritePreventionImplemented: true;
  claimsDatabaseWritePreventionVerifiedAtRuntime: false;
  error: 'invalid_repository_result' | 'database_unavailable';
  retryable?: boolean;
}

export type AiZeroDurableRetentionReadinessResult =
  | AiZeroDurableRetentionReadinessReport
  | AiZeroDurableRetentionReadinessFailure;

function failure(
  error: AiZeroDurableRetentionReadinessFailure['error'],
  retryable?: boolean,
): AiZeroDurableRetentionReadinessFailure {
  return {
    ok: false,
    mode: 'READ_ONLY_RETENTION_READINESS',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    claimsWritePreventionImplemented: false,
    claimsRepositoryRuntimePersistenceGuardImplemented: true,
    claimsDatabaseWritePreventionImplemented: true,
    claimsDatabaseWritePreventionVerifiedAtRuntime: false,
    error,
    ...(retryable === undefined ? {} : { retryable }),
  };
}

function validCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

const postgresRepository: AiZeroDurableRetentionRepository = {
  async countDurableRows() {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`);
      await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);

      const [row] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(aiMessages);

      return Number(row?.count ?? 0);
    });
  },
};

/**
 * Read-only negative-evidence probe for founder decision AI-A / R4.
 *
 * The current product authority permits zero durable ai_messages rows. This
 * probe detects whether durable rows exist and never deletes them. Repository
 * runtime access is constrained by the static allowlist guard. Fresh Drizzle
 * baselines and historical upgrades now also carry a CHECK(false) write guard;
 * this read-only probe does not yet attest that the expected constraint is
 * present in the live database, so the aggregate verified-prevention claim
 * remains conservative.
 */
export async function inspectAiZeroDurableRetention(
  repository: AiZeroDurableRetentionRepository = postgresRepository,
): Promise<AiZeroDurableRetentionReadinessResult> {
  try {
    const durableRowCount = await repository.countDurableRows();
    if (!validCount(durableRowCount)) return failure('invalid_repository_result');

    return {
      ok: true,
      mode: 'READ_ONLY_RETENTION_READINESS',
      destructiveActionAuthorized: false,
      claimsPurgeExecuted: false,
      claimsWritePreventionImplemented: false,
      claimsRepositoryRuntimePersistenceGuardImplemented: true,
      claimsDatabaseWritePreventionImplemented: true,
      claimsDatabaseWritePreventionVerifiedAtRuntime: false,
      categoryId: 'ai_messages',
      policySeconds: 0,
      status: durableRowCount > 0
        ? 'DURABLE_AI_ROWS_PRESENT'
        : 'NO_DURABLE_AI_ROWS_PRESENT',
      durableRowCount,
      policyBoundary: 'REPOSITORY_AND_DATABASE_WRITE_GUARDS_IMPLEMENTED_RUNTIME_DATABASE_ATTESTATION_AND_PURGE_NOT_IMPLEMENTED',
    };
  } catch {
    return failure('database_unavailable', true);
  }
}
