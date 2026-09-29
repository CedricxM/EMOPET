#!/usr/bin/env node

/**
 * Measure whether an answer depends on where its item fell inside a session.
 *
 * This is the instrument that answers the question an instrument owner will
 * reasonably ask about sequential administration: if respondents are cut in
 * different places, does that change their answers?
 *
 * The honest claim it supports is NOT "our administration has no position
 * effect". Synthetic data cannot establish the absence of an effect. What it can
 * establish is that the detector finds an effect that is really there, and reports
 * none when there is none — so that the same detector, pointed at licensed data,
 * produces a result worth believing either way.
 *
 * Three passes:
 *   A — power        inject a known effect, recover it, interval excluding zero
 *   B — specificity  inject nothing, recover nothing, interval containing zero
 *   C — sensitivity  sweep effect size against sample size to find the
 *                    detectability threshold, which answers "how many
 *                    administrations do you need before you can say anything?"
 *
 * Usage:
 *   node scripts/instruments/analyse-segmentation-effect.mjs --seed 11
 *   node scripts/instruments/analyse-segmentation-effect.mjs --quick
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('.');
const harness = resolve(root, 'scripts', 'instruments', 'simulate-administration.mjs');

// ── CLI ─────────────────────────────────────────────────────────────

const options = {
  seed: 11,
  out: '.data/demo-p',
  powerDelta: 0.4,
  sensitivityDeltas: [0.1, 0.2, 0.3],
  sensitivityOwners: [100, 200, 400, 800],
  quick: false,
};

for (let index = 2; index < process.argv.length; index += 1) {
  const flag = process.argv[index];
  const value = process.argv[index + 1];
  if (flag === '--') continue;
  switch (flag) {
    case '--seed': options.seed = Number.parseInt(value, 10); index += 1; break;
    case '--out': options.out = value; index += 1; break;
    case '--power-delta': options.powerDelta = Number.parseFloat(value); index += 1; break;
    case '--quick':
      options.quick = true;
      options.sensitivityDeltas = [0.2];
      options.sensitivityOwners = [100, 400];
      break;
    case '--help':
      console.log('Options: --seed N --out DIR --power-delta D --quick');
      process.exit(0);
      break;
    default:
      if (flag.startsWith('--')) {
        console.error(`Unknown option ${flag}`);
        process.exit(2);
      }
  }
}

// ── Running the harness ─────────────────────────────────────────────

function runHarness(delta, owners, seed) {
  const cell = resolve(root, options.out, `cell-d${delta}-n${owners}-s${seed}`);
  const responses = resolve(cell, 'responses.csv');
  if (!existsSync(responses)) {
    execFileSync(
      process.execPath,
      [
        harness,
        '--owners', String(owners),
        '--profile', 'mixed',
        '--seed', String(seed),
        '--inject-position-effect', String(delta),
        '--out', cell,
      ],
      { cwd: root, stdio: 'pipe' },
    );
  }
  return { responses, summary: resolve(cell, 'summary.json') };
}

function loadRows(path) {
  const lines = readFileSync(path, 'utf8').trim().split('\n');
  const header = lines[0].split(',');
  const index = Object.fromEntries(header.map((name, position) => [name, position]));
  const rows = [];

  for (const line of lines.slice(1)) {
    const cells = line.split(',');
    const sessionItemCount = Number.parseInt(cells[index['session_item_count']], 10);
    const positionInSession = Number.parseInt(cells[index['position_in_session']], 10);
    const value = Number.parseFloat(cells[index['value']]);
    if (!Number.isFinite(sessionItemCount) || !Number.isFinite(positionInSession)) continue;
    if (!Number.isFinite(value)) continue;
    // A one-item session carries no within-session position information.
    if (sessionItemCount < 2) continue;

    rows.push({
      owner: cells[index['owner_index']],
      item: cells[index['item_key']],
      value,
      // Normalised position: 0 at the first item of a session, 1 at the last.
      // Normalising by the session's own length is what makes the coefficient
      // comparable when session lengths differ, which they do as soon as sizing
      // adapts and respondents chain.
      u: (positionInSession - 1) / (sessionItemCount - 1),
    });
  }
  return rows;
}

// ── Estimator ───────────────────────────────────────────────────────

/**
 * Two-way fixed effects for item and respondent, by iterative demeaning.
 *
 * Controlling for the item is not optional. Items differ in how they are
 * answered, and in an administration with a fixed order the item and its position
 * are correlated, so a raw comparison of first-item against last-item answers
 * measures mostly which items those are. Demeaning by item and by respondent
 * removes both, leaving the within-item, within-respondent relationship between
 * position and answer — which is the only thing that can be called a position
 * effect.
 *
 * Alternating projections converge for two-way fixed effects and give exactly the
 * least-squares estimate, with no dependency and no matrix inversion.
 */
