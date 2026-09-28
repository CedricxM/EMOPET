import {
  type AdministrationPlanInput,
  type AdministrationPolicy,
  type AdministrationSession,
  type AdministrationState,
  type EngagementSignals,
  type InstrumentReference,
  type InstrumentVersionStructure,
  type ItemKey,
  type RecordedResponse,
  type ResponseStatus,
  type ScientificUseStatus,
} from '@emopet/shared';

import { isLegalSessionEnd, selectSessionBoundary } from './instrument-breakpoints.js';
import { sessionControl } from './instrument-session-controls.js';
import { computeSessionSize } from './instrument-session-sizing.js';
import { assessValidity, decideFatigueResponse, type FatigueOutcome } from './instrument-validity.js';

/**
 * The administration state machine.
 *
 * Pure: every function takes a state and returns a new state. Nothing here reads
 * a clock, a database, a sensor or a random number — the caller supplies `now`,
 * which is what makes a two-week window testable in a millisecond and keeps the
 * engine free of the inputs it must never consult.
 *
 * The respondent drives. Sessions are two to three minutes, they may chain as
 * long as they like, they may pause mid-session in one gesture and resume at the
 * exact item, and a declined invitation is never a failure.
 */

export class AdministrationError extends Error {
  readonly code = 'INSTRUMENT_ADMINISTRATION_INVALID_TRANSITION';

  constructor(message: string) {
    super(message);
    this.name = 'AdministrationError';
  }
}

const HOUR_MS = 3_600_000;

function fail(message: string): never {
  throw new AdministrationError(message);
}

/** Derive the engine's plan from a validated version structure. */
export function buildPlan(structure: InstrumentVersionStructure): AdministrationPlanInput {
  const ordered = [...structure.items].sort((a, b) => a.canonicalPosition - b.canonicalPosition);
  const subscaleOfItem: Record<string, ReturnType<() => (typeof ordered)[number]['subscaleKey']>> = {};
  for (const item of ordered) subscaleOfItem[item.itemKey] = item.subscaleKey;

  return {
    expectedItemCount: structure.expectedItemCount,
    orderedItemKeys: ordered.map((item) => item.itemKey),
    subscaleOfItem,
    sections: structure.sections,
    breakpoints: structure.breakpoints,
    breakpointSetVersion: structure.breakpointSetVersion,
  };
}

export function reverseScoredKeys(structure: InstrumentVersionStructure): Set<string> {
  return new Set(structure.items.filter((item) => item.reverseScored).map((item) => item.itemKey));
}

// ── Lifecycle ───────────────────────────────────────────────────────

export function createAdministration(
  policy: AdministrationPolicy,
  plan: AdministrationPlanInput,
  now: number,
): AdministrationState {
  if (plan.orderedItemKeys.length !== plan.expectedItemCount) {
    fail(
      `Plan declares ${plan.expectedItemCount} items but supplies ${plan.orderedItemKeys.length} keys`,
    );
  }
  if (policy.orderStrategy !== 'canonical') {
    // Item order is identical for every respondent. Any other strategy would make
    // the order a function of who is answering, which is the one thing the
    // sequential design does not do.
    fail(`Only the canonical order strategy is supported, got '${policy.orderStrategy}'`);
  }

  return {
    lifecycleState: 'draft',
    policy,
    plan,
    startedAt: now,
    windowEndsAt: now + policy.maxWindowHours * HOUR_MS,
    sessions: [],
    responses: [],
    cursor: 1,
    validityFlags: [],
    effectiveScientificUseStatus: null,
    invalidationReason: null,
    completedAt: null,
  };
}

function currentSession(state: AdministrationState): AdministrationSession | null {
  return state.sessions.length === 0 ? null : (state.sessions[state.sessions.length - 1] as AdministrationSession);
}

function replaceLastSession(
  state: AdministrationState,
  session: AdministrationSession,
): AdministrationState {
  return { ...state, sessions: [...state.sessions.slice(0, -1), session] };
}

function isTerminal(state: AdministrationState): boolean {
  return ['scored', 'expired', 'partial_retained', 'abandoned', 'invalidated'].includes(
    state.lifecycleState,
  );
}

