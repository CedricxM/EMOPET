#!/usr/bin/env node

/**
 * Drive complete sequential administrations of the DEMO instrument and export the
 * audit trail, the responses and their segmentation covariates.
 *
 * This is the demonstration harness for the October discussion, not a product
 * surface. It answers three questions with running code rather than description:
 *
 *   1. does the item order stay identical for every respondent, whatever their
 *      engagement profile;
 *   2. does every item presentation prove its fidelity and attest that no model
 *      was in the loop;
 *   3. does the audit chain verify on every single administration.
 *
 * It also injects a KNOWN position effect on demand, so the segmentation
 * detector can be shown to find an effect that is really there and to report
 * none when there is none. Synthetic data cannot demonstrate the absence of an
 * effect; it can demonstrate that the instrument measuring it works.
 *
 * Usage:
 *   node scripts/instruments/simulate-administration.mjs \
 *     --owners 400 --profile mixed --seed 42 \
 *     --inject-position-effect 0.0 --ceiling research_only \
 *     --out .data/demo-p/
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('.');

// The content store resolves its directory from the working directory of the
// backend package. This script runs from the repository root, so point it
// explicitly rather than relying on a relative path that differs per caller.
process.env['INSTRUMENT_CONTENT_DIR'] ??= resolve(root, 'config', 'instruments');

const distRoot = resolve(root, 'backend', 'dist', 'api', 'services');
if (!existsSync(resolve(distRoot, 'instrument-administration.js'))) {
  console.error(
    'The backend must be built first: pnpm --filter @emopet/api build\n'
      + `Expected compiled services under ${distRoot}`,
  );
  process.exit(2);
}

const store = await import(resolve(distRoot, 'instrument-content-store.js'));
const engine = await import(resolve(distRoot, 'instrument-administration.js'));
const journalModule = await import(resolve(distRoot, 'instrument-audit-journal.js'));

const {
  AuditJournal, auditEvent, itemAnsweredEvent, itemPresentedEvent,
  fidelityReport, segmentationTable,
} = journalModule;

// ── CLI ─────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const options = {
    owners: 400,
    profile: 'mixed',
    seed: 42,
    injectPositionEffect: 0,
    ceiling: 'research_only',
    out: '.data/demo-p',
    policy: 'SEQUENTIAL_OWNER_PACED',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    // pnpm forwards the `--` separator literally, so tolerate it rather than
    // failing on the standard way of passing arguments through a package script.
    if (flag === '--') continue;
    switch (flag) {
      case '--owners': options.owners = Number.parseInt(value, 10); index += 1; break;
      case '--profile': options.profile = value; index += 1; break;
      case '--seed': options.seed = Number.parseInt(value, 10); index += 1; break;
      case '--inject-position-effect':
        options.injectPositionEffect = Number.parseFloat(value); index += 1; break;
      case '--ceiling': options.ceiling = value; index += 1; break;
      case '--out': options.out = value; index += 1; break;
      case '--policy': options.policy = value; index += 1; break;
      case '--help':
        console.log(
          'Options: --owners N --profile sprinter|grazer|abandoner|mixed --seed N\n'
            + '         --inject-position-effect D --ceiling research_only|scoring_allowed\n'
            + '         --out DIR --policy KEY\n\n'
            + 'The injected position effect D is expressed in scale points across a full\n'
            + 'session: D = 0.4 means answers drift 0.4 points between the first and the\n'
            + 'last item of a session. Normalising per session keeps the effect comparable\n'
            + 'when session lengths differ.',
        );
        process.exit(0);
        break;
      default:
        if (flag.startsWith('--')) {
          console.error(`Unknown option ${flag}`);
          process.exit(2);
        }
    }
  }

  if (!Number.isInteger(options.owners) || options.owners < 1) {
    console.error('--owners must be a positive integer');
    process.exit(2);
  }
  if (!['sprinter', 'grazer', 'abandoner', 'mixed'].includes(options.profile)) {
    console.error(`--profile must be sprinter, grazer, abandoner or mixed`);
    process.exit(2);
  }
  if (!['research_only', 'scoring_allowed', 'unreviewed', 'not_equivalent'].includes(options.ceiling)) {
    console.error('--ceiling must be a valid scientific use status');
    process.exit(2);
  }
  if (!Number.isFinite(options.injectPositionEffect)) {
    console.error('--inject-position-effect must be a number');
    process.exit(2);
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));

// ── Deterministic randomness ────────────────────────────────────────

/** mulberry32: small, dependency-free, and reproducible from a seed. */
function makeRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Policy and instrument ───────────────────────────────────────────

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 9, 1, 9, 0, 0);

