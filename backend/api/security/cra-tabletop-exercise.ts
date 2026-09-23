export const CRA_TABLETOP_VERSION = 'cra-tabletop-v1' as const;
export const CRA_TABLETOP_MODE = 'TABLETOP_NO_SEND' as const;

export const CRA_QUALIFICATION_STATUSES = ['KNOWN', 'UNKNOWN', 'NOT_APPLICABLE'] as const;
export type CraQualificationStatus = (typeof CRA_QUALIFICATION_STATUSES)[number];

export const CRA_REPORTING_DECISIONS = [
  'CRA_REPORT_REQUIRED',
  'CRA_REPORT_NOT_REQUIRED',
  'CRA_APPLICABILITY_UNRESOLVED',
] as const;
export type CraReportingDecision = (typeof CRA_REPORTING_DECISIONS)[number];

export const CRA_PARALLEL_REGIME_STATUSES = ['YES', 'NO', 'TO_ASSESS'] as const;
export type CraParallelRegimeStatus = (typeof CRA_PARALLEL_REGIME_STATUSES)[number];

export const CRA_TABLETOP_GAP_REASONS = [
  'qualification_late',
  'decision_late',
  'early_warning_draft_late',
  'early_warning_checkpoint_late',
  'main_notification_build_late',
  'main_notification_review_outside_window',
  'main_notification_checkpoint_late',
  'chronology_invalid',
  'required_preparation_missing',
  'not_required_path_contains_submission',
] as const;
export type CraTabletopGapReason = (typeof CRA_TABLETOP_GAP_REASONS)[number];

export interface CraQualificationInventory {
  productComponent: CraQualificationStatus;
  affectedVersions: CraQualificationStatus;
  softwareVersions: CraQualificationStatus;
  releaseArtifacts: CraQualificationStatus;
  sbom: CraQualificationStatus;
  exploitation: CraQualificationStatus;
  securityImpact: CraQualificationStatus;
  affectedPopulation: CraQualificationStatus;
  euMarketAvailability: CraQualificationStatus;
  parallelDuties: CraQualificationStatus;
}

export interface CraParallelRegimes {
  gdpr: CraParallelRegimeStatus;
  gpsrProductSafety: CraParallelRegimeStatus;
  redCe: CraParallelRegimeStatus;
  supplierContract: CraParallelRegimeStatus;
}

export interface CraReportingDecisionRecord {
  outcome: CraReportingDecision;
  decidedAt: string;
  ownerRole: 'incident_commander';
}

export interface CraMockNotificationCheckpoint {
  disposition: 'SIMULATED_NOT_SENT' | 'NOT_REQUIRED';
  draftedOrBuiltAt: string | null;
  reviewedAt?: string | null;
  checkpointAt: string | null;
}

export interface CraTabletopGap {
  reason: CraTabletopGapReason;
  checkpoint: string;
}

export interface CraSimulatedTask {
  kind: 'CRA_24H_EARLY_WARNING' | 'CRA_72H_MAIN_NOTIFICATION';
  disposition: 'SIMULATED_NOT_SENT';
}

export interface CraTabletopResult {
  version: typeof CRA_TABLETOP_VERSION;
  mode: typeof CRA_TABLETOP_MODE;
  status: 'INVALID_INPUT' | 'INCOMPLETE' | 'COMPLETE';
  incidentId: string | null;
  awarenessAt: string | null;
  decision: CraReportingDecisionRecord | null;
  qualificationHasUnknowns: boolean;
  gaps: readonly CraTabletopGap[];
  simulatedTasks: readonly CraSimulatedTask[];
}

const INPUT_KEYS = Object.freeze([
  'incidentId',
  'awarenessAt',
  'qualificationCompletedAt',
  'qualification',
  'reportingDecision',
  'earlyWarning',
  'mainNotification',
  'parallelRegimes',
]);
const QUALIFICATION_KEYS = Object.freeze([
  'productComponent',
  'affectedVersions',
  'softwareVersions',
  'releaseArtifacts',
  'sbom',
  'exploitation',
  'securityImpact',
  'affectedPopulation',
  'euMarketAvailability',
  'parallelDuties',
]);
const DECISION_KEYS = Object.freeze(['outcome', 'decidedAt', 'ownerRole']);
const PARALLEL_KEYS = Object.freeze(['gdpr', 'gpsrProductSafety', 'redCe', 'supplierContract']);
const EARLY_KEYS = Object.freeze(['disposition', 'draftedOrBuiltAt', 'checkpointAt']);
const MAIN_KEYS = Object.freeze(['disposition', 'draftedOrBuiltAt', 'reviewedAt', 'checkpointAt']);
const INCIDENT_ID_RE = /^INC-[0-9]{4}-[A-Z0-9][A-Z0-9._-]{0,31}$/;