/**
 * Advance the clock.
 *
 * Window expiry forbids scoring but destroys nothing: the state becomes
 * `partial_retained`, responses and flags stay, and a fresh administration
 * remains possible. That is what lets the deadline warning be factual without
 * announcing a loss.
 */
export function tick(state: AdministrationState, now: number): AdministrationState {
  if (isTerminal(state) || state.lifecycleState === 'complete') return state;

  if (now >= state.windowEndsAt) {
    const session = currentSession(state);
    const closed = session && !['closed', 'expired', 'abandoned'].includes(session.state)
      ? replaceLastSession(state, { ...session, state: 'expired', closedAt: now })
      : state;
    return {
      ...closed,
      lifecycleState: state.responses.length > 0 ? 'partial_retained' : 'expired',
    };
  }

  const session = currentSession(state);
  if (session && session.state === 'paused' && state.policy.maxSessionGapHours !== null) {
    const since = session.lastActivityAt ?? session.openedAt ?? state.startedAt;
    if (now - since > state.policy.maxSessionGapHours * HOUR_MS) {
      return {
        ...replaceLastSession(state, { ...session, state: 'expired', closedAt: now }),
        lifecycleState: 'awaiting_session',
      };
    }
  }

  return state;
}

export interface DeadlineWarning {
  readonly due: boolean;
  readonly hoursRemaining: number;
  /**
   * Factual and loss-free: what expires is the ability to score THIS
   * administration. The answers are kept and a new administration stays possible.
   */
  readonly message: string;
}

export function deadlineWarning(state: AdministrationState, now: number): DeadlineWarning {
  const remainingMs = state.windowEndsAt - now;
  const hoursRemaining = remainingMs / HOUR_MS;
  const session = currentSession(state);
  const alreadySent = session?.deadlineWarningSentAt !== null && session?.deadlineWarningSentAt !== undefined;

  return {
    due:
      !isTerminal(state)
      && remainingMs > 0
      && hoursRemaining <= state.policy.deadlineWarningHoursBefore
      && !alreadySent,
    hoursRemaining,
    // Drawn from the frozen session-control registry rather than written here, so
    // the wording passes the same forbidden-pattern checks as every other string
    // shown to a respondent during an administration.
    message: sessionControl('DEADLINE_NOTICE').text,
  };
}

// ── Sessions ────────────────────────────────────────────────────────

export function remainingItemCount(state: AdministrationState): number {
  return state.plan.expectedItemCount - (state.cursor - 1);
}

export function planNextSession(
  state: AdministrationState,
  signals: EngagementSignals,
  now: number,
): AdministrationState {
  // Advance the clock first: planning a session inside an expired window would
  // otherwise succeed and produce items nobody may score.
  const ticked = tick(state, now);
  if (isTerminal(ticked)) fail(`Cannot plan a session from '${ticked.lifecycleState}'`);
  state = ticked;

  const open = currentSession(state);
  if (open && ['invited', 'open', 'mid_pause', 'paused'].includes(open.state)) {
    fail(`Session ${open.sessionIndex} is still ${open.state}`);
  }

  const remaining = remainingItemCount(state);
  if (remaining < 1) fail('No items remain to plan');

  const sessionsUsed = state.sessions.filter((session) => session.state !== 'planned').length;
  if (state.policy.maxSessions !== null && sessionsUsed >= state.policy.maxSessions) {
    fail(`Policy allows at most ${state.policy.maxSessions} sessions`);
  }

  const sizing = computeSessionSize(state.policy, signals, remaining);
  const boundary = selectSessionBoundary(
    state.plan,
    state.cursor,
    sizing.itemCount,
    state.policy.maxItemsPerSession,
  );

  const session: AdministrationSession = {
    sessionIndex: state.sessions.length + 1,
    state: 'planned',
    plannedItemKeys: state.plan.orderedItemKeys.slice(boundary.startPosition - 1, boundary.endPosition),
    plannedItemCount: boundary.itemCount,
    startPosition: boundary.startPosition,
    endPosition: boundary.endPosition,
    sizingDecision: sizing.decision,
    sizingSignals: sizing.signalsUsed,
    breakpointSetVersion: state.plan.breakpointSetVersion,
    openedAtBreakpointPosition: boundary.startPosition === 1 ? null : boundary.startPosition - 1,
    closedAtBreakpointPosition: boundary.closedAtBreakpointPosition,
    invitedAt: null,
    openedAt: null,
    closedAt: null,
    lastActivityAt: null,
    midSessionPauseCount: 0,
    reminderCount: 0,
    deadlineWarningSentAt: null,
    chained: false,
  };

  return {
    ...state,
    lifecycleState: state.lifecycleState === 'draft' ? 'planned' : state.lifecycleState,
    sessions: [...state.sessions, session],
    startedAt: state.startedAt,
    completedAt: null,
    responses: state.responses,
    cursor: state.cursor,
    validityFlags: state.validityFlags,
    effectiveScientificUseStatus: null,
    invalidationReason: null,
    windowEndsAt: state.windowEndsAt,
    plan: state.plan,
    policy: state.policy,
  };
}