function policy(ceiling) {
  return {
    policyKey: options.policy,
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
    maxScientificUseStatus: ceiling,
  };
}

const bundlePath = resolve(process.env['INSTRUMENT_CONTENT_DIR'], 'demo-instrument-v0.json');
const structure = store.validateBundle(JSON.parse(await readFile(bundlePath, 'utf8')));
const plan = engine.buildPlan(structure);
const contentStore = new store.DemoContentStore();

// Cache the sealed digests once: the store recomputes and checks them on every
// read, so a single pass is enough to prove fidelity for the whole run.
const digestOf = new Map();
for (const item of structure.items) {
  const sealed = await contentStore.readItem(structure.versionRef, item.itemKey);
  digestOf.set(item.itemKey, sealed.renderDigest);
}

// ── Respondent profiles ─────────────────────────────────────────────

const PROFILES = {
  /** Answers the whole instrument in one sitting, chaining at every offer. */
  sprinter: {
    chains: () => true,
    gapHours: () => 0,
    latencyMs: (rng) => 2200 + rng() * 2600,
    stepMs: (rng) => 9_000 + rng() * 7_000,
    signals: { completion_rate: 1, median_session_duration: 320, pause_frequency: 0 },
    stopAfterShare: null,
    midPauseChance: 0.05,
  },
  /** One short session per day. The pacing the sequential design is built for. */
  grazer: {
    chains: () => false,
    gapHours: (rng) => 23 + rng() * 3,
    latencyMs: (rng) => 3400 + rng() * 4200,
    stepMs: (rng) => 14_000 + rng() * 12_000,
    signals: { completion_rate: 0.85, median_session_duration: 190, pause_frequency: 0.2 },
    stopAfterShare: null,
    midPauseChance: 0.25,
  },
  /** Stops partway and never comes back. Produces a real incomplete case. */
  abandoner: {
    chains: () => false,
    gapHours: (rng) => 30 + rng() * 20,
    latencyMs: (rng) => 1900 + rng() * 5200,
    stepMs: (rng) => 11_000 + rng() * 15_000,
    signals: { completion_rate: 0.35, median_session_duration: 120, pause_frequency: 0.55 },
    stopAfterShare: 0.4,
    midPauseChance: 0.4,
  },
};

function pickProfile(rng) {
  if (options.profile !== 'mixed') return options.profile;
  const draw = rng();
  if (draw < 0.3) return 'sprinter';
  if (draw < 0.8) return 'grazer';
  return 'abandoner';
}

// ── Response model ──────────────────────────────────────────────────

/**
 * A latent answer for one respondent and one item, before any position effect.
 *
 * Deliberately simple: a respondent trait plus an item tendency plus noise. It
 * only needs enough variance for an effect to be detectable against, and it is
 * not a model of anything real.
 */
function latentValue(ownerTrait, itemIndex, rng) {
  // Item tendencies are deterministic but non-periodic. An arithmetic pattern such
  // as (itemIndex * 7) % 5 aliases against the session length and manufactures a
  // position artefact that has nothing to do with any injected effect.
  const itemTendency = itemTendencyOf(itemIndex);
  const centred = 0.35 * ownerTrait + 0.45 * itemTendency + 0.20 * rng();
  return centred * 4; // onto the 0..4 scale
}

const itemTendencyCache = new Map();

