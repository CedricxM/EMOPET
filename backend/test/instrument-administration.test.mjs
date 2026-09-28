import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const store = await import('../dist/api/services/instrument-content-store.js');
const engine = await import('../dist/api/services/instrument-administration.js');
const sizing = await import('../dist/api/services/instrument-session-sizing.js');
const breakpoints = await import('../dist/api/services/instrument-breakpoints.js');
const validity = await import('../dist/api/services/instrument-validity.js');

const BUNDLE = resolve(process.cwd(), '..', 'config', 'instruments', 'demo-instrument-v0.json');
const structure = store.validateBundle(JSON.parse(await readFile(BUNDLE, 'utf8')));
const plan = engine.buildPlan(structure);
const reverseScored = engine.reverseScoredKeys(structure);

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 8, 28, 9, 0, 0);

/** The sequential, owner-paced policy. Ceiling stays research_only: no licence. */
function policy(overrides = {}) {
  return {
    policyKey: 'SEQUENTIAL_OWNER_PACED',
    administrationMode: 'progressive',
    orderStrategy: 'canonical',
    targetSessionMinutes: 3,
    minItemsPerSession: 5,
    maxItemsPerSession: 15,
    adaptiveSizing: true,
    adaptiveSignals: ['median_session_duration', 'completion_rate', 'pause_frequency'],
    allowChaining: true,
    maxSessions: null,
    maxWindowHours: 336,
    maxSessionGapHours: 72,
    minInterItemMs: 800,
    allowResume: true,
    allowRevision: false,
    allowMidSessionPause: true,
    maxRemindersPerMissedSession: 2,
    deadlineWarningHoursBefore: 48,
    deadlineWarningCountsAsReminder: true,
    fatigueResponseMode: 'silent_flag',
    maxScientificUseStatus: 'research_only',
    ...overrides,
  };
}

/** Answer every item of the currently open session. */
function answerOpenSession(state, { at, latencyMs = 4000, value = () => 2, step = 20_000 } = {}) {
  let current = state;
  let clock = at;
  const session = current.sessions[current.sessions.length - 1];
  while (current.cursor <= session.endPosition) {
    const reference = engine.nextItemReference(current);
    current = engine.recordAnswer(current, {
      itemKey: reference.itemKey,
      status: 'answered',
      value: value(reference.canonicalPosition),
      latencyMs,
      now: clock,
    });
    clock += step;
  }
  return { state: current, clock };
}

test('the conservative default cuts only at section boundaries', () => {
  const usable = breakpoints.resolveUsableBreakpoints(plan.breakpoints);

  // The demo bundle proposes intra-section cuts but nobody approved them, so they
  // are not usable authority and the engine falls back to section boundaries.
  assert.deepEqual(usable.positions, [8, 16]);
  assert.equal(usable.restrictedToSectionBoundaries, true);
  assert.equal(usable.ignoredProposedCount, 3);

  // Approving one intra-section cut point changes the shape, visibly.
  const approved = plan.breakpoints.map((breakpoint) =>
    breakpoint.afterPosition === 12 ? { ...breakpoint, authority: 'emopet_approved' } : breakpoint,
  );
  const widened = breakpoints.resolveUsableBreakpoints(approved);
  assert.deepEqual(widened.positions, [8, 12, 16]);
  assert.equal(widened.restrictedToSectionBoundaries, false);
});

test('a session end is always a whitelisted cut point or the end of the instrument', () => {
  for (let desired = 1; desired <= 24; desired += 1) {
    for (let start = 1; start <= 24; start += 1) {
      const boundary = breakpoints.selectSessionBoundary(plan, start, desired);
      assert.ok(
        breakpoints.isLegalSessionEnd(plan, boundary.endPosition),
        `start ${start}, desired ${desired} produced illegal end ${boundary.endPosition}`,
      );
      assert.ok(boundary.endPosition >= start);
      assert.equal(boundary.itemCount, boundary.endPosition - start + 1);
    }
  }
});