export function inviteSession(state: AdministrationState, now: number): AdministrationState {
  const session = currentSession(state);
  if (!session || session.state !== 'planned') fail('No planned session to invite');
  return replaceLastSession(state, { ...session, state: 'invited', invitedAt: now });
}

/**
 * The respondent declines or ignores an invitation.
 *
 * Never a failure: the session returns to `planned` and a reminder is counted.
 * The cap is hard — a third reminder is refused here and refused again by the
 * database, because not nagging is a promise made to the respondent rather than a
 * preference of the notification layer.
 */
export function declineInvitation(state: AdministrationState, _now: number): AdministrationState {
  const session = currentSession(state);
  if (!session || session.state !== 'invited') fail('No invited session to decline');

  const nextCount = session.reminderCount + 1;
  if (nextCount > state.policy.maxRemindersPerMissedSession) {
    fail(
      `Reminder cap of ${state.policy.maxRemindersPerMissedSession} reached for session ${session.sessionIndex}`,
    );
  }

  return replaceLastSession(state, { ...session, state: 'planned', reminderCount: nextCount });
}

export function openSession(state: AdministrationState, now: number): AdministrationState {
  const session = currentSession(state);
  if (!session || !['planned', 'invited'].includes(session.state)) {
    fail(`Cannot open a session in state '${session?.state ?? 'none'}'`);
  }
  return {
    ...replaceLastSession(state, {
      ...session,
      state: 'open',
      openedAt: session.openedAt ?? now,
      lastActivityAt: now,
    }),
    lifecycleState: 'in_progress',
  };
}

/**
 * Pause mid-session, in one gesture.
 *
 * A pause is not a missed session: it consumes no reminder quota and triggers no
 * follow-up. Without that distinction a respondent who often pauses would be
 * chased more than one who never opens the questionnaire at all — the opposite of
 * the intent.
 */
export function pauseMidSession(state: AdministrationState, now: number): AdministrationState {
  const session = currentSession(state);
  if (!session || session.state !== 'open') fail('No open session to pause');
  if (!state.policy.allowMidSessionPause) fail('Policy forbids mid-session pause');

  return {
    ...replaceLastSession(state, {
      ...session,
      state: 'mid_pause',
      midSessionPauseCount: session.midSessionPauseCount + 1,
      lastActivityAt: now,
    }),
    lifecycleState: 'in_progress',
  };
}

/** Leave the application entirely: the session parks rather than closing. */
export function suspendSession(state: AdministrationState, now: number): AdministrationState {
  const session = currentSession(state);
  if (!session || !['open', 'mid_pause'].includes(session.state)) fail('No active session to suspend');
  return {
    ...replaceLastSession(state, { ...session, state: 'paused', lastActivityAt: now }),
    lifecycleState: 'awaiting_session',
  };
}

/** Resume at the exact item, never at the start of the session. */
export function resumeSession(state: AdministrationState, now: number): AdministrationState {
  const ticked = tick(state, now);
  const session = currentSession(ticked);
  if (!session) fail('No session to resume');
  if (session.state === 'expired') fail('Session expired before it was resumed');
  if (!['mid_pause', 'paused'].includes(session.state)) {
    fail(`Cannot resume a session in state '${session.state}'`);
  }
  if (!ticked.policy.allowResume) fail('Policy forbids resuming');

  return {
    ...replaceLastSession(ticked, { ...session, state: 'open', lastActivityAt: now }),
    lifecycleState: 'in_progress',
  };
}