const HOUR_MS = 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function includesString(values: readonly string[], value: unknown): value is string {
  return typeof value === 'string' && values.includes(value);
}

function utcTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value.endsWith('Z')) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  try {
    return new Date(parsed).toISOString();
  } catch {
    return null;
  }
}

function nullableUtcTimestamp(value: unknown): string | null | undefined {
  if (value === null) return null;
  const parsed = utcTimestamp(value);
  return parsed ?? undefined;
}

function parseQualification(value: unknown): CraQualificationInventory | null {
  if (!isRecord(value) || !hasOnlyKeys(value, QUALIFICATION_KEYS)) return null;
  for (const key of QUALIFICATION_KEYS) {
    if (!includesString(CRA_QUALIFICATION_STATUSES, value[key])) return null;
  }
  return value as unknown as CraQualificationInventory;
}

function parseParallelRegimes(value: unknown): CraParallelRegimes | null {
  if (!isRecord(value) || !hasOnlyKeys(value, PARALLEL_KEYS)) return null;
  for (const key of PARALLEL_KEYS) {
    if (!includesString(CRA_PARALLEL_REGIME_STATUSES, value[key])) return null;
  }
  return value as unknown as CraParallelRegimes;
}

function parseDecision(value: unknown): CraReportingDecisionRecord | null {
  if (!isRecord(value) || !hasOnlyKeys(value, DECISION_KEYS)) return null;
  if (!includesString(CRA_REPORTING_DECISIONS, value.outcome)) return null;
  if (value.ownerRole !== 'incident_commander') return null;
  const decidedAt = utcTimestamp(value.decidedAt);
  if (!decidedAt) return null;
  return {
    outcome: value.outcome as CraReportingDecision,
    decidedAt,
    ownerRole: 'incident_commander',
  };
}

function parseCheckpoint(
  value: unknown,
  includeReview: boolean,
): CraMockNotificationCheckpoint | null {
  const keys = includeReview ? MAIN_KEYS : EARLY_KEYS;
  if (!isRecord(value) || !hasOnlyKeys(value, keys)) return null;
  if (value.disposition !== 'SIMULATED_NOT_SENT' && value.disposition !== 'NOT_REQUIRED') return null;

  const draftedOrBuiltAt = nullableUtcTimestamp(value.draftedOrBuiltAt);
  const checkpointAt = nullableUtcTimestamp(value.checkpointAt);
  if (draftedOrBuiltAt === undefined || checkpointAt === undefined) return null;

  if (includeReview) {
    const reviewedAt = nullableUtcTimestamp(value.reviewedAt);
    if (reviewedAt === undefined) return null;
    return {
      disposition: value.disposition,
      draftedOrBuiltAt,
      reviewedAt,
      checkpointAt,
    };
  }

  return {
    disposition: value.disposition,
    draftedOrBuiltAt,
    checkpointAt,
  };
}

function invalidResult(): CraTabletopResult {
  return {
    version: CRA_TABLETOP_VERSION,
    mode: CRA_TABLETOP_MODE,
    status: 'INVALID_INPUT',
    incidentId: null,
    awarenessAt: null,
    decision: null,
    qualificationHasUnknowns: false,
    gaps: [],
    simulatedTasks: [],
  };
}

function pushGap(gaps: CraTabletopGap[], reason: CraTabletopGapReason, checkpoint: string): void {
  gaps.push({ reason, checkpoint });
}