test('the policy item ceiling is respected wherever the structure allows it', () => {
  // Snapping to a cut point must not silently produce a session longer than the
  // policy permits: a short session costs nothing because chaining continues it,
  // while a long one cannot be shortened once begun.
  for (const maxItemCount of [5, 8, 10, 12, 15, 20]) {
    for (let start = 1; start <= 24; start += 1) {
      const boundary = breakpoints.selectSessionBoundary(plan, start, 13, maxItemCount);
      assert.ok(breakpoints.isLegalSessionEnd(plan, boundary.endPosition));
      if (!boundary.exceedsPolicyMaximum) {
        assert.ok(
          boundary.itemCount <= maxItemCount,
          `start ${start}, max ${maxItemCount} produced ${boundary.itemCount} items`,
        );
      }
    }
  }

  // The regression the simulation harness surfaced: wishing for 13 items from
  // position 1 used to snap to the cut point at 16, producing a 16-item session
  // under a 15-item ceiling.
  const snapped = breakpoints.selectSessionBoundary(plan, 1, 13, 15);
  assert.equal(snapped.endPosition, 8);
  assert.equal(snapped.itemCount, 8);
  assert.equal(snapped.exceedsPolicyMaximum, false);

  // When no legal end fits, the engine overshoots by the smallest possible amount
  // and says so rather than cutting where no cut point exists.
  const forced = breakpoints.selectSessionBoundary(plan, 1, 3, 4);
  assert.equal(forced.exceedsPolicyMaximum, true);
  assert.equal(forced.endPosition, 8, 'the earliest legal end is the smallest overshoot');
  assert.ok(breakpoints.isLegalSessionEnd(plan, forced.endPosition));
});

test('the engine never plans a session beyond the policy ceiling', () => {
  // The grazer profile wishes for 13 items; every planned session must still fit.
  let state = engine.createAdministration(policy(), plan, T0);
  let clock = T0;
  const counts = [];

  while (state.cursor <= plan.expectedItemCount) {
    state = engine.planNextSession(
      state,
      { median_session_duration: 190, completion_rate: 0.85, pause_frequency: 0.2 },
      clock,
    );
    const session = state.sessions[state.sessions.length - 1];
    counts.push(session.plannedItemCount);
    assert.ok(
      session.plannedItemCount <= policy().maxItemsPerSession,
      `session ${session.sessionIndex} planned ${session.plannedItemCount} items`,
    );
    state = engine.openSession(state, clock);
    const run = answerOpenSession(state, { at: clock });
    state = engine.closeSession(run.state, run.clock);
    clock = run.clock + 24 * HOUR;
  }

  assert.deepEqual(counts, [8, 8, 8], 'section boundaries give three eight-item sessions');
});

test('sizing rejects any signal outside the closed list, loudly', () => {
  const p = policy();

  for (const forbidden of [
    { 'sensor.restQuality': 0.8 },
    { 'computed.arousal': 0.3 },
    { 'eli.confidence': 0.9 },
    { 'mat.presence': 1 },
    { 'tag.steps': 1200 },
  ]) {
    assert.throws(
      () => sizing.computeSessionSize(p, forbidden, 24),
      /sensor or inference data/,
      Object.keys(forbidden)[0],
    );
  }

  assert.throws(
    () => sizing.computeSessionSize(p, { time_of_day: 14 }, 24),
    /not in the closed list/,
  );
  assert.throws(
    () => sizing.computeSessionSize(policy({ adaptiveSignals: ['completion_rate'] }), { pause_frequency: 0.2 }, 24),
    /not enabled by this policy/,
  );
});

test('sizing targets a duration and adapts within policy bounds', () => {
  const p = policy();

  const base = sizing.computeSessionSize(p, {}, 24);
  assert.equal(base.itemCount, 12); // 3 min at 15 s per item
  assert.equal(base.decision, 'default');
  assert.deepEqual(base.signalsUsed, {});

  const hurried = sizing.computeSessionSize(p, { median_session_duration: 60, completion_rate: 0.4 }, 24);
  assert.equal(hurried.decision, 'adapted_shorter');
  assert.ok(hurried.itemCount >= p.minItemsPerSession);
  assert.ok(hurried.itemCount < base.itemCount);

  const patient = sizing.computeSessionSize(p, { median_session_duration: 300, completion_rate: 0.95 }, 24);
  assert.equal(patient.decision, 'adapted_longer');
  assert.ok(patient.itemCount <= p.maxItemsPerSession);

  // Never more than the instrument has left.
  assert.equal(sizing.computeSessionSize(p, {}, 3).itemCount, 3);
});

