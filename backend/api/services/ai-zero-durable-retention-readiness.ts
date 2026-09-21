import { sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { aiMessages } from '../../db/schema/index.js';

const AI_WRITE_GUARD_CONSTRAINT = 'chk_ai_messages_no_durable_persistence';

export interface AiDatabaseWriteGuardState {
  present: boolean;
  expression: string | null;
  validated: boolean | null;
}

export interface AiZeroDurableRetentionSnapshot {
  durableRowCount: number;
  databaseWriteGuard: AiDatabaseWriteGuardState;
}

export interface AiZeroDurableRetentionRepository {
  inspectRetentionState(): Promise<AiZeroDurableRetentionSnapshot>;
}

export interface AiZeroDurableRetentionReadinessReport {
  ok: true;
  mode: 'READ_ONLY_RETENTION_READINESS';
  destructiveActionAuthorized: false;
  claimsPurgeExecuted: false;
  claimsWritePreventionImplemented: boolean;
  claimsRepositoryRuntimePersistenceGuardImplemented: true;
  claimsDatabaseWritePreventionImplemented: true;
  claimsDatabaseWritePreventionVerifiedAtRuntime: boolean;
  categoryId: 'ai_messages';
  policySeconds: 0;
  status: 'NO_DURABLE_AI_ROWS_PRESENT' | 'DURABLE_AI_ROWS_PRESENT';
  durableRowCount: number;
  databaseWriteGuardStatus: 'VERIFIED' | 'MISSING_OR_MISMATCHED';
  databaseWriteGuardValidated: boolean | null;
  policyBoundary: 'RUNTIME_DATABASE_GUARD_ATTESTATION_IMPLEMENTED_PURGE_NOT_IMPLEMENTED';
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

function validGuardState(value: AiDatabaseWriteGuardState): boolean {
  return typeof value.present === 'boolean'
    && (value.expression === null || typeof value.expression === 'string')
    && (value.validated === null || typeof value.validated === 'boolean');
}

function guardVerified(guard: AiDatabaseWriteGuardState): boolean {
  return guard.present
    && guard.expression?.trim().toLowerCase() === 'false';
}

const postgresRepository: AiZeroDurableRetentionRepository = {
  async inspectRetentionState() {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`);
      await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);

      const [row] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(aiMessages);

      const guardRows = await tx.execute(sql<{
        expression: string;
        validated: boolean;
      }>`
        SELECT
          pg_get_expr(c.conbin, c.conrelid, true) AS expression,
          c.convalidated AS validated
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'ai_messages'
          AND c.conname = ${AI_WRITE_GUARD_CONSTRAINT}
          AND c.contype = 'c'
        LIMIT 1
      `);

      const guard = guardRows[0];
      return {
        durableRowCount: Number(row?.count ?? 0),
        databaseWriteGuard: guard
          ? {
              present: true,
              expression: typeof guard.expression === 'string' ? guard.expression : null,
              validated: typeof guard.validated === 'boolean' ? guard.validated : null,
            }
          : {
              present: false,
              expression: null,
              validated: null,
            },
      };
    });
  },
};

/**
 * Read-only negative-evidence + live write-guard attestation for founder
 * decision AI-A / R4.
 *
 * The current product authority permits zero durable ai_messages rows. This
 * probe never mutates or deletes them. It verifies both row-count evidence and
 * the expected PostgreSQL CHECK(false) guard. A historical database may carry
 * the guard as NOT VALID while legacy rows remain; PostgreSQL still enforces
 * that constraint for new INSERT/UPDATE attempts.
 */
export async function inspectAiZeroDurableRetention(
  repository: AiZeroDurableRetentionRepository = postgresRepository,
): Promise<AiZeroDurableRetentionReadinessResult> {
  try {
    const snapshot = await repository.inspectRetentionState();
    if (
      !snapshot
      || !validCount(snapshot.durableRowCount)
      || !snapshot.databaseWriteGuard
      || !validGuardState(snapshot.databaseWriteGuard)
    ) {
      return failure('invalid_repository_result');
    }

    const databaseWriteGuardVerified = guardVerified(snapshot.databaseWriteGuard);

    return {
      ok: true,
      mode: 'READ_ONLY_RETENTION_READINESS',
      destructiveActionAuthorized: false,
      claimsPurgeExecuted: false,
      claimsWritePreventionImplemented: databaseWriteGuardVerified,
      claimsRepositoryRuntimePersistenceGuardImplemented: true,
      claimsDatabaseWritePreventionImplemented: true,
      claimsDatabaseWritePreventionVerifiedAtRuntime: databaseWriteGuardVerified,
      categoryId: 'ai_messages',
      policySeconds: 0,
      status: snapshot.durableRowCount > 0
        ? 'DURABLE_AI_ROWS_PRESENT'
        : 'NO_DURABLE_AI_ROWS_PRESENT',
      durableRowCount: snapshot.durableRowCount,
      databaseWriteGuardStatus: databaseWriteGuardVerified
        ? 'VERIFIED'
        : 'MISSING_OR_MISMATCHED',
      databaseWriteGuardValidated: snapshot.databaseWriteGuard.validated,
      policyBoundary: 'RUNTIME_DATABASE_GUARD_ATTESTATION_IMPLEMENTED_PURGE_NOT_IMPLEMENTED',
    };
  } catch {
    return failure('database_unavailable', true);
  }
}