/** Stable pseudo-random tendency per item, from a seeded generator. */
function itemTendencyOf(itemIndex) {
  const cached = itemTendencyCache.get(itemIndex);
  if (cached !== undefined) return cached;
  const draw = makeRng(options.seed ^ (itemIndex * 0x9e3779b1))();
  itemTendencyCache.set(itemIndex, draw);
  return draw;
}

/**
 * Position bias, expressed in scale points across a full session.
 *
 * Normalising by the session's own length keeps the injected effect comparable
 * when sessions differ in length, which they do as soon as sizing adapts.
 */
function positionBias(delta, positionInSession, sessionItemCount) {
  if (delta === 0 || sessionItemCount <= 1) return 0;
  return delta * ((positionInSession - 1) / (sessionItemCount - 1));
}

function toScale(value) {
  return Math.max(0, Math.min(4, Math.round(value)));
}

// ── One administration ──────────────────────────────────────────────

function simulateOwner(ownerIndex, profileName, rng) {
  const profile = PROFILES[profileName];
  const ownerTrait = rng();
  const journal = new AuditJournal();

  let state = engine.createAdministration(policy(options.ceiling), plan, T0);
  let clock = T0 + Math.floor(rng() * 6 * HOUR);
  journal.append(auditEvent('assessment_opened', clock));

  const stopAfterItems = profile.stopAfterShare === null
    ? null
    : Math.max(1, Math.round(plan.expectedItemCount * profile.stopAfterShare));

  let abandoned = false;

  while (state.cursor <= plan.expectedItemCount && !abandoned) {
    state = engine.planNextSession(state, profile.signals, clock);
    let session = state.sessions[state.sessions.length - 1];
    journal.append(auditEvent('session_planned', clock, { sessionIndex: session.sessionIndex }));
    journal.append(auditEvent('session_size_decided', clock, {
      sessionIndex: session.sessionIndex,
      detailCode: session.sizingDecision,
    }));

    state = engine.inviteSession(state, clock);
    journal.append(auditEvent('session_invited', clock, { sessionIndex: session.sessionIndex }));

    // Framing is the one place a model may speak, and it never touches an item.
    journal.append(auditEvent('frame_presented', clock, {
      sessionIndex: session.sessionIndex,
      frameTemplateId: 'FRAME_OPEN_03',
      frameDigest: 'frame-digest-open-03',
      llmInvolved: true,
    }));

    state = engine.openSession(state, clock);
    journal.append(auditEvent('session_opened', clock, { sessionIndex: session.sessionIndex }));

    for (;;) {
      session = state.sessions[state.sessions.length - 1];

      while (state.cursor <= session.endPosition) {
        // One mid-session pause, at most, and only where the profile pauses.
        if (
          session.midSessionPauseCount === 0
          && rng() < profile.midPauseChance
          && state.cursor > session.startPosition
        ) {
          state = engine.pauseMidSession(state, clock);
          journal.append(auditEvent('mid_session_pause', clock, {
            sessionIndex: session.sessionIndex,
          }));
          clock += Math.round((5 + rng() * 40) * 60_000);
          state = engine.resumeSession(state, clock);
          journal.append(auditEvent('session_resumed', clock, {
            sessionIndex: session.sessionIndex,
          }));
          session = state.sessions[state.sessions.length - 1];
        }

        const reference = engine.nextItemReference(state);
        const renderDigest = digestOf.get(reference.itemKey);
        journal.append(itemPresentedEvent(
          clock,
          session.sessionIndex,
          reference.itemKey,
          renderDigest,
          reference.sectionKey,
        ));

        const latency = Math.round(profile.latencyMs(rng));
        clock += Math.round(profile.stepMs(rng));

        const positionInSession = state.cursor - session.startPosition + 1;
        const raw = latentValue(ownerTrait, reference.canonicalPosition, rng)
          + positionBias(options.injectPositionEffect, positionInSession, session.plannedItemCount);

        state = engine.recordAnswer(state, {
          itemKey: reference.itemKey,
          status: 'answered',
          value: toScale(raw),
          latencyMs: latency,
          now: clock,
        });
        journal.append(itemAnsweredEvent(
          session.sessionIndex,
          state.responses[state.responses.length - 1],
        ));

        if (stopAfterItems !== null && state.responses.length >= stopAfterItems) {
          abandoned = true;
          break;
        }
      }

      if (abandoned) break;

      const offer = engine.continuationOffer(state);
      journal.append(auditEvent('continue_offered', clock, {
        sessionIndex: session.sessionIndex,
        detailCode: offer.available ? 'available' : offer.reason.replace(/\s+/g, '_'),
      }));
      if (!offer.available || !profile.chains()) {
        journal.append(auditEvent('continue_declined', clock, {
          sessionIndex: session.sessionIndex,
        }));
        break;
      }
      state = engine.acceptContinuation(state, profile.signals, clock);
      journal.append(auditEvent('continue_accepted', clock, {
        sessionIndex: session.sessionIndex,
      }));
    }

    if (abandoned) {
      state = engine.abandon(state, clock);
      journal.append(auditEvent('assessment_invalidated', clock, { detailCode: 'abandoned' }));
      break;
    }

    state = engine.closeSession(state, clock);
    journal.append(auditEvent('session_closed', clock, {
      sessionIndex: state.sessions[state.sessions.length - 1].sessionIndex,
    }));
    clock += Math.round(profile.gapHours(rng) * HOUR);
  }

  const reverseScored = engine.reverseScoredKeys(structure);
  let gate = null;

  if (state.lifecycleState === 'complete') {
    gate = engine.scoringGate(state, reverseScored, clock);
    journal.append(auditEvent('assessment_completed', clock));
    if (gate.allowed) {
      state = engine.markScored(state, clock);
      journal.append(auditEvent('scored', clock, { detailCode: gate.status }));
    }
  }

  return {
    ownerIndex,
    profileName,
    state,
    journal,
    gate,
    shape: engine.administrationShape(state),
  };
}