test('order is identical for every respondent whatever their engagement', () => {
  const profiles = [
    {},
    { median_session_duration: 45, completion_rate: 0.2, pause_frequency: 0.9 },
    { median_session_duration: 600, completion_rate: 1, pause_frequency: 0 },
    { completion_rate: 0.55 },
  ];

  const sequences = profiles.map((signals) => {
    let state = engine.createAdministration(policy(), plan, T0);
    const order = [];
    let clock = T0;
    while (state.cursor <= plan.expectedItemCount) {
      state = engine.planNextSession(state, signals, clock);
      state = engine.openSession(state, clock);
      const run = answerOpenSession(state, { at: clock });
      state = run.state;
      clock = run.clock + HOUR;
      order.push(...state.responses.slice(order.length).map((response) => response.itemKey));
      state = engine.closeSession(state, clock);
    }
    return order;
  });

  const [first] = sequences;
  for (const sequence of sequences) assert.deepEqual(sequence, first);
  assert.deepEqual(first, [...plan.orderedItemKeys]);
});

test('an administration runs to SCORED across sessions, with pause and resume', () => {
  let state = engine.createAdministration(policy(), plan, T0);
  let clock = T0;

  // Session 1: invited, declined twice, then opened.
  state = engine.planNextSession(state, {}, clock);
  assert.equal(state.sessions[0].plannedItemCount, 8); // section boundary, not 12
  state = engine.inviteSession(state, clock);
  state = engine.declineInvitation(state, clock);
  state = engine.inviteSession(state, clock + HOUR);
  state = engine.declineInvitation(state, clock + HOUR);
  assert.equal(state.sessions[0].reminderCount, 2);
  // The cap is hard: a third reminder is refused.
  state = engine.inviteSession(state, clock + 2 * HOUR);
  assert.throws(() => engine.declineInvitation(state, clock + 2 * HOUR), /Reminder cap of 2/);

  state = engine.openSession(state, clock + 2 * HOUR);
  clock += 2 * HOUR;

  // Answer four items, pause mid-session, resume at the exact item.
  for (let index = 0; index < 4; index += 1) {
    const reference = engine.nextItemReference(state);
    state = engine.recordAnswer(state, {
      itemKey: reference.itemKey,
      status: 'answered',
      value: 1 + (index % 3),
      latencyMs: 5200,
      now: clock,
    });
    clock += 20_000;
  }
  const cursorBeforePause = state.cursor;
  state = engine.pauseMidSession(state, clock);
  assert.equal(state.sessions[0].state, 'mid_pause');
  assert.equal(state.sessions[0].midSessionPauseCount, 1);
  // A pause is not a missed session: it consumes no reminder quota.
  assert.equal(state.sessions[0].reminderCount, 2);

  state = engine.resumeSession(state, clock + 30 * 60_000);
  clock += 30 * 60_000;
  assert.equal(state.cursor, cursorBeforePause, 'resume must return to the exact item');

  const run1 = answerOpenSession(state, { at: clock });
  state = run1.state;
  clock = run1.clock;

  // At the cut point the interface may offer to continue; the respondent stops.
  const offer = engine.continuationOffer(state);
  assert.equal(offer.available, true);
  assert.match(offer.reason, /whitelisted cut point/);
  state = engine.closeSession(state, clock);
  assert.equal(state.lifecycleState, 'awaiting_session');
  assert.equal(state.responses.length, 8);

  // Session 2, next day: the respondent chains to the end.
  clock += 26 * HOUR;
  state = engine.planNextSession(state, { completion_rate: 1 }, clock);
  state = engine.openSession(state, clock);
  const run2 = answerOpenSession(state, { at: clock });
  state = run2.state;
  clock = run2.clock;

  assert.equal(engine.continuationOffer(state).available, true);
  state = engine.acceptContinuation(state, { completion_rate: 1 }, clock);
  assert.equal(state.sessions[1].chained, true);
  assert.equal(state.sessions[1].sizingDecision, 'owner_chained');

  const run3 = answerOpenSession(state, { at: clock });
  state = run3.state;
  clock = run3.clock;

  assert.equal(state.cursor, 25);
  assert.equal(engine.continuationOffer(state).atEndOfInstrument, true);
  state = engine.closeSession(state, clock);
  assert.equal(state.lifecycleState, 'complete');
  assert.equal(state.responses.length, 24);

  const gate = engine.scoringGate(state, reverseScored, clock);
  assert.deepEqual(gate.reasons, []);
  assert.equal(gate.allowed, true);
  // Two sessions over two days: distributed shape, capped by the policy ceiling.
  assert.equal(gate.status, 'research_only');

  state = engine.markScored(state, clock);
  assert.equal(state.lifecycleState, 'scored');
  assert.equal(state.effectiveScientificUseStatus, 'research_only');
});

