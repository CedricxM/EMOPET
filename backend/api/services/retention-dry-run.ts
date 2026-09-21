import {
  canonicalRetentionUtc,
  representableRetentionUtc,
  shiftRetentionUtcMonths,
} from './retention-time.js';

export type RetentionUnit = 'SECONDS' | 'HOURS' | 'DAYS' | 'MONTHS' | 'YEARS';

export type RetentionMode =
  | 'DURATION'
  | 'ROLLING_DURATION'
  | 'MAX_DURATION'
  | 'WHILE_ACTIVE_ACCOUNT'
  | 'WHILE_ACTIVE_DOG_PROFILE'
  | 'WHILE_USER_RETAINS_RECORD'
  | 'WHILE_CONTENT_AND_ACCOUNT_ACTIVE'
  | 'ACTIVE_DOG_PROFILE_LIFETIME'
  | 'NO_DURABLE_RETENTION';

export interface RetentionActiveRule {
  mode: RetentionMode;
  value?: number;
  unit?: RetentionUnit;
}

export interface RetentionCategoryPolicy {
  id: string;
  trigger: string;
  activeRetention: RetentionActiveRule;
  archive: string | null;
  finalDisposition: string;
  holdConditions: string[];
  purgeEvidence: 'REQUIRED' | 'NEGATIVE_EVIDENCE_REQUIRED';
  authority: string;
}

export interface RetentionSchedule {
  schemaVersion: string;
  status: string;
  runtimeEnforcement: string;
  categories: RetentionCategoryPolicy[];
}

export interface RetentionHoldInput {
  active: boolean;
  condition: string;
}

export interface RetentionDryRunInput {
  categoryId: string;
  evaluationAt: string;
  retentionStartedAt?: string;
  lifecycleEndedAt?: string;
  earlyExpiryAt?: string;
  durableRecordPresent?: boolean;
  hold?: RetentionHoldInput;
}

export type RetentionDryRunVerdict = 'KEEP' | 'EXPIRED' | 'HELD' | 'NOT_APPLICABLE';

export interface RetentionDryRunSuccess {
  ok: true;
  mode: 'DRY_RUN_ONLY';
  destructiveActionAuthorized: false;
  categoryId: string;
  verdict: RetentionDryRunVerdict;
  reason:
    | 'WITHIN_RETENTION_WINDOW'
    | 'ACTIVE_LIFECYCLE'
    | 'RETENTION_WINDOW_ELAPSED'
    | 'LIFECYCLE_ENDED'
    | 'EARLY_EXPIRY_REACHED'
    | 'ACTIVE_APPROVED_HOLD'
    | 'NO_DURABLE_RETENTION_RECORD_PRESENT'
    | 'NO_DURABLE_RECORD_PRESENT';
  evaluationAt: string;
  retentionStartedAt: string | null;
  lifecycleEndedAt: string | null;
  earlyExpiryAt: string | null;
  ordinaryExpiryAt: string | null;
  effectiveExpiryAt: string | null;
  finalDisposition: string;
  purgeEvidence: RetentionCategoryPolicy['purgeEvidence'];
  holdCondition: string | null;
}

export interface RetentionDryRunFailure {
  ok: false;
  mode: 'DRY_RUN_ONLY';
  destructiveActionAuthorized: false;
  error:
    | 'invalid_schedule'
    | 'category_not_found'
    | 'invalid_evaluation_at'
    | 'invalid_retention_started_at'
    | 'invalid_lifecycle_ended_at'
    | 'invalid_early_expiry_at'
    | 'retention_started_at_required'
    | 'duration_rule_invalid'
    | 'lifecycle_ended_at_not_allowed'
    | 'early_expiry_at_not_allowed'
    | 'hold_not_allowed'
    | 'hold_condition_mismatch';
}

export type RetentionDryRunResult = RetentionDryRunSuccess | RetentionDryRunFailure;

const DURATION_MODES = new Set<RetentionMode>(['DURATION', 'ROLLING_DURATION', 'MAX_DURATION']);
const LIFECYCLE_MODES = new Set<RetentionMode>([
  'WHILE_ACTIVE_ACCOUNT',
  'WHILE_ACTIVE_DOG_PROFILE',
  'WHILE_USER_RETAINS_RECORD',
  'WHILE_CONTENT_AND_ACCOUNT_ACTIVE',
  'ACTIVE_DOG_PROFILE_LIFETIME',
]);