function demean(rows, maxIterations = 200, tolerance = 1e-10) {
  const y = rows.map((row) => row.value);
  const x = rows.map((row) => row.u);

  const groupsOf = (key) => {
    const map = new Map();
    for (const [position, row] of rows.entries()) {
      const bucket = map.get(row[key]) ?? [];
      bucket.push(position);
      map.set(row[key], bucket);
    }
    return [...map.values()];
  };

  const itemGroups = groupsOf('item');
  const ownerGroups = groupsOf('owner');

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let maxShift = 0;
    for (const groups of [itemGroups, ownerGroups]) {
      for (const indices of groups) {
        let sumY = 0;
        let sumX = 0;
        for (const position of indices) {
          sumY += y[position];
          sumX += x[position];
        }
        const meanY = sumY / indices.length;
        const meanX = sumX / indices.length;
        for (const position of indices) {
          y[position] -= meanY;
          x[position] -= meanX;
        }
        maxShift = Math.max(maxShift, Math.abs(meanY), Math.abs(meanX));
      }
    }
    if (maxShift < tolerance) break;
  }

  return { y, x, itemCount: itemGroups.length, ownerCount: ownerGroups.length };
}

/**
 * How many items were observed at two or more distinct normalised positions.
 *
 * Zero means the effect is not identifiable and no estimate should be reported:
 * with one session layout for everyone, position is a deterministic function of
 * the item and the two cannot be separated at all.
 */
function identifiableItems(rows) {
  const positionsPerItem = new Map();
  for (const row of rows) {
    const seen = positionsPerItem.get(row.item) ?? new Set();
    seen.add(row.u.toFixed(6));
    positionsPerItem.set(row.item, seen);
  }
  return {
    observed: positionsPerItem.size,
    identifiable: [...positionsPerItem.values()].filter((seen) => seen.size >= 2).length,
  };
}

function estimate(rows) {
  const identifiability = identifiableItems(rows);
  if (identifiability.identifiable === 0) {
    return {
      identifiable: false,
      identifiability,
      note:
        'Not identifiable: no item was observed at two different within-session '
        + 'positions, so position cannot be separated from item identity. No estimate '
        + 'is reported, because any number here would be an artefact.',
    };
  }

  const { y, x, itemCount, ownerCount } = demean(rows);

  let sxx = 0;
  let sxy = 0;
  for (let index = 0; index < x.length; index += 1) {
    sxx += x[index] * x[index];
    sxy += x[index] * y[index];
  }
  if (sxx <= 0) {
    return { identifiable: false, identifiability, note: 'No within-group variation in position.' };
  }

  const delta = sxy / sxx;
  const residuals = y.map((value, index) => value - delta * x[index]);

  // Errors are clustered by respondent: answers from one respondent are not
  // independent, and treating them as if they were would shrink the interval and
  // manufacture significance.
  const byOwner = new Map();
  for (const [index, row] of rows.entries()) {
    const bucket = byOwner.get(row.owner) ?? [];
    bucket.push(index);
    byOwner.set(row.owner, bucket);
  }

  let meat = 0;
  for (const indices of byOwner.values()) {
    let score = 0;
    for (const index of indices) score += x[index] * residuals[index];
    meat += score * score;
  }

  const clusters = byOwner.size;
  const observations = rows.length;
  const parameters = 1 + itemCount + ownerCount - 1;
  const correction =
    (clusters / Math.max(1, clusters - 1))
    * ((observations - 1) / Math.max(1, observations - parameters));
  const variance = (meat / (sxx * sxx)) * correction;
  const standardError = Math.sqrt(Math.max(0, variance));

  const z = 1.959964;
  const low = delta - z * standardError;
  const high = delta + z * standardError;

  return {
    identifiable: true,
    identifiability,
    delta,
    standardError,
    confidenceInterval: [low, high],
    excludesZero: low > 0 || high < 0,
    observations,
    clusters,
    itemCount,
    tStatistic: standardError > 0 ? delta / standardError : null,
  };
}