// ── Run ─────────────────────────────────────────────────────────────

const rng = makeRng(options.seed);
const runs = [];

for (let ownerIndex = 0; ownerIndex < options.owners; ownerIndex += 1) {
  runs.push(simulateOwner(ownerIndex, pickProfile(rng), rng));
}

// ── Invariants across the whole run ─────────────────────────────────

const violations = [];
let orderReference = null;

for (const run of runs) {
  const entries = run.journal.entries();
  const report = fidelityReport(entries);

  if (report.chain.status !== 'VALID') {
    violations.push(
      `owner ${run.ownerIndex}: audit chain ${report.chain.reason} at index ${report.chain.firstBrokenIndex}`,
    );
  }
  if (report.itemPresentationsProven !== report.itemsPresented) {
    violations.push(
      `owner ${run.ownerIndex}: ${report.itemsPresented - report.itemPresentationsProven} unproven presentations`,
    );
  }
  for (const eventType of report.llmInvolvedEventTypes) {
    if (eventType !== 'frame_presented') {
      violations.push(`owner ${run.ownerIndex}: a model was in the loop on '${eventType}'`);
    }
  }

  // The order must be identical for everyone. This is the invariance the whole
  // sequential design rests on, checked across every simulated respondent rather
  // than asserted once.
  const order = run.state.responses.map((response) => response.itemKey).join(',');
  if (orderReference === null) {
    orderReference = order;
  } else if (!orderReference.startsWith(order) && !order.startsWith(orderReference)) {
    violations.push(`owner ${run.ownerIndex}: item order diverged from the canonical sequence`);
  }
}

const canonicalOrder = plan.orderedItemKeys.join(',');
if (orderReference !== null && !canonicalOrder.startsWith(orderReference)) {
  violations.push('the observed order is not a prefix of the canonical order');
}

// ── Output ──────────────────────────────────────────────────────────

const outDir = resolve(root, options.out);
mkdirSync(outDir, { recursive: true });

function csv(rows) {
  return `${rows.map((row) => row.join(',')).join('\n')}\n`;
}

const administrationRows = [[
  'owner_index', 'profile', 'lifecycle_state', 'session_count', 'span_hours',
  'longest_gap_hours', 'responses', 'effective_status', 'scoring_allowed',
  'scoring_refusal_reasons', 'chain_status', 'audit_events',
]];

