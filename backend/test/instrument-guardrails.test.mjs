import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const controls = await import('../dist/api/services/instrument-session-controls.js');
const breakpoints = await import('../dist/api/services/instrument-breakpoints.js');
const store = await import('../dist/api/services/instrument-content-store.js');
const engine = await import('../dist/api/services/instrument-administration.js');

const repoRoot = resolve(process.cwd(), '..');
const bundle = JSON.parse(
  readFileSync(resolve(repoRoot, 'config/instruments/demo-instrument-v0.json'), 'utf8'),
);
const structure = store.validateBundle(bundle);
const plan = engine.buildPlan(structure);

/**
 * G10, G11, G12 and the guardrail coverage map.
 *
 * The map matters as much as the individual checks. Twelve guardrails are easy to
 * describe and easy to lose: one gets refactored away, the description stays, and
 * nobody notices the gap. Naming the enforcement point of each one, and asserting
 * that point still exists, is what keeps the list honest.
 */

// ── G12 — the frozen session-control registry ───────────────────────

test('G12 — the session-control registry is safe and exhaustive', () => {
  assert.deepEqual(controls.validateRegistry(), []);
  assert.doesNotThrow(() => controls.assertRegistryIsSafe());

  const ids = controls.SESSION_CONTROLS.map((control) => control.id).sort();
  assert.deepEqual(ids, [
    'CONTINUE_ACCEPT', 'CONTINUE_DECLINE', 'CONTINUE_OFFER',
    'DEADLINE_NOTICE', 'PAUSE_ACTION', 'PAUSE_OFFER', 'RESUME_ACTION',
  ]);

  // The vocabulary is about the session, never about the animal or the answers.
  for (const control of controls.SESSION_CONTROLS) {
    assert.equal(control.locale, 'fr-FR');
    assert.ok(control.version >= 1);
    assert.ok(control.text.trim().length > 0);
  }
});

test('G12 — the registry rejects a control that comments on the answering', () => {
  const offending = [
    { id: 'CONTINUE_OFFER', kind: 'prompt', locale: 'fr-FR', version: 1, text: 'Vous répondez vite, une pause ?' },
    { id: 'PAUSE_OFFER', kind: 'prompt', locale: 'fr-FR', version: 1, text: 'Toujours la même réponse, on souffle ?' },
    { id: 'DEADLINE_NOTICE', kind: 'notice', locale: 'fr-FR', version: 1, text: 'Dernière chance avant de perdre vos réponses.' },
    { id: 'CONTINUE_ACCEPT', kind: 'action', locale: 'fr-FR', version: 1, text: 'Bravo, série de 10 !' },
    { id: 'RESUME_ACTION', kind: 'action', locale: 'fr-FR', version: 1, text: 'Reprendre avec votre chien' },
    { id: 'CONTINUE_DECLINE', kind: 'action', locale: 'fr-FR', version: 1, text: 'Arrêter ?' },
  ];

  for (const control of offending) {
    const violations = controls.validateRegistry([control]);
    assert.ok(violations.length > 0, `should have been rejected: ${control.text}`);
    assert.throws(() => controls.assertRegistryIsSafe([control]), /registry violations/);
  }
});

test('G12 — the deadline notice the engine shows comes from the registry', () => {
  const policy = {
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
  };

  const T0 = Date.UTC(2026, 9, 1, 9, 0, 0);
  const state = engine.createAdministration(policy, plan, T0);
  const warning = engine.deadlineWarning(state, T0 + (336 - 12) * 3_600_000);

  assert.equal(warning.due, true);
  // Not merely similar wording: the same string, so it cannot drift out of reach of
  // the forbidden-pattern checks.
  assert.equal(warning.message, controls.sessionControl('DEADLINE_NOTICE').text);
  assert.equal(controls.isRegisteredControlText(warning.message), true);
});

// ── G10 — the cut-point whitelist ───────────────────────────────────

test('G10 — a cut outside the whitelist is inexpressible', () => {
  const usable = breakpoints.resolveUsableBreakpoints(plan.breakpoints);

  // Exhaustive over every start and every wish: the chosen end is always legal.
  for (let start = 1; start <= plan.expectedItemCount; start += 1) {
    for (let desired = 1; desired <= plan.expectedItemCount; desired += 1) {
      const boundary = breakpoints.selectSessionBoundary(plan, start, desired, 15);
      const legal =
        boundary.endPosition === plan.expectedItemCount
        || usable.positions.includes(boundary.endPosition);
      assert.ok(legal, `start ${start} desired ${desired} -> illegal end ${boundary.endPosition}`);
    }
  }

  // And a proposed-only intra-section cut is not usable authority.
  assert.deepEqual(usable.positions, [8, 16]);
  assert.equal(usable.ignoredProposedCount, 3);
});

// ── G11 — order invariance ──────────────────────────────────────────

