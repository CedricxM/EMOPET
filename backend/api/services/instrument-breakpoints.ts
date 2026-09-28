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
  /**
   * True when no legal end existed within the policy's item ceiling, so the
   * structure of the instrument forced a longer session than the policy wants.
   *
   * Recorded rather than hidden: the whitelist wins over the comfort bound,
   * because cutting where no cut point exists would break fidelity while an
   * over-long session only breaks the two-to-three-minute promise. But a session
   * that had to overshoot is a fact about the cut-point set, and the audit trail
   * should be able to say so.
   */
  readonly exceedsPolicyMaximum: boolean;
}

/**
 * Choose the legal end of a session starting at `startPosition`.
 *
 * The desired count is a wish, not an instruction: the session ends at a
 * whitelisted cut point or at the end of the instrument, whichever sits nearest
 * the wish. Ending at the last item is always legal — it is a completion, not a
 * cut.
 *
 * `maxItemCount` is a hard ceiling wherever the structure permits one. A session
 * that is too short costs nothing, because chaining lets the respondent continue
 * freely; a session that is too long cannot be shortened once begun. So candidates
 * over the ceiling are discarded, and only when none remains does the engine
 * overshoot — taking the earliest legal end, the smallest possible overshoot, and
 * flagging it.
 *
 * Ties break toward the shorter session, for the same reason.
 */
export function selectSessionBoundary(
  plan: AdministrationPlanInput,
  startPosition: number,
  desiredItemCount: number,
  maxItemCount?: number,
): SessionBoundary {
  const total = plan.expectedItemCount;

  if (!Number.isInteger(startPosition) || startPosition < 1 || startPosition > total) {
    throw new BreakpointError(`startPosition ${startPosition} is outside 1..${total}`);
  }
  if (!Number.isInteger(desiredItemCount) || desiredItemCount < 1) {
    throw new BreakpointError(`desiredItemCount must be a positive integer, got ${desiredItemCount}`);
  }
  if (maxItemCount !== undefined && (!Number.isInteger(maxItemCount) || maxItemCount < 1)) {
    throw new BreakpointError(`maxItemCount must be a positive integer, got ${maxItemCount}`);
  }

  const { positions } = resolveUsableBreakpoints(plan.breakpoints);

  // The end of the instrument is always a legal end, so it joins the candidates
  // rather than being a separate branch. That also removes any chance of leaving a
  // one-item stub session behind.
  const candidates = [
    ...positions.filter((position) => position >= startPosition && position < total),
    total,
  ];

  const countFor = (position: number): number => position - startPosition + 1;
  const withinCeiling =
    maxItemCount === undefined
      ? candidates
      : candidates.filter((position) => countFor(position) <= maxItemCount);

  const exceedsPolicyMaximum = withinCeiling.length === 0;
  // No legal end fits the ceiling: take the earliest, which overshoots least.
  const usable = exceedsPolicyMaximum ? [candidates[0] as number] : withinCeiling;

  const wished = startPosition + desiredItemCount - 1;

  let best = usable[0] as number;
  let bestDistance = Math.abs(best - wished);
  for (const position of usable.slice(1)) {
    const distance = Math.abs(position - wished);
    // Strictly-less keeps the earliest position on a tie, hence the shorter session.
    if (distance < bestDistance) {
      best = position;
      bestDistance = distance;
    }
  }

  return {
    startPosition,
    endPosition: best,
    itemCount: countFor(best),
    closedAtBreakpointPosition: best === total ? null : best,
    reachesEndOfInstrument: best === total,
    exceedsPolicyMaximum,
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