// ── Items ───────────────────────────────────────────────────────────

/**
 * The next item to present, as an opaque reference.
 *
 * Returns keys and position only. The wording is fetched separately from the
 * content store and travels straight to the frozen card, so nothing here can leak
 * into a model call.
 */
export function nextItemReference(state: AdministrationState): InstrumentReference & {
  readonly canonicalPosition: number;
} {
  const session = currentSession(state);
  if (!session || session.state !== 'open') fail('No open session');
  if (state.cursor > session.endPosition) fail('Session has no items left');

  const itemKey = state.plan.orderedItemKeys[state.cursor - 1];
  if (itemKey === undefined) fail(`No item at position ${state.cursor}`);

  const section = state.plan.sections.find(
    (candidate) => state.cursor >= candidate.firstPosition && state.cursor <= candidate.lastPosition,
  );

  return {
    itemKey,
    subscaleKey: state.plan.subscaleOfItem[itemKey] ?? null,
    sectionKey: section?.sectionKey ?? null,
    canonicalPosition: state.cursor,
  };
}

export interface AnswerInput {
  readonly itemKey: ItemKey;
  readonly status: ResponseStatus;
  readonly value: number | null;
  readonly latencyMs: number | null;
  readonly now: number;
}

/**
 * Record an answer and the segmentation it experienced.
 *
 * The covariates are the point: because the item order is identical for every
 * respondent, segmentation is the only dimension that varies, so recording what
 * each item actually experienced turns that variability into something
 * measurable rather than noise.
 */
export function recordAnswer(state: AdministrationState, input: AnswerInput): AdministrationState {
  const session = currentSession(state);
  if (!session || session.state !== 'open') fail('No open session to answer in');

  const expected = state.plan.orderedItemKeys[state.cursor - 1];
  if (input.itemKey !== expected) {
    fail(`Expected ${String(expected)} at position ${state.cursor}, got ${input.itemKey}`);
  }
  if (state.responses.some((response) => response.itemKey === input.itemKey)) {
    if (!state.policy.allowRevision) fail(`Item ${input.itemKey} already answered`);
  }
  if (input.status === 'answered' && input.value === null) {
    fail('An answered response must carry a value');
  }
  if (input.status !== 'answered' && input.value !== null) {
    fail(`A '${input.status}' response must not carry a value`);
  }

  const previous = state.responses[state.responses.length - 1];
  const sectionOfPosition = (position: number): string | null =>
    state.plan.sections.find(
      (section) => position >= section.firstPosition && position <= section.lastPosition,
    )?.sectionKey ?? null;

  const positionInSession = state.cursor - session.startPosition + 1;
  const itemsSinceResume = state.responses.filter(
    (response) => response.answeredAt >= (session.lastActivityAt ?? 0),
  ).length;

  const response: RecordedResponse = {
    itemKey: input.itemKey,
    status: input.status,
    value: input.value,
    answeredAt: input.now,
    latencyMs: input.latencyMs,
    positionInSession,
    itemsSinceResume,
    hoursSincePreviousItem:
      previous === undefined ? null : (input.now - previous.answeredAt) / HOUR_MS,
    crossedSectionBoundary:
      state.cursor > 1 && sectionOfPosition(state.cursor) !== sectionOfPosition(state.cursor - 1),
    isFirstItemAfterPause: positionInSession === 1 || session.midSessionPauseCount > 0
      ? itemsSinceResume === 0
      : false,
  };

  return {
    ...replaceLastSession(state, { ...session, lastActivityAt: input.now }),
    responses: [...state.responses, response],
    cursor: state.cursor + 1,
  };
}

// ── Continuation and closing ────────────────────────────────────────

export interface ContinuationOffer {
  readonly available: boolean;
  readonly atEndOfInstrument: boolean;
  readonly reason: string;
}

/**
 * Whether the interface may offer to continue.
 *
 * Only at a whitelisted cut point or at the end of the instrument, so a session
 * can never terminate in the middle of a block. The prompt itself is a fixed
 * session control, not generated text: the model never asks a question during an
 * administration.
 */