test('G11 — canonical position never depends on the respondent', () => {
  // Structural, not behavioural: no column of the item or breakpoint registry
  // references a user, a dog or a context, so order invariance is visible in the
  // schema rather than only observed at runtime.
  const schema = readFileSync(
    resolve(process.cwd(), 'db', 'schema', 'instruments.ts'),
    'utf8',
  );
  const itemsTable = schema.slice(
    schema.indexOf("pgTable('instrument_items'"),
    schema.indexOf("pgTable('instrument_breakpoints'"),
  );
  for (const forbidden of ['dogs.id', 'users.id', 'dogId', 'userId', 'respondent']) {
    assert.equal(
      itemsTable.includes(forbidden),
      false,
      `instrument_items must not reference ${forbidden}`,
    );
  }

  // Behavioural confirmation across widely different engagement profiles.
  const sequences = [
    {},
    { median_session_duration: 40, completion_rate: 0.1, pause_frequency: 0.95 },
    { median_session_duration: 900, completion_rate: 1, pause_frequency: 0 },
  ].map((signals) => {
    let state = engine.createAdministration(
      {
        policyKey: 'P', administrationMode: 'progressive', orderStrategy: 'canonical',
        targetSessionMinutes: 3, minItemsPerSession: 5, maxItemsPerSession: 15,
        adaptiveSizing: true,
        adaptiveSignals: ['median_session_duration', 'completion_rate', 'pause_frequency'],
        allowChaining: true, maxSessions: null, maxWindowHours: 336, maxSessionGapHours: 72,
        minInterItemMs: 800, allowResume: true, allowRevision: false,
        allowMidSessionPause: true, maxRemindersPerMissedSession: 2,
        deadlineWarningHoursBefore: 48, deadlineWarningCountsAsReminder: true,
        fatigueResponseMode: 'silent_flag', maxScientificUseStatus: 'research_only',
      },
      plan,
      0,
    );
    const order = [];
    let clock = 0;
    while (state.cursor <= plan.expectedItemCount) {
      state = engine.planNextSession(state, signals, clock);
      state = engine.openSession(state, clock);
      const session = state.sessions[state.sessions.length - 1];
      while (state.cursor <= session.endPosition) {
        const reference = engine.nextItemReference(state);
        order.push(reference.itemKey);
        clock += 15_000;
        state = engine.recordAnswer(state, {
          itemKey: reference.itemKey, status: 'answered', value: 2, latencyMs: 3000, now: clock,
        });
      }
      clock += 3_600_000;
      state = engine.closeSession(state, clock);
    }
    return order;
  });

  for (const order of sequences) assert.deepEqual(order, [...plan.orderedItemKeys]);
});

// ── The coverage map ────────────────────────────────────────────────

/**
 * Where each guardrail is actually enforced.
 *
 * Every entry names a file and a marker that must be present in it. A refactor
 * that removes the enforcement breaks this test, rather than leaving a list of
 * guardrails that describes a system that no longer exists.
 */
const GUARDRAILS = [
  {
    id: 'G1', what: 'item wording never enters a model call',
    file: 'api/services/instrument-content-store.ts', marker: 'SealedItemPayload',
  },
  {
    id: 'G2', what: 'opaque types keep wording out of prompt inputs',
    file: '../packages/shared/src/instruments/types.ts', marker: 'InstrumentPromptContext',
  },
  {
    id: 'G3', what: 'the database refuses an item presentation involving a model',
    file: 'db/migrations/0025_instrument_administration.sql', marker: 'chk_event_item_presentation',
  },
  {
    id: 'G4', what: 'render digests are recomputed before presentation',
    file: 'api/services/instrument-content-store.ts', marker: 'RenderDigestMismatchError',
  },
  {
    id: 'G5', what: 'the journal replays the database invariants in code',
    file: 'api/services/instrument-audit-journal.ts', marker: 'assertEventAllowed',
  },
  {
    id: 'G6', what: 'bundle validation is fail-closed',
    file: 'api/services/instrument-content-store.ts', marker: 'validateBundle',
  },
  {
    id: 'G7', what: 'sealed payloads are rendered verbatim, never interpolated',
    file: '../packages/shared/src/instruments/types.ts', marker: 'rendered verbatim',
  },
  {
    id: 'G8', what: 'no licensed content is tracked in the repository',
    file: 'test/instrument-no-licensed-content.test.mjs', marker: 'every tracked item key is a demo key',
  },
  {
    id: 'G9', what: 'the engine has no import path to sensor or inference code',
    file: 'test/instrument-sensor-embargo.test.mjs', marker: 'no path to sensor or inference code',
  },
  {
    id: 'G10', what: 'a cut is legal only if whitelisted',
    file: 'api/services/instrument-breakpoints.ts', marker: 'resolveUsableBreakpoints',
  },
  {
    id: 'G11', what: 'item order never depends on the respondent',
    file: 'api/services/instrument-administration.ts', marker: 'canonical order strategy',
  },
  {
    id: 'G12', what: 'session controls are fixed strings from a versioned registry',
    file: 'api/services/instrument-session-controls.ts', marker: 'FORBIDDEN_CONTROL_PATTERNS',
  },
];

test('the twelve guardrails each have a live enforcement point', () => {
  const missing = [];

  for (const guardrail of GUARDRAILS) {
    const path = resolve(process.cwd(), guardrail.file);
    let source;
    try {
      source = readFileSync(path, 'utf8');
    } catch {
      missing.push(`${guardrail.id}: file not found (${guardrail.file})`);
      continue;
    }
    if (!source.includes(guardrail.marker)) {
      missing.push(`${guardrail.id}: '${guardrail.marker}' not in ${guardrail.file}`);
    }
  }

  assert.deepEqual(missing, [], `guardrails without enforcement:\n  ${missing.join('\n  ')}`);
  assert.equal(GUARDRAILS.length, 12);
  assert.deepEqual(
    GUARDRAILS.map((guardrail) => guardrail.id),
    Array.from({ length: 12 }, (_, index) => `G${index + 1}`),
    'the map must cover G1 to G12 with no gap',
  );
});