for (const run of runs) {
  const report = fidelityReport(run.journal.entries());
  administrationRows.push([
    run.ownerIndex,
    run.profileName,
    run.state.lifecycleState,
    run.shape.sessionCount,
    run.shape.spanHours.toFixed(3),
    run.shape.longestGapHours.toFixed(3),
    run.state.responses.length,
    run.state.effectiveScientificUseStatus ?? '',
    run.gate === null ? '' : String(run.gate.allowed),
    run.gate === null ? '' : `"${run.gate.reasons.join('; ')}"`,
    report.chain.status,
    run.journal.length,
  ]);
}

const responseRows = [[
  'owner_index', 'profile', 'item_key', 'canonical_position', 'value',
  'latency_ms', 'session_index', 'session_item_count', 'position_in_session',
  'items_since_resume', 'hours_since_previous_item', 'crossed_section_boundary',
  'is_first_item_after_pause',
]];

for (const run of runs) {
  const covariates = segmentationTable(run.journal.entries());

  // Which session each answered item belonged to, and how long that session was.
  // The injected effect is defined across a full session, so an estimator cannot
  // normalise it without the session's length. Exporting the position without the
  // length would make the covariate table look complete while being unusable.
  const sessionOfPosition = [];
  for (const session of run.state.sessions) {
    for (let position = session.startPosition; position <= session.endPosition; position += 1) {
      sessionOfPosition[position] = session;
    }
  }

  for (const [index, response] of run.state.responses.entries()) {
    const row = covariates[index];
    const session = sessionOfPosition[index + 1];
    responseRows.push([
      run.ownerIndex,
      run.profileName,
      response.itemKey,
      index + 1,
      response.value ?? '',
      response.latencyMs ?? '',
      session?.sessionIndex ?? '',
      session?.plannedItemCount ?? '',
      row?.positionInSession ?? '',
      row?.itemsSinceResume ?? '',
      row?.hoursSincePreviousItem === null || row?.hoursSincePreviousItem === undefined
        ? ''
        : row.hoursSincePreviousItem.toFixed(6),
      row?.crossedSectionBoundary ?? '',
      row?.isFirstItemAfterPause ?? '',
    ]);
  }
}

/**
 * How many items were observed at more than one within-session position.
 *
 * This is the identifiability diagnostic, and it carries the argument. When every
 * respondent has the same session layout, position within a session is a
 * deterministic function of the item, the two are perfectly confounded, and no
 * amount of data can separate them. It is the variation in segmentation — adaptive
 * sizing and free chaining — that makes a position effect measurable at all.
 */
function positionIdentifiability() {
  const positionsPerItem = new Map();
  for (const run of runs) {
    for (const row of segmentationTable(run.journal.entries())) {
      const seen = positionsPerItem.get(row.itemKey) ?? new Set();
      seen.add(row.positionInSession);
      positionsPerItem.set(row.itemKey, seen);
    }
  }
  const identifiable = [...positionsPerItem.values()].filter((seen) => seen.size >= 2).length;
  return {
    itemsObserved: positionsPerItem.size,
    itemsIdentifiable: identifiable,
    note:
      identifiable === 0
        ? 'No item was observed at two different within-session positions: a position '
          + 'effect is NOT identifiable from this run. Mix respondent profiles, or vary '
          + 'session sizing, before drawing any conclusion.'
        : 'Items observed at two or more within-session positions allow position to be '
          + 'separated from item identity.',
  };
}

writeFileSync(resolve(outDir, 'administrations.csv'), csv(administrationRows), 'utf8');
writeFileSync(resolve(outDir, 'responses.csv'), csv(responseRows), 'utf8');

const byProfile = {};
const byStatus = {};
const byLifecycle = {};
for (const run of runs) {
  byProfile[run.profileName] = (byProfile[run.profileName] ?? 0) + 1;
  byLifecycle[run.state.lifecycleState] = (byLifecycle[run.state.lifecycleState] ?? 0) + 1;
  const status = run.state.effectiveScientificUseStatus ?? 'not_scored';
  byStatus[status] = (byStatus[status] ?? 0) + 1;
}