function failure(error: RetentionDryRunFailure['error']): RetentionDryRunFailure {
  return {
    ok: false,
    mode: 'DRY_RUN_ONLY',
    destructiveActionAuthorized: false,
    error,
  };
}

export function computeRetentionExpiry(
  startedAt: string,
  value: number,
  unit: RetentionUnit,
): string | null {
  const canonical = canonicalRetentionUtc(startedAt);
  if (!canonical || !Number.isSafeInteger(value) || value < 0) return null;

  const startMs = Date.parse(canonical);
  switch (unit) {
    case 'SECONDS':
      return representableRetentionUtc(new Date(startMs + value * 1_000));
    case 'HOURS':
      return representableRetentionUtc(new Date(startMs + value * 60 * 60 * 1_000));
    case 'DAYS':
      return representableRetentionUtc(new Date(startMs + value * 24 * 60 * 60 * 1_000));
    case 'MONTHS':
      return shiftRetentionUtcMonths(canonical, value);
    case 'YEARS':
      return shiftRetentionUtcMonths(canonical, value * 12);
    default:
      return null;
  }
}

function validSchedule(schedule: RetentionSchedule): boolean {
  if (
    schedule?.schemaVersion !== 'emopet-retention-schedule-v1'
    || schedule?.status !== 'PRODUCT_APPROVED_CANDIDATE_LEGAL_PRIVACY_SIGNOFF_PENDING'
    || schedule?.runtimeEnforcement !== 'NOT_IMPLEMENTED'
    || !Array.isArray(schedule?.categories)
  ) {
    return false;
  }

  const ids = new Set<string>();
  for (const category of schedule.categories) {
    if (
      typeof category?.id !== 'string'
      || category.id.length === 0
      || ids.has(category.id)
      || typeof category?.trigger !== 'string'
      || typeof category?.finalDisposition !== 'string'
      || !Array.isArray(category?.holdConditions)
      || typeof category?.activeRetention?.mode !== 'string'
    ) {
      return false;
    }
    ids.add(category.id);
  }

  return true;
}

function minIso(...values: Array<string | null>): string | null {
  const present = values.filter((value): value is string => value !== null);
  if (present.length === 0) return null;
  return present.reduce((min, value) => Date.parse(value) < Date.parse(min) ? value : min);
}

/**
 * Pure PRIV-01C retention dry-run.
 *
 * This function never performs I/O and never authorises DELETE/UPDATE/anonymisation.
 * It only evaluates an already-approved candidate category rule at an explicit time.
 */