export function continuationOffer(state: AdministrationState): ContinuationOffer {
  const session = currentSession(state);
  if (!session || session.state !== 'open') {
    return { available: false, atEndOfInstrument: false, reason: 'no open session' };
  }
  if (state.cursor <= session.endPosition) {
    return { available: false, atEndOfInstrument: false, reason: 'session still has items' };
  }

  const atEnd = state.cursor > state.plan.expectedItemCount;
  if (atEnd) {
    return { available: false, atEndOfInstrument: true, reason: 'instrument complete' };
  }
  if (!state.policy.allowChaining) {
    return { available: false, atEndOfInstrument: false, reason: 'policy forbids chaining' };
  }
  if (!isLegalSessionEnd(state.plan, session.endPosition)) {
    return { available: false, atEndOfInstrument: false, reason: 'not a whitelisted cut point' };
  }

  return { available: true, atEndOfInstrument: false, reason: 'at a whitelisted cut point' };
}

/**
 * The respondent chooses to continue.
 *
 * Chaining extends the SAME session rather than starting another, which is what
 * lets a one-sitting administration be recognised as one when the effective
 * scientific status is computed at close.
 */
export function acceptContinuation(
  state: AdministrationState,
  signals: EngagementSignals,
  now: number,
): AdministrationState {
  const offer = continuationOffer(state);
  if (!offer.available) fail(`Continuation not available: ${offer.reason}`);

  const session = currentSession(state) as AdministrationSession;
  const sizing = computeSessionSize(state.policy, signals, remainingItemCount(state));
  const boundary = selectSessionBoundary(
    state.plan,
    state.cursor,
    sizing.itemCount,
    state.policy.maxItemsPerSession,
  );

  return replaceLastSession(state, {
    ...session,
    plannedItemKeys: [
      ...session.plannedItemKeys,
      ...state.plan.orderedItemKeys.slice(boundary.startPosition - 1, boundary.endPosition),
    ],
    plannedItemCount: session.plannedItemCount + boundary.itemCount,
    endPosition: boundary.endPosition,
    closedAtBreakpointPosition: boundary.closedAtBreakpointPosition,
    sizingDecision: 'owner_chained',
    chained: true,
    lastActivityAt: now,
  });
}

export function closeSession(state: AdministrationState, now: number): AdministrationState {
  const session = currentSession(state);
  if (!session || !['open', 'mid_pause'].includes(session.state)) fail('No active session to close');

  const closed = replaceLastSession(state, { ...session, state: 'closed', closedAt: now });
  const finished = state.cursor > state.plan.expectedItemCount;

  return {
    ...closed,
    lifecycleState: finished ? 'complete' : 'awaiting_session',
    completedAt: finished ? now : null,
  };
}

// ── Scoring gate ────────────────────────────────────────────────────

const STATUS_RANK: Readonly<Record<ScientificUseStatus, number>> = {
  not_equivalent: 0,
  unreviewed: 1,
  research_only: 2,
  scoring_allowed: 3,
};

function capStatus(observed: ScientificUseStatus, ceiling: ScientificUseStatus): ScientificUseStatus {
  return STATUS_RANK[observed] <= STATUS_RANK[ceiling] ? observed : ceiling;
}

export interface AdministrationShape {
  readonly sessionCount: number;
  readonly spanHours: number;
  readonly longestGapHours: number;
}

export function administrationShape(state: AdministrationState): AdministrationShape {
  const used = state.sessions.filter((session) => session.openedAt !== null);
  const opens = used.map((session) => session.openedAt as number);
  const closes = used.map((session) => session.closedAt ?? (session.lastActivityAt as number));

  const first = opens.length === 0 ? state.startedAt : Math.min(...opens);
  const last = closes.length === 0 ? state.startedAt : Math.max(...closes);

  let longestGap = 0;
  for (let index = 1; index < used.length; index += 1) {
    const previousClose = closes[index - 1] as number;
    const thisOpen = opens[index] as number;
    longestGap = Math.max(longestGap, (thisOpen - previousClose) / HOUR_MS);
  }

  return {
    sessionCount: used.length,
    spanHours: (last - first) / HOUR_MS,
    longestGapHours: longestGap,
  };
}

/**
 * The effective scientific status, computed from the shape the administration
 * actually took and then capped by the policy ceiling.
 *
 * Because the respondent may chain freely, the real shape is only known at close.
 * Fixing the status when the administration opens would condemn a respondent who
 * answered in one sitting to the distributed label, even though they produced the
 * form closest to the standard administration. The ceiling still holds the line:
 * while nothing is approved in writing, no policy carries `scoring_allowed`, so
 * no shape can be presented as equivalent.
 */