test('segmentation covariates record what each item actually experienced', () => {
  let state = engine.createAdministration(policy(), plan, T0);
  state = engine.planNextSession(state, {}, T0);
  state = engine.openSession(state, T0);
  const run = answerOpenSession(state, { at: T0 });
  state = run.state;

  const first = state.responses[0];
  assert.equal(first.positionInSession, 1);
  assert.equal(first.hoursSincePreviousItem, null);
  assert.equal(first.crossedSectionBoundary, false);

  const eighth = state.responses[7];
  assert.equal(eighth.positionInSession, 8);
  assert.ok(eighth.hoursSincePreviousItem > 0);

  // Position 9 opens section B, so the item that crosses the boundary is marked.
  state = engine.closeSession(state, run.clock);
  state = engine.planNextSession(state, {}, run.clock + HOUR);
  state = engine.openSession(state, run.clock + HOUR);
  const reference = engine.nextItemReference(state);
  assert.equal(reference.canonicalPosition, 9);
  state = engine.recordAnswer(state, {
    itemKey: reference.itemKey,
    status: 'answered',
    value: 3,
    latencyMs: 3000,
    now: run.clock + HOUR,
  });
  assert.equal(state.responses[8].crossedSectionBoundary, true);
  assert.equal(state.responses[8].positionInSession, 1);
});

test('one sitting reaches the standard shape, and the ceiling still holds', () => {
  function runInOneSitting(ceiling) {
    let state = engine.createAdministration(
      policy({ maxScientificUseStatus: ceiling }),
      plan,
      T0,
    );
    let clock = T0;
    state = engine.planNextSession(state, {}, clock);
    state = engine.openSession(state, clock);

    // Chain through the whole instrument without leaving.
    for (;;) {
      const run = answerOpenSession(state, { at: clock, step: 15_000 });
      state = run.state;
      clock = run.clock;
      const offer = engine.continuationOffer(state);
      if (!offer.available) break;
      state = engine.acceptContinuation(state, {}, clock);
    }
    state = engine.closeSession(state, clock);
    return state;
  }

  const capped = runInOneSitting('research_only');
  const shape = engine.administrationShape(capped);
  assert.equal(shape.sessionCount, 1);
  assert.ok(shape.spanHours < 48);
  // The shape earns scoring_allowed, but no licence authorises it, so the ceiling
  // keeps it at research_only.
  assert.equal(engine.effectiveScientificUseStatus(capped), 'research_only');

  // Raise the ceiling, as a written approval would, and the same shape qualifies.
  const approved = runInOneSitting('scoring_allowed');
  assert.equal(engine.effectiveScientificUseStatus(approved), 'scoring_allowed');
  assert.equal(approved.sessions.length, 1);
  assert.equal(approved.responses.length, 24);
});

test('an expired window refuses scoring and destroys nothing', () => {
  let state = engine.createAdministration(policy({ maxWindowHours: 48 }), plan, T0);
  state = engine.planNextSession(state, {}, T0);
  state = engine.openSession(state, T0);
  const run = answerOpenSession(state, { at: T0 });
  state = engine.closeSession(run.state, run.clock);
  assert.equal(state.responses.length, 8);

  const late = T0 + 49 * HOUR;
  const expired = engine.tick(state, late);

  assert.equal(expired.lifecycleState, 'partial_retained');
  assert.equal(expired.responses.length, 8, 'responses must survive expiry');
  assert.equal(expired.validityFlags.length, state.validityFlags.length);

  const gate = engine.scoringGate(expired, reverseScored, late);
  assert.equal(gate.allowed, false);
  assert.ok(gate.reasons.some((reason) => /window expired/.test(reason)));
  assert.ok(gate.reasons.some((reason) => /responses are retained/.test(reason)));

  // Planning inside an expired window is refused rather than silently succeeding.
  assert.throws(() => engine.planNextSession(expired, {}, late), /Cannot plan a session/);
});

test('a resume beyond the session gap expires that session', () => {
  let state = engine.createAdministration(policy({ maxSessionGapHours: 24 }), plan, T0);
  state = engine.planNextSession(state, {}, T0);
  state = engine.openSession(state, T0);
  const reference = engine.nextItemReference(state);
  state = engine.recordAnswer(state, {
    itemKey: reference.itemKey,
    status: 'answered',
    value: 2,
    latencyMs: 3000,
    now: T0,
  });
  state = engine.suspendSession(state, T0 + 60_000);

  const tooLate = T0 + 30 * HOUR;
  assert.throws(() => engine.resumeSession(state, tooLate), /expired before it was resumed/);

  const ticked = engine.tick(state, tooLate);
  assert.equal(ticked.sessions[0].state, 'expired');
  assert.equal(ticked.lifecycleState, 'awaiting_session');
  assert.equal(ticked.responses.length, 1, 'the answer given before the gap is kept');
});

