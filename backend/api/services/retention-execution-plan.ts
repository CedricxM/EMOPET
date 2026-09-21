import { canonicalRetentionUtc } from './retention-time.js';
import {
  inspectExpiredRefreshSessionRetention,
  type RefreshSessionRetentionReadinessResult,
} from './auth-session-retention-readiness.js';
import {
  inspectExactLocationRetention,
  type ExactLocationRetentionReadinessResult,
} from './exact-location-retention-readiness.js';
import {
  inspectDetailedSensorEliRetention,
  type DetailedSensorEliRetentionReadinessResult,
} from './detailed-sensor-eli-retention-readiness.js';
import {
  inspectModerationRetention,
  type ModerationRetentionReadinessResult,
} from './moderation-retention-readiness.js';
import {
  inspectAiZeroDurableRetention,
  type AiZeroDurableRetentionReadinessResult,
} from './ai-zero-durable-retention-readiness.js';

export type RetentionExecutionSignalCategory =
  | 'auth_refresh_sessions'
  | 'exact_location'
  | 'sensor_preprocessed_detailed'
  | 'eli_inferred_detailed'
  | 'moderation_evidence'
  | 'ai_messages';

export type RetentionExecutionBlocker =
  | 'DESTRUCTIVE_EXECUTOR_NOT_AUTHORIZED'
  | 'AGGREGATION_NOT_VERIFIED'
  | 'SESSION_END_CLOCK_INCOMPLETE'
  | 'FINAL_ACTION_RUNTIME_STAMPING_NOT_IMPLEMENTED'
  | 'HISTORICAL_FINAL_ACTION_BACKFILL_NOT_VERIFIED'
  | 'HOLD_EVALUATION_NOT_COMPOSED'
  | 'DATABASE_WRITE_GUARD_NOT_VERIFIED'
  | 'LEGACY_AI_PURGE_NOT_AUTHORIZED';

export interface RetentionExecutionSignal {
  categoryId: RetentionExecutionSignalCategory;
  observedCount: number;
  signal:
    | 'EXPIRED_ROWS'
    | 'KNOWN_ROWS_BEYOND_MAX_WINDOW'
    | 'DETAILED_ROWS_BEYOND_WINDOW'
    | 'ROWS_BEYOND_RETENTION_WINDOW'
    | 'DURABLE_ROWS_PRESENT';
  executionStatus: 'BLOCKED';
  blockers: RetentionExecutionBlocker[];
}

export interface RetentionExecutionPlanReport {
  ok: true;
  mode: 'DRY_RUN_ONLY';
  destructiveActionAuthorized: false;
  claimsPurgeExecuted: false;
  claimsCrossCategorySnapshotAtomic: false;
  evaluationAt: string;
  status: 'NO_RETENTION_SIGNALS' | 'RETENTION_SIGNALS_PRESENT_EXECUTION_BLOCKED';
  observedSignalCountTotal: number;
  signals: RetentionExecutionSignal[];
  probeBoundaries: {
    exactLocationSessionEndComplete: false;
    detailedAggregationComplete: false;
    moderationRuntimeFinalActionStampingComplete: false;
    moderationHistoricalBackfillComplete: false;
  };
  policyBoundary: 'AGGREGATED_READ_ONLY_SIGNALS_NO_ROW_IDS_NO_MUTATION_NO_EXECUTION_AUTHORITY';
}

export interface RetentionExecutionPlanFailure {
  ok: false;
  mode: 'DRY_RUN_ONLY';
  destructiveActionAuthorized: false;
  claimsPurgeExecuted: false;
  error: 'invalid_evaluation_at' | 'readiness_unavailable';
  failedProbes?: RetentionExecutionSignalCategory[];
}

export type RetentionExecutionPlanResult =
  | RetentionExecutionPlanReport
  | RetentionExecutionPlanFailure;

export interface RetentionExecutionPlanDependencies {
  inspectRefresh(evaluationAt: string): Promise<RefreshSessionRetentionReadinessResult>;
  inspectExactLocation(evaluationAt: string): Promise<ExactLocationRetentionReadinessResult>;
  inspectDetailed(evaluationAt: string): Promise<DetailedSensorEliRetentionReadinessResult>;
  inspectModeration(evaluationAt: string): Promise<ModerationRetentionReadinessResult>;
  inspectAi(): Promise<AiZeroDurableRetentionReadinessResult>;
}

const defaultDependencies: RetentionExecutionPlanDependencies = {
  inspectRefresh: inspectExpiredRefreshSessionRetention,
  inspectExactLocation: inspectExactLocationRetention,
  inspectDetailed: inspectDetailedSensorEliRetention,
  inspectModeration: inspectModerationRetention,
  inspectAi: inspectAiZeroDurableRetention,
};

function failure(
  error: RetentionExecutionPlanFailure['error'],
  failedProbes?: RetentionExecutionSignalCategory[],
): RetentionExecutionPlanFailure {
  return {
    ok: false,
    mode: 'DRY_RUN_ONLY',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    error,
    ...(failedProbes && failedProbes.length > 0 ? { failedProbes } : {}),
  };
}

function signal(
  categoryId: RetentionExecutionSignalCategory,
  observedCount: number,
  signalType: RetentionExecutionSignal['signal'],
  blockers: RetentionExecutionBlocker[],
): RetentionExecutionSignal {
  return {
    categoryId,
    observedCount,
    signal: signalType,
    executionStatus: 'BLOCKED',
    blockers,
  };
}