export function effectiveScientificUseStatus(state: AdministrationState): ScientificUseStatus {
  const shape = administrationShape(state);

  const observed: ScientificUseStatus =
    shape.sessionCount <= 2 && shape.spanHours <= 48
      ? 'scoring_allowed'
      : shape.longestGapHours <= 72
        ? 'research_only'
        : 'not_equivalent';

  return capStatus(observed, state.policy.maxScientificUseStatus);
}

export interface ScoringGate {
  readonly allowed: boolean;
  readonly status: ScientificUseStatus;
  readonly reasons: readonly string[];
}

/**
 * Whether this administration may be scored at all.
 *
 * Never a single number: completeness, validity and the status ceiling each get a
 * say, and a refusal names its reasons.
 */
export function scoringGate(state: AdministrationState, reverseScored: ReadonlySet<string>, now: number): ScoringGate {
  const reasons: string[] = [];

  if (state.lifecycleState === 'partial_retained' || state.lifecycleState === 'expired') {
    reasons.push('completion window expired; responses are retained but scoring is refused');
  }
  if (state.lifecycleState === 'invalidated') {
    reasons.push(`administration invalidated: ${state.invalidationReason ?? 'unspecified'}`);
  }
  if (state.lifecycleState !== 'complete' && state.lifecycleState !== 'scored') {
    reasons.push(`administration is '${state.lifecycleState}', not complete`);
  }

  const assessment = assessValidity(state.policy, state.plan, state.responses, reverseScored, now);
  if (assessment.incompleteSubscales.length > 0) {
    reasons.push(`incomplete subscales: ${assessment.incompleteSubscales.join(', ')}`);
  }
  if (assessment.suggestsInvalidation) {
    reasons.push('two independent validity signals suggest invalidation; human review required');
  }

  const status = effectiveScientificUseStatus(state);

  return { allowed: reasons.length === 0, status, reasons };
}

export function markScored(state: AdministrationState, now: number): AdministrationState {
  if (state.lifecycleState !== 'complete') {
    fail(`Cannot score an administration in state '${state.lifecycleState}'`);
  }
  return {
    ...state,
    lifecycleState: 'scored',
    effectiveScientificUseStatus: effectiveScientificUseStatus(state),
    completedAt: state.completedAt ?? now,
  };
}

/** Invalidation withholds publication. It never deletes a response or a flag. */
export function invalidate(state: AdministrationState, reason: string): AdministrationState {
  return {
    ...state,
    lifecycleState: 'invalidated',
    invalidationReason: reason,
    effectiveScientificUseStatus: 'not_equivalent',
  };
}

export function abandon(state: AdministrationState, now: number): AdministrationState {
  if (isTerminal(state)) return state;
  const session = currentSession(state);
  const withSession = session && !['closed', 'expired', 'abandoned'].includes(session.state)
    ? replaceLastSession(state, { ...session, state: 'abandoned', closedAt: now })
    : state;
  return { ...withSession, lifecycleState: 'abandoned' };
}

// ── Validity surface ────────────────────────────────────────────────

export interface ValiditySnapshot {
  readonly flagCount: number;
  readonly fatigue: FatigueOutcome;
  readonly suggestsInvalidation: boolean;
}

/**
 * Current validity picture, for server-side use only.
 *
 * Deliberately returns counts and a fatigue decision rather than the flags
 * themselves, so a careless caller cannot forward flag details to a client.
 */
export function validitySnapshot(
  state: AdministrationState,
  reverseScored: ReadonlySet<string>,
  now: number,
): ValiditySnapshot {
  const assessment = assessValidity(state.policy, state.plan, state.responses, reverseScored, now);
  const session = currentSession(state);
  const atBoundary =
    session !== null
    && state.cursor > session.endPosition
    && isLegalSessionEnd(state.plan, session.endPosition);

  return {
    flagCount: assessment.flags.length,
    fatigue: decideFatigueResponse(state.policy, assessment, atBoundary),
    suggestsInvalidation: assessment.suggestsInvalidation,
  };
}