// ── Passes ──────────────────────────────────────────────────────────

const outDir = resolve(root, options.out);
mkdirSync(outDir, { recursive: true });

function analyse(delta, owners, seed) {
  const paths = runHarness(delta, owners, seed);
  const rows = loadRows(paths.responses);
  const summary = JSON.parse(readFileSync(paths.summary, 'utf8'));
  return { injected: delta, owners, seed, result: estimate(rows), harnessSummary: summary };
}

function fmt(value, digits = 3) {
  return value === null || value === undefined ? '    —' : value.toFixed(digits).padStart(6);
}

function describe(cell) {
  const r = cell.result;
  if (!r.identifiable) return `not identifiable (${r.identifiability.identifiable}/${r.identifiability.observed})`;
  return `${fmt(r.delta)}  [${fmt(r.confidenceInterval[0])}, ${fmt(r.confidenceInterval[1])}]  `
    + `${r.excludesZero ? 'detected    ' : 'not detected'}  n=${r.clusters}`;
}

console.log('Segmentation effect detector — DEMO instrument, synthetic data\n');

// Pass A — power. An effect that is really there must be found.
const passA = analyse(options.powerDelta, options.quick ? 400 : 800, options.seed);
console.log('Pass A — power');
console.log(`  injected ${options.powerDelta.toFixed(2)}  ->  ${describe(passA)}`);

// Pass B — specificity. Nothing injected, nothing must be found.
const passB = analyse(0, options.quick ? 400 : 800, options.seed);
console.log('\nPass B — specificity');
console.log(`  injected 0.00  ->  ${describe(passB)}`);

// Pass C — sensitivity. Where does detectability begin, by effect and by volume?
console.log('\nPass C — sensitivity (detected / not detected by respondent count)');
const header = ['delta', ...options.sensitivityOwners.map((n) => String(n).padStart(12))].join(' | ');
console.log(`  ${header}`);
console.log(`  ${'-'.repeat(header.length)}`);

const passC = [];
for (const delta of options.sensitivityDeltas) {
  const cells = [];
  const rendered = [];
  for (const owners of options.sensitivityOwners) {
    const cell = analyse(delta, owners, options.seed);
    cells.push(cell);
    rendered.push(
      (cell.result.identifiable
        ? (cell.result.excludesZero ? `yes ${fmt(cell.result.delta, 2)}` : `no  ${fmt(cell.result.delta, 2)}`)
        : 'unidentified'
      ).padStart(12),
    );
  }
  passC.push({ delta, cells });
  console.log(`  ${delta.toFixed(2)}  | ${rendered.join(' | ')}`);
}

// Identifiability guard, demonstrated rather than asserted.
const singleProfile = (() => {
  const cell = resolve(root, options.out, 'cell-single-profile');
  if (!existsSync(resolve(cell, 'responses.csv'))) {
    execFileSync(
      process.execPath,
      [harness, '--owners', '100', '--profile', 'grazer', '--seed', String(options.seed),
        '--inject-position-effect', String(options.powerDelta), '--out', cell],
      { cwd: root, stdio: 'pipe' },
    );
  }
  return estimate(loadRows(resolve(cell, 'responses.csv')));
})();

console.log('\nIdentifiability guard — one profile for everyone, same injected effect');
console.log(`  ${singleProfile.identifiable ? 'estimate reported' : 'refused'}: `
  + `${singleProfile.identifiability.identifiable}/${singleProfile.identifiability.observed} items identifiable`);

// ── Attenuation ─────────────────────────────────────────────────────

/**
 * How much the estimate understates the injected effect.
 *
 * The injected bias is continuous, but an answer is an integer on a five-point
 * scale, and answers already at the top cannot rise. Rounding and clamping both
 * push the estimate toward zero, so the coefficient recovered here is
 * systematically smaller than the latent effect that produced it.
 *
 * This matters twice. The point estimate must not be read as the true latent
 * effect. And the bias runs in the safe direction: the detector understates rather
 * than overstates, so an effect it reports as present is at least that large.
 */
