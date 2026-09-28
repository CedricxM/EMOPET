import {
  APPROVED_BREAKPOINT_AUTHORITIES,
  type AdministrationPlanInput,
  type InstrumentBreakpointStructure,
} from '@emopet/shared';

/**
 * Where a session may legally end.
 *
 * A cut absent from the whitelist is not merely discouraged, it is
 * inexpressible: this module is the only thing that decides a session's end
 * position, and it can only return a whitelisted cut point or the end of the
 * instrument. There is no code path that produces an arbitrary position.
 *
 * Nothing here reads a sensor, an inference, a dog or a respondent. The only
 * inputs are the instrument's structure and a desired item count.
 */

export class BreakpointError extends Error {
  readonly code = 'INSTRUMENT_BREAKPOINT_INVALID';

  constructor(message: string) {
    super(message);
    this.name = 'BreakpointError';
  }
}

export interface UsableBreakpoints {
  readonly positions: readonly number[];
  /**
   * True when intra-section cut points exist in the bundle but none carries
   * usable authority, so the engine has fallen back to section boundaries only.
   * The demonstration surfaces this rather than hiding it: the conservative
   * default visibly changes the shape of the administration.
   */
  readonly restrictedToSectionBoundaries: boolean;
  readonly ignoredProposedCount: number;
}

/**
 * Resolve which cut points the engine may act on.
 *
 * An `emopet_proposed` cut point is a decision about how a validated instrument
 * is administered that nobody has approved yet, so it is not usable authority.
 * While every intra-section cut point is merely proposed, only section
 * boundaries remain.
 */
export function resolveUsableBreakpoints(
  breakpoints: readonly InstrumentBreakpointStructure[],
): UsableBreakpoints {
  const approved = breakpoints.filter((breakpoint) =>
    APPROVED_BREAKPOINT_AUTHORITIES.includes(breakpoint.authority),
  );

  const approvedIntraSection = approved.filter(
    (breakpoint) => breakpoint.breakpointKind === 'intra_section',
  );
  const proposedIntraSection = breakpoints.filter(
    (breakpoint) =>
      breakpoint.breakpointKind === 'intra_section'
      && !APPROVED_BREAKPOINT_AUTHORITIES.includes(breakpoint.authority),
  );

  // Section boundaries are structural: a section ends where it ends, whoever
  // proposed recording the fact. They stay usable regardless of authority.
  const sectionBoundaries = breakpoints.filter(
    (breakpoint) => breakpoint.breakpointKind === 'section_boundary',
  );

  const usable = approvedIntraSection.length > 0
    ? [...sectionBoundaries, ...approvedIntraSection]
    : sectionBoundaries;

  const positions = [...new Set(usable.map((breakpoint) => breakpoint.afterPosition))].sort(
    (a, b) => a - b,
  );

  return {
    positions,
    restrictedToSectionBoundaries:
      approvedIntraSection.length === 0 && proposedIntraSection.length > 0,
    ignoredProposedCount: proposedIntraSection.length,
  };
}

export interface SessionBoundary {
  readonly startPosition: number;
  readonly endPosition: number;
  readonly itemCount: number;
  /** The whitelisted cut point used, or null when the session runs to the end. */
  readonly closedAtBreakpointPosition: number | null;
  readonly reachesEndOfInstrument: boolean;
}

/**
 * Choose the legal end of a session starting at `startPosition`.
 *
 * The desired count is a wish, not an instruction: the session ends at the
 * whitelisted cut point nearest the wish, or at the end of the instrument.
 * Ending at the last item is always legal — it is a completion, not a cut.
 *
 * Ties break toward the shorter session. A respondent who wanted a three-minute
 * session and is offered either four or twelve more items is better served by the
 * shorter one, since chaining lets them continue freely while an over-long
 * session cannot be shortened once begun.
 */
export function selectSessionBoundary(
  plan: AdministrationPlanInput,
  startPosition: number,
  desiredItemCount: number,
): SessionBoundary {
  const total = plan.expectedItemCount;

  if (!Number.isInteger(startPosition) || startPosition < 1 || startPosition > total) {
    throw new BreakpointError(`startPosition ${startPosition} is outside 1..${total}`);
  }
  if (!Number.isInteger(desiredItemCount) || desiredItemCount < 1) {
    throw new BreakpointError(`desiredItemCount must be a positive integer, got ${desiredItemCount}`);
  }

  const { positions } = resolveUsableBreakpoints(plan.breakpoints);
  const ahead = positions.filter((position) => position >= startPosition && position < total);

  if (ahead.length === 0) {
    return {
      startPosition,
      endPosition: total,
      itemCount: total - startPosition + 1,
      closedAtBreakpointPosition: null,
      reachesEndOfInstrument: true,
    };
  }

  const wished = startPosition + desiredItemCount - 1;

  let best = ahead[0] as number;
  let bestDistance = Math.abs(best - wished);
  for (const position of ahead.slice(1)) {
    const distance = Math.abs(position - wished);
    // Strictly-less keeps the earliest position on a tie, which is the shorter
    // session.
    if (distance < bestDistance) {
      best = position;
      bestDistance = distance;
    }
  }

  // If the nearest cut point is the last one before the end, and the remainder
  // after it would be shorter than the distance we already travelled, running to
  // the end avoids leaving a stub session behind.
  const lastAhead = ahead[ahead.length - 1] as number;
  if (best === lastAhead && total - lastAhead <= 1) {
    return {
      startPosition,
      endPosition: total,
      itemCount: total - startPosition + 1,
      closedAtBreakpointPosition: null,
      reachesEndOfInstrument: true,
    };
  }

  return {
    startPosition,
    endPosition: best,
    itemCount: best - startPosition + 1,
    closedAtBreakpointPosition: best,
    reachesEndOfInstrument: false,
  };
}

/**
 * Whether a position is a legal place to offer continuation.
 *
 * The continue prompt appears only at a whitelisted cut point or at the end of
 * the instrument, so a session can never terminate in the middle of a block.
 */
export function isLegalSessionEnd(plan: AdministrationPlanInput, position: number): boolean {
  if (position === plan.expectedItemCount) return true;
  return resolveUsableBreakpoints(plan.breakpoints).positions.includes(position);
}