const sessionCounts = runs.map((run) => run.shape.sessionCount).sort((a, b) => a - b);
const median = sessionCounts[Math.floor(sessionCounts.length / 2)];

const summary = {
  generatedBy: 'scripts/instruments/simulate-administration.mjs',
  status: 'DEMO_SIMULATION_NOT_A_VALIDATED_INSTRUMENT',
  notice:
    'Synthetic data over a fictional instrument. It demonstrates the administration '
    + 'mechanism and the segmentation covariate apparatus; it establishes nothing '
    + 'about the instrument, about dogs, or about the absence of a position effect.',
  options,
  instrument: {
    versionRef: structure.versionRef,
    licenseStatus: structure.licenseStatus,
    translationStatus: structure.translationStatus,
    expectedItemCount: structure.expectedItemCount,
    breakpointSetVersion: structure.breakpointSetVersion,
  },
  cutPoints: (() => {
    const usable = new Set();
    for (const breakpoint of structure.breakpoints) {
      if (['licensed', 'emopet_approved'].includes(breakpoint.authority)) usable.add(breakpoint.afterPosition);
      else if (breakpoint.breakpointKind === 'section_boundary') usable.add(breakpoint.afterPosition);
    }
    return {
      declared: structure.breakpoints.length,
      usable: [...usable].sort((a, b) => a - b),
      note:
        'An intra-section cut point that EMOPET merely proposed is not usable '
        + 'authority, so the engine falls back to section boundaries. That visibly '
        + 'changes session length.',
    };
  })(),
  results: {
    administrations: runs.length,
    byProfile,
    byLifecycle,
    byEffectiveStatus: byStatus,
    medianSessionCount: median,
    totalAuditEvents: runs.reduce((sum, run) => sum + run.journal.length, 0),
    totalResponses: runs.reduce((sum, run) => sum + run.state.responses.length, 0),
  },
  positionIdentifiability: positionIdentifiability(),
  invariants: {
    everyChainVerifies: violations.filter((v) => v.includes('audit chain')).length === 0,
    everyPresentationProven: violations.filter((v) => v.includes('unproven')).length === 0,
    modelOnlyInFraming: violations.filter((v) => v.includes('model was in the loop')).length === 0,
    orderIdenticalForEveryRespondent: violations.filter((v) => v.includes('order')).length === 0,
    violations,
  },
};

writeFileSync(resolve(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

// ── Report ──────────────────────────────────────────────────────────

console.log(`Simulated ${runs.length} administrations of ${structure.versionRef}`);
console.log(`  seed ${options.seed}, profile ${options.profile}, ceiling ${options.ceiling}`);
console.log(`  injected position effect: ${options.injectPositionEffect} scale points per session`);
console.log(`  usable cut points: [${summary.cutPoints.usable.join(', ')}] of ${summary.cutPoints.declared} declared`);
console.log(`  profiles: ${JSON.stringify(byProfile)}`);
console.log(`  lifecycle: ${JSON.stringify(byLifecycle)}`);
console.log(`  effective status: ${JSON.stringify(byStatus)}`);
console.log(`  audit events: ${summary.results.totalAuditEvents}, responses: ${summary.results.totalResponses}`);
console.log(
  `  position identifiability: ${summary.positionIdentifiability.itemsIdentifiable}`
    + `/${summary.positionIdentifiability.itemsObserved} items seen at 2+ within-session positions`,
);
console.log('Invariants:');
for (const [name, value] of Object.entries(summary.invariants)) {
  if (name === 'violations') continue;
  console.log(`  ${value ? 'ok  ' : 'FAIL'} ${name}`);
}
console.log(`Written to ${resolve(outDir)}`);

if (violations.length > 0) {
  console.error(`\n${violations.length} invariant violation(s):`);
  for (const violation of violations.slice(0, 20)) console.error(`  ${violation}`);
  process.exit(1);
}
