import type {
  BreakpointAuthority,
  InstrumentBreakpointStructure,
  InstrumentSectionStructure,
  ItemKey,
  SubscaleKey,
} from './types.js';

/**
 * Domain types for administering a licensed behavioural instrument.
 *
 * These describe the engine's inputs and state. They deliberately contain no
 * wording: an administration is driven by opaque item keys, and the licensed text
 * is fetched separately, for rendering only.
 */

export type AdministrationMode = 'standardized' | 'progressive' | 'research' | 'unknown';

export type OrderStrategy = 'canonical' | 'subscale_blocked' | 'licensed_randomized';

export type ScientificUseStatus =
  | 'unreviewed'
  | 'scoring_allowed'
  | 'research_only'
  | 'not_equivalent';

export type FatigueResponseMode = 'silent_flag' | 'boundary_offer' | 'immediate_offer';

export type SizingDecision = 'default' | 'adapted_shorter' | 'adapted_longer' | 'owner_chained';

/**
 * The only engagement signals session sizing may read.
 *
 * This list is closed on purpose. Sensor and inference data must never influence
 * a cut, the moment of a section, or its context, so nothing here may come from
 * MAT, TAG or ELI. A key outside this list is a loud failure, never a silent
 * fallback.
 */
export const ALLOWED_ADAPTIVE_SIGNALS = [
  'median_session_duration',
  'completion_rate',
  'pause_frequency',
] as const;

export type AdaptiveSignalKey = (typeof ALLOWED_ADAPTIVE_SIGNALS)[number];

export interface EngagementSignals {
  /** Median duration of this respondent's previous sessions, in seconds. */
  readonly median_session_duration?: number;
  /** Share of invited sessions this respondent completed, 0..1. */
  readonly completion_rate?: number;
  /** Share of this respondent's sessions that were paused mid-way, 0..1. */
  readonly pause_frequency?: number;
}

export interface AdministrationPolicy {
  readonly policyKey: string;
  readonly administrationMode: AdministrationMode;
  readonly orderStrategy: OrderStrategy;

  readonly targetSessionMinutes: number;
  readonly minItemsPerSession: number;
  readonly maxItemsPerSession: number;
  readonly adaptiveSizing: boolean;
  readonly adaptiveSignals: readonly AdaptiveSignalKey[];

  readonly allowChaining: boolean;
  readonly maxSessions: number | null;
  readonly maxWindowHours: number;
  readonly maxSessionGapHours: number | null;
  readonly minInterItemMs: number;
  readonly allowResume: boolean;
  readonly allowRevision: boolean;

  readonly allowMidSessionPause: boolean;
  readonly maxRemindersPerMissedSession: number;
  readonly deadlineWarningHoursBefore: number;
  readonly deadlineWarningCountsAsReminder: boolean;
  readonly fatigueResponseMode: FatigueResponseMode;

  /**
   * Ceiling, not a verdict. The effective status is computed from the shape the
   * administration actually took, then capped by this value.
   */
  readonly maxScientificUseStatus: ScientificUseStatus;
}

/** Structure the engine needs: order, sections, legal cut points. No wording. */
export interface AdministrationPlanInput {
  readonly expectedItemCount: number;
  readonly orderedItemKeys: readonly ItemKey[];
  readonly subscaleOfItem: Readonly<Record<string, SubscaleKey | null>>;
  readonly sections: readonly InstrumentSectionStructure[];
  readonly breakpoints: readonly InstrumentBreakpointStructure[];
  readonly breakpointSetVersion: number;
}

export type SessionState =
  | 'planned'
  | 'invited'
  | 'open'
  | 'mid_pause'
  | 'paused'
  | 'closed'
  | 'expired'
  | 'abandoned';

export type AdministrationLifecycleState =
  | 'draft'
  | 'planned'
  | 'in_progress'
  | 'awaiting_session'
  | 'complete'
  | 'scored'
  | 'expired'
  | 'partial_retained'
  | 'abandoned'
  | 'invalidated';

export type ResponseStatus = 'answered' | 'not_applicable' | 'skipped' | 'missing';

export interface RecordedResponse {
  readonly itemKey: ItemKey;
  readonly status: ResponseStatus;
  readonly value: number | null;
  readonly answeredAt: number;
  readonly latencyMs: number | null;
  /** Segmentation actually experienced by this item, kept as a covariate. */
  readonly positionInSession: number;
  readonly itemsSinceResume: number;
  readonly hoursSincePreviousItem: number | null;
  readonly crossedSectionBoundary: boolean;
  readonly isFirstItemAfterPause: boolean;
}

export interface AdministrationSession {
  readonly sessionIndex: number;
  readonly state: SessionState;
  readonly plannedItemKeys: readonly ItemKey[];
  readonly plannedItemCount: number;
  readonly startPosition: number;
  readonly endPosition: number;
  readonly sizingDecision: SizingDecision;
  readonly sizingSignals: EngagementSignals;
  readonly breakpointSetVersion: number;
  readonly openedAtBreakpointPosition: number | null;
  readonly closedAtBreakpointPosition: number | null;
  readonly invitedAt: number | null;
  readonly openedAt: number | null;
  readonly closedAt: number | null;
  readonly lastActivityAt: number | null;
  readonly midSessionPauseCount: number;
  readonly reminderCount: number;
  readonly deadlineWarningSentAt: number | null;
  readonly chained: boolean;
}

export type ValidityFlagKind = 'short_latency' | 'serial_responding' | 'incomplete_subscale';

export interface ValidityFlag {
  readonly kind: ValidityFlagKind;
  readonly raisedAt: number;
  readonly detail: string;
  /**
   * Flags are never shown to the respondent: telling someone they answer too
   * fast is a comment on their answers.
   */
  readonly ownerVisible: false;
}

export interface AdministrationState {
  readonly lifecycleState: AdministrationLifecycleState;
  readonly policy: AdministrationPolicy;
  readonly plan: AdministrationPlanInput;
  readonly startedAt: number;
  readonly windowEndsAt: number;
  readonly sessions: readonly AdministrationSession[];
  readonly responses: readonly RecordedResponse[];
  /** 1-based canonical position of the next item to present. */
  readonly cursor: number;
  readonly validityFlags: readonly ValidityFlag[];
  readonly effectiveScientificUseStatus: ScientificUseStatus | null;
  readonly invalidationReason: string | null;
  readonly completedAt: number | null;
}

/**
 * Which cut-point authorities the engine may act on.
 *
 * Conservative by default: while no intra-section cut point has been supplied by
 * the instrument owner or approved in writing, the engine cuts only at section
 * boundaries. A cut point EMOPET merely proposed is not usable authority.
 */
export const APPROVED_BREAKPOINT_AUTHORITIES: readonly BreakpointAuthority[] = [
  'licensed',
  'emopet_approved',
];