export function planRetentionDryRun(
  schedule: RetentionSchedule,
  input: RetentionDryRunInput,
): RetentionDryRunResult {
  if (!validSchedule(schedule)) return failure('invalid_schedule');

  const category = schedule.categories.find((item) => item.id === input.categoryId);
  if (!category) return failure('category_not_found');

  const evaluationAt = canonicalRetentionUtc(input.evaluationAt);
  if (!evaluationAt) return failure('invalid_evaluation_at');

  const retentionStartedAt = input.retentionStartedAt === undefined
    ? null
    : canonicalRetentionUtc(input.retentionStartedAt);
  if (input.retentionStartedAt !== undefined && !retentionStartedAt) {
    return failure('invalid_retention_started_at');
  }

  const lifecycleEndedAt = input.lifecycleEndedAt === undefined
    ? null
    : canonicalRetentionUtc(input.lifecycleEndedAt);
  if (input.lifecycleEndedAt !== undefined && !lifecycleEndedAt) {
    return failure('invalid_lifecycle_ended_at');
  }

  const earlyExpiryAt = input.earlyExpiryAt === undefined
    ? null
    : canonicalRetentionUtc(input.earlyExpiryAt);
  if (input.earlyExpiryAt !== undefined && !earlyExpiryAt) {
    return failure('invalid_early_expiry_at');
  }

  const mode = category.activeRetention.mode;
  if (!LIFECYCLE_MODES.has(mode) && lifecycleEndedAt) {
    return failure('lifecycle_ended_at_not_allowed');
  }
  if (mode !== 'MAX_DURATION' && earlyExpiryAt) {
    return failure('early_expiry_at_not_allowed');
  }

  const hold = input.hold?.active === true ? input.hold : null;
  if (hold) {
    if (category.holdConditions.length === 0) return failure('hold_not_allowed');
    if (!category.holdConditions.includes(hold.condition)) {
      return failure('hold_condition_mismatch');
    }
  }

  if (mode === 'NO_DURABLE_RETENTION') {
    const recordPresent = input.durableRecordPresent !== false;
    return {
      ok: true,
      mode: 'DRY_RUN_ONLY',
      destructiveActionAuthorized: false,
      categoryId: category.id,
      verdict: recordPresent ? 'EXPIRED' : 'NOT_APPLICABLE',
      reason: recordPresent
        ? 'NO_DURABLE_RETENTION_RECORD_PRESENT'
        : 'NO_DURABLE_RECORD_PRESENT',
      evaluationAt,
      retentionStartedAt,
      lifecycleEndedAt,
      earlyExpiryAt,
      ordinaryExpiryAt: retentionStartedAt,
      effectiveExpiryAt: retentionStartedAt,
      finalDisposition: category.finalDisposition,
      purgeEvidence: category.purgeEvidence,
      holdCondition: null,
    };
  }

  let ordinaryExpiryAt: string | null = null;
  let effectiveExpiryAt: string | null = null;
  let due = false;
  let dueReason: RetentionDryRunSuccess['reason'] = 'WITHIN_RETENTION_WINDOW';

  if (DURATION_MODES.has(mode)) {
    const { value, unit } = category.activeRetention;
    if (!retentionStartedAt) return failure('retention_started_at_required');
    if (
      value === undefined
      || !Number.isSafeInteger(value)
      || value < 0
      || !unit
    ) {
      return failure('duration_rule_invalid');
    }

    ordinaryExpiryAt = computeRetentionExpiry(retentionStartedAt, value, unit);
    if (!ordinaryExpiryAt) return failure('duration_rule_invalid');
    effectiveExpiryAt = mode === 'MAX_DURATION'
      ? minIso(ordinaryExpiryAt, earlyExpiryAt)
      : ordinaryExpiryAt;

    due = effectiveExpiryAt !== null && Date.parse(evaluationAt) >= Date.parse(effectiveExpiryAt);
    if (due) {
      dueReason = earlyExpiryAt && effectiveExpiryAt === earlyExpiryAt
        ? 'EARLY_EXPIRY_REACHED'
        : 'RETENTION_WINDOW_ELAPSED';
    }
  } else if (LIFECYCLE_MODES.has(mode)) {
    effectiveExpiryAt = lifecycleEndedAt;
    due = lifecycleEndedAt !== null && Date.parse(evaluationAt) >= Date.parse(lifecycleEndedAt);
    dueReason = due ? 'LIFECYCLE_ENDED' : 'ACTIVE_LIFECYCLE';
  } else {
    return failure('duration_rule_invalid');
  }

  if (due && hold) {
    return {
      ok: true,
      mode: 'DRY_RUN_ONLY',
      destructiveActionAuthorized: false,
      categoryId: category.id,
      verdict: 'HELD',
      reason: 'ACTIVE_APPROVED_HOLD',
      evaluationAt,
      retentionStartedAt,
      lifecycleEndedAt,
      earlyExpiryAt,
      ordinaryExpiryAt,
      effectiveExpiryAt,
      finalDisposition: category.finalDisposition,
      purgeEvidence: category.purgeEvidence,
      holdCondition: hold.condition,
    };
  }

  return {
    ok: true,
    mode: 'DRY_RUN_ONLY',
    destructiveActionAuthorized: false,
    categoryId: category.id,
    verdict: due ? 'EXPIRED' : 'KEEP',
    reason: due ? dueReason : (LIFECYCLE_MODES.has(mode) ? 'ACTIVE_LIFECYCLE' : 'WITHIN_RETENTION_WINDOW'),
    evaluationAt,
    retentionStartedAt,
    lifecycleEndedAt,
    earlyExpiryAt,
    ordinaryExpiryAt,
    effectiveExpiryAt,
    finalDisposition: category.finalDisposition,
    purgeEvidence: category.purgeEvidence,
    holdCondition: null,
  };
}