const largestVolume = options.sensitivityOwners[options.sensitivityOwners.length - 1];
const doseResponse = [
  ...passC
    .map(({ delta, cells }) => {
      const cell = cells.find((candidate) => candidate.owners === largestVolume);
      return cell && cell.result.identifiable
        ? { injected: delta, estimated: cell.result.delta }
        : null;
    })
    .filter((pair) => pair !== null),
  ...(passA.result.identifiable
    ? [{ injected: options.powerDelta, estimated: passA.result.delta }]
    : []),
].sort((a, b) => a.injected - b.injected);

const attenuation = {
  measuredAtRespondents: largestVolume,
  doseResponse,
  ratios: doseResponse.map((pair) => ({
    injected: pair.injected,
    estimated: pair.estimated,
    ratio: pair.injected === 0 ? null : pair.estimated / pair.injected,
  })),
  cause:
    'Answers are integers on a five-point scale and are clamped at both ends, so '
    + 'rounding and clamping attenuate a continuous latent shift. The estimate is a '
    + 'lower bound on the latent effect, not an estimate of it.',
};

console.log('\nAttenuation (estimate vs injected, at the largest volume)');
for (const entry of attenuation.ratios) {
  console.log(
    `  injected ${entry.injected.toFixed(2)}  ->  estimated ${fmt(entry.estimated)}`
      + `  (${entry.ratio === null ? '—' : `${(entry.ratio * 100).toFixed(0)}% recovered`})`,
  );
}
console.log('  The estimate is a lower bound: the detector understates, it does not overstate.');

// ── Verdict ─────────────────────────────────────────────────────────

const checks = {
  powerFindsInjectedEffect: passA.result.identifiable === true && passA.result.excludesZero === true,
  powerEstimateHasRightSign: passA.result.identifiable === true && passA.result.delta > 0,
  specificityFindsNothing: passB.result.identifiable === true && passB.result.excludesZero === false,
  sensitivityIsMonotonicInVolume: passC.every(({ cells }) => {
    const detected = cells.map((cell) => cell.result.identifiable && cell.result.excludesZero);
    // Once detectable at some volume, it must stay detectable at larger volumes.
    const firstTrue = detected.indexOf(true);
    return firstTrue === -1 || detected.slice(firstTrue).every(Boolean);
  }),
  refusesWhenNotIdentifiable: singleProfile.identifiable === false,
  // A larger injected effect must produce a larger estimate. This is a stronger
  // validation than the detection flags alone: it shows the detector tracks the
  // effect size rather than merely firing above some threshold.
  doseResponseIsMonotonic: doseResponse.every(
    (pair, index) => index === 0 || pair.estimated >= doseResponse[index - 1].estimated,
  ),
};

const report = {
  generatedBy: 'scripts/instruments/analyse-segmentation-effect.mjs',
  status: 'DEMO_ANALYSIS_SYNTHETIC_DATA',
  notice:
    'Synthetic data over a fictional instrument. This demonstrates that the detector '
    + 'finds an effect that is present and reports none when it is absent. It says '
    + 'nothing about any real instrument, and it does not establish the absence of a '
    + 'position effect in real administrations.',
  estimand:
    'delta = shift in scale points between the first and the last item of a session, '
    + 'estimated with item and respondent fixed effects and standard errors clustered '
    + 'by respondent.',
  options,
  passA,
  passB,
  passC,
  identifiabilityGuard: singleProfile,
  attenuation,
  checks,
};

writeFileSync(
  resolve(outDir, 'segmentation-analysis.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8',
);

console.log('\nChecks:');
for (const [name, value] of Object.entries(checks)) {
  console.log(`  ${value ? 'ok  ' : 'FAIL'} ${name}`);
}
console.log(`\nWritten to ${resolve(outDir, 'segmentation-analysis.json')}`);

const failed = Object.entries(checks).filter(([, value]) => !value);
if (failed.length > 0) {
  console.error(`\n${failed.length} check(s) failed: ${failed.map(([name]) => name).join(', ')}`);
  process.exit(1);
}
