import type {
  AdministrationPlanInput,
  AdministrationPolicy,
  RecordedResponse,
  ValidityFlag,
  ValidityFlagKind,
} from '@emopet/shared';

/**
 * Validity checks, computed server-side and never shown to the respondent.
 *
 * Three rules hold throughout.
 *
 * A flag is never surfaced as such. Telling someone they answer too fast is a
 * comment on their answers, which would change how they answer next.
 *
 * No single signal invalidates anything. Short latency is ambiguous: a
 * respondent who knows their dog very well answers quickly and accurately.
 *
 * Invalidation destroys nothing. It withholds publication and downgrades the
 * scientific status; the responses and the audit trail stay.
 */

/** Identical consecutive answers before serial responding is suspected. */
export const SERIAL_RUN_THRESHOLD = 10;

/** Share of items below the latency floor before the administration is suspect. */
export const SHORT_LATENCY_INVALIDATION_SHARE = 0.25;

export interface ValidityAssessment {
  readonly flags: readonly ValidityFlag[];
  /**
   * True only when more than one independent signal points the same way, per the
   * rule that no single signal invalidates an administration.
   */
  readonly suggestsInvalidation: boolean;
  readonly shortLatencyShare: number;
  readonly longestIdenticalRun: number;
  readonly incompleteSubscales: readonly string[];
}

function flag(kind: ValidityFlagKind, raisedAt: number, detail: string): ValidityFlag {
  return { kind, raisedAt, detail, ownerVisible: false };
}

/**
 * Longest run of identical answered values.
 *
 * Reverse-scored items break a run: answering the same raw value either side of
 * a reversed item is a change of position, not a repetition, so counting it as
 * one would flag consistent respondents.
 */
export function longestIdenticalRun(
  responses: readonly RecordedResponse[],
  reverseScored: ReadonlySet<string>,
): number {
  let longest = 0;
  let run = 0;
  let previousValue: number | null = null;

  for (const response of responses) {
    if (response.status !== 'answered' || response.value === null) {
      run = 0;
      previousValue = null;
      continue;
    }
    if (reverseScored.has(response.itemKey)) {
      run = 1;
      previousValue = response.value;
      continue;
    }
    if (previousValue !== null && response.value === previousValue) {
      run += 1;
    } else {
      run = 1;
    }
    previousValue = response.value;
    longest = Math.max(longest, run);
  }

  return longest;
}

export function assessValidity(
  policy: AdministrationPolicy,
  plan: AdministrationPlanInput,
  responses: readonly RecordedResponse[],
  reverseScored: ReadonlySet<string>,
  now: number,
): ValidityAssessment {
  const flags: ValidityFlag[] = [];

  const timed = responses.filter((response) => response.latencyMs !== null);
  const tooFast = timed.filter((response) => (response.latencyMs as number) < policy.minInterItemMs);
  const shortLatencyShare = timed.length === 0 ? 0 : tooFast.length / timed.length;

  if (tooFast.length > 0) {
    flags.push(
      flag(
        'short_latency',
        now,
        `${tooFast.length}/${timed.length} responses under ${policy.minInterItemMs} ms`,
      ),
    );
  }

  const run = longestIdenticalRun(responses, reverseScored);
  if (run >= SERIAL_RUN_THRESHOLD) {
    flags.push(
      flag('serial_responding', now, `${run} identical consecutive answered values`),
    );
  }

  // Completeness is reported per subscale, so one incomplete subscale does not
  // condemn the ones that are complete.
  const answeredKeys = new Set<string>(
    responses.filter((response) => response.status === 'answered').map((r) => r.itemKey),
  );
  const bySubscale = new Map<string, { total: number; answered: number }>();
  for (const [itemKey, subscaleKey] of Object.entries(plan.subscaleOfItem)) {
    if (subscaleKey === null) continue;
    const bucket = bySubscale.get(subscaleKey) ?? { total: 0, answered: 0 };
    bucket.total += 1;
    if (answeredKeys.has(itemKey)) bucket.answered += 1;
    bySubscale.set(subscaleKey, bucket);
  }

  const incompleteSubscales: string[] = [];
  for (const [subscaleKey, bucket] of bySubscale) {
    if (bucket.answered < bucket.total) {
      incompleteSubscales.push(subscaleKey);
      flags.push(
        flag(
          'incomplete_subscale',
          now,
          `${subscaleKey}: ${bucket.answered}/${bucket.total} answered`,
        ),
      );
    }
  }

  // Two independent signals, not one. The official thresholds for what actually
  // invalidates an administration are not ours to invent, so this only ever
  // *suggests* invalidation and the caller decides.
  const signals = [
    shortLatencyShare > SHORT_LATENCY_INVALIDATION_SHARE,
    run >= SERIAL_RUN_THRESHOLD,
  ].filter(Boolean).length;

  return {
    flags,
    suggestsInvalidation: signals >= 2,
    shortLatencyShare,
    longestIdenticalRun: run,
    incompleteSubscales: incompleteSubscales.sort(),
  };
}

export type FatigueOutcome =
  | { readonly kind: 'none' }
  | { readonly kind: 'flag_only'; readonly detail: string }
  | { readonly kind: 'offer_at_boundary'; readonly detail: string }
  | { readonly kind: 'offer_now'; readonly detail: string };

/**
 * Decide what, if anything, a fatigue signal produces.
 *
 * The tension is real and not resolved here: offering a pause because answers
 * came fast is a form of feedback on those answers, while saying nothing leaves a
 * tired respondent producing poor data. The policy holds the choice, and
 * `silent_flag` is the default because it is the only mode with no neutrality
 * risk.
 *
 * `decorrelated` is supplied by the caller and is what keeps `offer_at_boundary`
 * defensible: pause offers also occur without any fatigue signal, so a respondent
 * cannot learn the rule "answering quickly makes Breiz offer a pause" — it is
 * false part of the time.
 */
export function decideFatigueResponse(
  policy: AdministrationPolicy,
  assessment: ValidityAssessment,
  atLegalBoundary: boolean,
): FatigueOutcome {
  const fatigueSuspected =
    assessment.shortLatencyShare > SHORT_LATENCY_INVALIDATION_SHARE
    || assessment.longestIdenticalRun >= SERIAL_RUN_THRESHOLD;

  if (!fatigueSuspected) return { kind: 'none' };

  const detail =
    `short-latency share ${assessment.shortLatencyShare.toFixed(2)}, `
    + `longest identical run ${assessment.longestIdenticalRun}`;

  switch (policy.fatigueResponseMode) {
    case 'silent_flag':
      return { kind: 'flag_only', detail };
    case 'boundary_offer':
      return atLegalBoundary
        ? { kind: 'offer_at_boundary', detail }
        : { kind: 'flag_only', detail };
    case 'immediate_offer':
      return { kind: 'offer_now', detail };
  }
}