/**
 * Compose the already-delivered read-only PRIV-01C probes into one bounded
 * execution-planning view.
 *
 * This deliberately exposes aggregate signal counts only. It returns no row ids,
 * performs no mutation and never authorises DELETE/UPDATE/anonymisation. Each
 * probe owns its own read-only transaction, so this is not a cross-category
 * atomic database snapshot.
 */
export async function inspectRetentionExecutionPlan(
  evaluationAtInput: string,
  dependencies: RetentionExecutionPlanDependencies = defaultDependencies,
): Promise<RetentionExecutionPlanResult> {
  const evaluationAt = canonicalRetentionUtc(evaluationAtInput);
  if (!evaluationAt) return failure('invalid_evaluation_at');

  const [refresh, exact, detailed, moderation, ai] = await Promise.all([
    dependencies.inspectRefresh(evaluationAt),
    dependencies.inspectExactLocation(evaluationAt),
    dependencies.inspectDetailed(evaluationAt),
    dependencies.inspectModeration(evaluationAt),
    dependencies.inspectAi(),
  ]);

  const failedProbes: RetentionExecutionSignalCategory[] = [];
  if (!refresh.ok) failedProbes.push('auth_refresh_sessions');
  if (!exact.ok) failedProbes.push('exact_location');
  if (!detailed.ok) {
    failedProbes.push('sensor_preprocessed_detailed', 'eli_inferred_detailed');
  }
  if (!moderation.ok) failedProbes.push('moderation_evidence');
  if (!ai.ok) failedProbes.push('ai_messages');

  if (failedProbes.length > 0) {
    return failure('readiness_unavailable', failedProbes);
  }

  const signals: RetentionExecutionSignal[] = [];

  if (refresh.counts.expiredTotal > 0) {
    signals.push(signal(
      'auth_refresh_sessions',
      refresh.counts.expiredTotal,
      'EXPIRED_ROWS',
      ['DESTRUCTIVE_EXECUTOR_NOT_AUTHORIZED'],
    ));
  }

  if (exact.counts.beyondMaxWindowTotal > 0) {
    signals.push(signal(
      'exact_location',
      exact.counts.beyondMaxWindowTotal,
      'KNOWN_ROWS_BEYOND_MAX_WINDOW',
      ['SESSION_END_CLOCK_INCOMPLETE', 'DESTRUCTIVE_EXECUTOR_NOT_AUTHORIZED'],
    ));
  }

  if (detailed.counts.sensorBeyondWindow > 0) {
    signals.push(signal(
      'sensor_preprocessed_detailed',
      detailed.counts.sensorBeyondWindow,
      'DETAILED_ROWS_BEYOND_WINDOW',
      ['AGGREGATION_NOT_VERIFIED', 'DESTRUCTIVE_EXECUTOR_NOT_AUTHORIZED'],
    ));
  }

  if (detailed.counts.eliBeyondWindow > 0) {
    signals.push(signal(
      'eli_inferred_detailed',
      detailed.counts.eliBeyondWindow,
      'DETAILED_ROWS_BEYOND_WINDOW',
      ['AGGREGATION_NOT_VERIFIED', 'DESTRUCTIVE_EXECUTOR_NOT_AUTHORIZED'],
    ));
  }

  if (moderation.counts.beyondWindowTotal > 0) {
    signals.push(signal(
      'moderation_evidence',
      moderation.counts.beyondWindowTotal,
      'ROWS_BEYOND_RETENTION_WINDOW',
      [
        'FINAL_ACTION_RUNTIME_STAMPING_NOT_IMPLEMENTED',
        'HISTORICAL_FINAL_ACTION_BACKFILL_NOT_VERIFIED',
        'HOLD_EVALUATION_NOT_COMPOSED',
        'DESTRUCTIVE_EXECUTOR_NOT_AUTHORIZED',
      ],
    ));
  }

  if (ai.durableRowCount > 0) {
    const blockers: RetentionExecutionBlocker[] = [
      'LEGACY_AI_PURGE_NOT_AUTHORIZED',
      'DESTRUCTIVE_EXECUTOR_NOT_AUTHORIZED',
    ];
    if (!ai.claimsDatabaseWritePreventionVerifiedAtRuntime) {
      blockers.unshift('DATABASE_WRITE_GUARD_NOT_VERIFIED');
    }

    signals.push(signal(
      'ai_messages',
      ai.durableRowCount,
      'DURABLE_ROWS_PRESENT',
      blockers,
    ));
  }

  const observedSignalCountTotal = signals.reduce(
    (total, item) => total + item.observedCount,
    0,
  );

  return {
    ok: true,
    mode: 'DRY_RUN_ONLY',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    claimsCrossCategorySnapshotAtomic: false,
    evaluationAt,
    status: observedSignalCountTotal > 0
      ? 'RETENTION_SIGNALS_PRESENT_EXECUTION_BLOCKED'
      : 'NO_RETENTION_SIGNALS',
    observedSignalCountTotal,
    signals,
    probeBoundaries: {
      exactLocationSessionEndComplete: false,
      detailedAggregationComplete: false,
      moderationRuntimeFinalActionStampingComplete: false,
      moderationHistoricalBackfillComplete: false,
    },
    policyBoundary: 'AGGREGATED_READ_ONLY_SIGNALS_NO_ROW_IDS_NO_MUTATION_NO_EXECUTION_AUTHORITY',
  };
}