test('the deadline warning is factual and announces no loss', () => {
  let state = engine.createAdministration(policy({ maxWindowHours: 336 }), plan, T0);
  state = engine.planNextSession(state, {}, T0);

  const early = engine.deadlineWarning(state, T0 + HOUR);
  assert.equal(early.due, false);

  const near = engine.deadlineWarning(state, T0 + (336 - 12) * HOUR);
  assert.equal(near.due, true);
  assert.ok(near.hoursRemaining <= 48);

  for (const lossWord of ['perdre', 'perdu', 'effacé', 'dernière chance', 'il ne reste plus que']) {
    assert.equal(
      near.message.toLowerCase().includes(lossWord),
      false,
      `deadline message must not use loss framing: ${lossWord}`,
    );
  }
  assert.match(near.message, /réponses déjà données sont conservées/);
});

test('validity flags stay server-side and no single signal invalidates', () => {
  let state = engine.createAdministration(policy(), plan, T0);
  state = engine.planNextSession(state, {}, T0);
  state = engine.openSession(state, T0);

  // Every answer far too fast AND identical: two independent signals.
  const run = answerOpenSession(state, { at: T0, latencyMs: 120, value: () => 4, step: 200 });
  state = run.state;

  const assessment = validity.assessValidity(state.policy, state.plan, state.responses, reverseScored, run.clock);
  assert.ok(assessment.shortLatencyShare > 0.25);
  for (const flag of assessment.flags) assert.equal(flag.ownerVisible, false);

  // The snapshot exposes counts and a decision, never the flag details, so a
  // careless caller cannot forward them to a client.
  const snapshot = engine.validitySnapshot(state, reverseScored, run.clock);
  assert.equal(typeof snapshot.flagCount, 'number');
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot, 'flags'), false);

  // Fast answers alone are ambiguous: a single signal never suggests invalidation.
  const fastOnly = validity.assessValidity(
    state.policy,
    state.plan,
    state.responses.map((response, index) => ({ ...response, value: index % 4 })),
    reverseScored,
    run.clock,
  );
  assert.ok(fastOnly.shortLatencyShare > 0.25);
  assert.equal(fastOnly.longestIdenticalRun < validity.SERIAL_RUN_THRESHOLD, true);
  assert.equal(fastOnly.suggestsInvalidation, false);
});

test('fatigue handling follows the policy, and silent_flag reaches no client', () => {
  let state = engine.createAdministration(policy(), plan, T0);
  state = engine.planNextSession(state, {}, T0);
  state = engine.openSession(state, T0);
  const run = answerOpenSession(state, { at: T0, latencyMs: 100, value: () => 4, step: 150 });
  state = run.state;

  // Default mode: the flag is computed and nothing is offered.
  assert.equal(engine.validitySnapshot(state, reverseScored, run.clock).fatigue.kind, 'flag_only');

  const atBoundary = { ...state, policy: policy({ fatigueResponseMode: 'boundary_offer' }) };
  assert.equal(
    engine.validitySnapshot(atBoundary, reverseScored, run.clock).fatigue.kind,
    'offer_at_boundary',
  );

  const immediate = { ...state, policy: policy({ fatigueResponseMode: 'immediate_offer' }) };
  assert.equal(engine.validitySnapshot(immediate, reverseScored, run.clock).fatigue.kind, 'offer_now');
});

test('the engine refuses any order strategy that depends on the respondent', () => {
  for (const strategy of ['subscale_blocked', 'licensed_randomized']) {
    assert.throws(
      () => engine.createAdministration(policy({ orderStrategy: strategy }), plan, T0),
      /canonical order strategy/,
      strategy,
    );
  }
});

test('invalidation withholds publication without deleting anything', () => {
  let state = engine.createAdministration(policy(), plan, T0);
  state = engine.planNextSession(state, {}, T0);
  state = engine.openSession(state, T0);
  const run = answerOpenSession(state, { at: T0 });
  state = run.state;

  const invalidated = engine.invalidate(state, 'two validity signals, reviewed by a human');
  assert.equal(invalidated.lifecycleState, 'invalidated');
  assert.equal(invalidated.effectiveScientificUseStatus, 'not_equivalent');
  assert.equal(invalidated.responses.length, state.responses.length);
  assert.match(invalidated.invalidationReason, /reviewed by a human/);

  const gate = engine.scoringGate(invalidated, reverseScored, run.clock);
  assert.equal(gate.allowed, false);
});
