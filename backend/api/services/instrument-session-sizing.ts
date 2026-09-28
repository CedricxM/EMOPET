import {
  ALLOWED_ADAPTIVE_SIGNALS,
  type AdaptiveSignalKey,
  type AdministrationPolicy,
  type EngagementSignals,
  type SizingDecision,
} from '@emopet/shared';

/**
 * How many items to aim for in the next session.
 *
 * Two rules govern this module.
 *
 * First, sizing targets a DURATION, not a count: a micro-session is two to three
 * minutes, and the item count follows from that.
 *
 * Second, the only inputs are the closed list of app-behaviour signals. No sensor
 * or inference value may reach here — not to choose a cut, not to choose a
 * moment, not to choose a context. An unrecognised key is rejected loudly rather
 * than ignored, because silently dropping an input is how a forbidden signal
 * starts influencing behaviour without anyone noticing.
 *
 * The output is a wish. The breakpoint whitelist decides where the session
 * actually ends.
 */

export class SizingSignalError extends Error {
  readonly code = 'INSTRUMENT_SIZING_SIGNAL_REJECTED';

  constructor(message: string) {
    super(message);
    this.name = 'SizingSignalError';
  }
}

/**
 * Seconds per item used to convert the target duration into a count.
 *
 * A working assumption, not a measurement: roughly ten items in two and a half
 * minutes. It should be recalibrated against real pacing data, and the
 * calibration is one of the questions to put to the instrument owner rather than
 * settled here.
 */
export const ESTIMATED_SECONDS_PER_ITEM = 15;

export interface SizingResult {
  readonly itemCount: number;
  readonly decision: SizingDecision;
  /** Exactly the signals that were read, for the audit record. */
  readonly signalsUsed: EngagementSignals;
  readonly rationale: string;
}

function isForbiddenSignalKey(key: string): boolean {
  return key.startsWith('sensor.')
    || key.startsWith('computed.')
    || key.startsWith('eli.')
    || key.startsWith('mat.')
    || key.startsWith('tag.');
}

/**
 * Reject anything outside the closed list before it can influence sizing.
 *
 * Forbidden namespaces are named explicitly in the error so the failure says why
 * it happened rather than merely that a key was unknown.
 */
export function assertSignalsAllowed(
  signals: object,
  allowed: readonly AdaptiveSignalKey[],
): void {
  for (const key of Object.keys(signals)) {
    if (isForbiddenSignalKey(key)) {
      throw new SizingSignalError(
        `Signal '${key}' comes from sensor or inference data, which must never influence `
          + 'session sizing, cut placement, or the timing of a section.',
      );
    }
    if (!(ALLOWED_ADAPTIVE_SIGNALS as readonly string[]).includes(key)) {
      throw new SizingSignalError(
        `Signal '${key}' is not in the closed list of adaptive signals `
          + `(${ALLOWED_ADAPTIVE_SIGNALS.join(', ')}).`,
      );
    }
    if (!allowed.includes(key as AdaptiveSignalKey)) {
      throw new SizingSignalError(
        `Signal '${key}' is not enabled by this policy (enabled: ${allowed.join(', ') || 'none'}).`,
      );
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Compute the wished item count for the next session.
 *
 * `remainingItems` caps the result: the engine never wishes for more items than
 * the instrument has left.
 */
export function computeSessionSize(
  policy: AdministrationPolicy,
  signals: EngagementSignals,
  remainingItems: number,
): SizingResult {
  if (remainingItems < 1) {
    throw new SizingSignalError(`remainingItems must be at least 1, got ${remainingItems}`);
  }

  assertSignalsAllowed(signals, policy.adaptiveSignals);

  const baseline = Math.round((policy.targetSessionMinutes * 60) / ESTIMATED_SECONDS_PER_ITEM);
  const floor = policy.minItemsPerSession;
  const ceiling = policy.maxItemsPerSession;

  if (!policy.adaptiveSizing) {
    const itemCount = clamp(Math.min(baseline, remainingItems), 1, ceiling);
    return {
      itemCount,
      decision: 'default',
      signalsUsed: {},
      rationale: `Adaptive sizing disabled; target ${policy.targetSessionMinutes} min ≈ ${baseline} items.`,
    };
  }

  const used: EngagementSignals = {};
  let adjustment = 0;
  const reasons: string[] = [];

  const median = signals.median_session_duration;
  if (policy.adaptiveSignals.includes('median_session_duration') && median !== undefined) {
    Object.assign(used, { median_session_duration: median });
    const targetSeconds = policy.targetSessionMinutes * 60;
    // Respect the pace this respondent has actually shown rather than the pace we
    // hoped for.
    const observed = Math.round(median / ESTIMATED_SECONDS_PER_ITEM);
    const delta = observed - baseline;
    adjustment += clamp(delta, -baseline, baseline);
    reasons.push(
      `median session ${Math.round(median)}s vs target ${targetSeconds}s (${delta >= 0 ? '+' : ''}${delta} items)`,
    );
  }

  const completion = signals.completion_rate;
  if (policy.adaptiveSignals.includes('completion_rate') && completion !== undefined) {
    Object.assign(used, { completion_rate: completion });
    // A respondent who rarely finishes what was invited is offered less, not more.
    if (completion < 0.5) {
      adjustment -= 2;
      reasons.push(`completion rate ${completion.toFixed(2)} below 0.50 (-2 items)`);
    } else if (completion > 0.9) {
      adjustment += 1;
      reasons.push(`completion rate ${completion.toFixed(2)} above 0.90 (+1 item)`);
    }
  }

  const pauses = signals.pause_frequency;
  if (policy.adaptiveSignals.includes('pause_frequency') && pauses !== undefined) {
    Object.assign(used, { pause_frequency: pauses });
    if (pauses > 0.5) {
      adjustment -= 2;
      reasons.push(`pauses in ${pauses.toFixed(2)} of sessions (-2 items)`);
    }
  }

  const wished = clamp(baseline + adjustment, floor, ceiling);
  const itemCount = Math.min(wished, remainingItems);

  let decision: SizingDecision = 'default';
  if (itemCount < baseline) decision = 'adapted_shorter';
  else if (itemCount > baseline) decision = 'adapted_longer';

  return {
    itemCount,
    decision,
    signalsUsed: used,
    rationale:
      reasons.length > 0
        ? `baseline ${baseline}; ${reasons.join('; ')}; wished ${itemCount}`
        : `baseline ${baseline}; no engagement history; wished ${itemCount}`,
  };
}