export function runCraTabletopExercise(input: unknown): CraTabletopResult {
  if (!isRecord(input) || !hasOnlyKeys(input, INPUT_KEYS)) return invalidResult();
  if (typeof input.incidentId !== 'string' || !INCIDENT_ID_RE.test(input.incidentId)) return invalidResult();

  const awarenessAt = utcTimestamp(input.awarenessAt);
  const qualificationCompletedAt = utcTimestamp(input.qualificationCompletedAt);
  const qualification = parseQualification(input.qualification);
  const reportingDecision = parseDecision(input.reportingDecision);
  const earlyWarning = parseCheckpoint(input.earlyWarning, false);
  const mainNotification = parseCheckpoint(input.mainNotification, true);
  const parallelRegimes = parseParallelRegimes(input.parallelRegimes);

  if (
    !awarenessAt
    || !qualificationCompletedAt
    || !qualification
    || !reportingDecision
    || !earlyWarning
    || !mainNotification
    || !parallelRegimes
  ) {
    return invalidResult();
  }

  const awarenessMs = Date.parse(awarenessAt);
  const qualificationMs = Date.parse(qualificationCompletedAt);
  const decisionMs = Date.parse(reportingDecision.decidedAt);
  const gaps: CraTabletopGap[] = [];

  if (qualificationMs < awarenessMs || decisionMs < qualificationMs) {
    pushGap(gaps, 'chronology_invalid', 'qualification_or_decision');
  }
  if (qualificationMs > awarenessMs + 4 * HOUR_MS) {
    pushGap(gaps, 'qualification_late', 'T+4h');
  }
  if (decisionMs > awarenessMs + 20 * HOUR_MS) {
    pushGap(gaps, 'decision_late', 'T+20h');
  }

  const preparationRequired = reportingDecision.outcome !== 'CRA_REPORT_NOT_REQUIRED';
  const tasks: CraSimulatedTask[] = [];

  if (!preparationRequired) {
    const hasUnexpectedSubmission = (
      earlyWarning.disposition !== 'NOT_REQUIRED'
      || earlyWarning.draftedOrBuiltAt !== null
      || earlyWarning.checkpointAt !== null
      || mainNotification.disposition !== 'NOT_REQUIRED'
      || mainNotification.draftedOrBuiltAt !== null
      || mainNotification.reviewedAt !== null
      || mainNotification.checkpointAt !== null
    );

    if (hasUnexpectedSubmission) {
      pushGap(gaps, 'not_required_path_contains_submission', 'notification_path');
    }
  } else {
    const reviewedAt = mainNotification.reviewedAt;
    if (
      earlyWarning.disposition !== 'SIMULATED_NOT_SENT'
      || earlyWarning.draftedOrBuiltAt === null
      || earlyWarning.checkpointAt === null
      || mainNotification.disposition !== 'SIMULATED_NOT_SENT'
      || mainNotification.draftedOrBuiltAt === null
      || typeof reviewedAt !== 'string'
      || mainNotification.checkpointAt === null
    ) {
      pushGap(gaps, 'required_preparation_missing', 'notification_path');
    } else {
      const earlyDraftMs = Date.parse(earlyWarning.draftedOrBuiltAt);
      const earlyCheckpointMs = Date.parse(earlyWarning.checkpointAt);
      const mainBuildMs = Date.parse(mainNotification.draftedOrBuiltAt);
      const reviewMs = Date.parse(reviewedAt);
      const mainCheckpointMs = Date.parse(mainNotification.checkpointAt);

      if (
        earlyDraftMs < qualificationMs
        || earlyCheckpointMs < decisionMs
        || mainBuildMs < earlyCheckpointMs
        || reviewMs < mainBuildMs
        || mainCheckpointMs < reviewMs
      ) {
        pushGap(gaps, 'chronology_invalid', 'notification_path');
      }

      if (earlyDraftMs > awarenessMs + 12 * HOUR_MS) {
        pushGap(gaps, 'early_warning_draft_late', 'T+12h');
      }
      if (earlyCheckpointMs > awarenessMs + 24 * HOUR_MS) {
        pushGap(gaps, 'early_warning_checkpoint_late', 'T+24h');
      }
      if (mainBuildMs > awarenessMs + 60 * HOUR_MS) {
        pushGap(gaps, 'main_notification_build_late', 'T+60h');
      }
      if (reviewMs < awarenessMs + 60 * HOUR_MS || reviewMs > awarenessMs + 68 * HOUR_MS) {
        pushGap(gaps, 'main_notification_review_outside_window', 'T+60h..T+68h');
      }
      if (mainCheckpointMs > awarenessMs + 72 * HOUR_MS) {
        pushGap(gaps, 'main_notification_checkpoint_late', 'T+72h');
      }

      tasks.push(
        { kind: 'CRA_24H_EARLY_WARNING', disposition: 'SIMULATED_NOT_SENT' },
        { kind: 'CRA_72H_MAIN_NOTIFICATION', disposition: 'SIMULATED_NOT_SENT' },
      );
    }
  }

  return {
    version: CRA_TABLETOP_VERSION,
    mode: CRA_TABLETOP_MODE,
    status: gaps.length === 0 ? 'COMPLETE' : 'INCOMPLETE',
    incidentId: input.incidentId,
    awarenessAt,
    decision: reportingDecision,
    qualificationHasUnknowns: Object.values(qualification).includes('UNKNOWN'),
    gaps: gaps.sort((a, b) => {
      const c = a.checkpoint.localeCompare(b.checkpoint);
      return c !== 0 ? c : a.reason.localeCompare(b.reason);
    }),
    simulatedTasks: gaps.length === 0 ? tasks : [],
  };
}
