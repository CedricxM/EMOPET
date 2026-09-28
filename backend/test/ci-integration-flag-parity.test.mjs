import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Every integration test the workflow runs must receive the flag it reads.
 *
 * A database-backed test here gates itself on an environment flag and silently
 * skips when the flag is absent. That is the right behaviour locally, and a trap in
 * CI: a step that sets the wrong flag name goes green while its database half never
 * executes. The step's name still says it verified something, and nobody looks
 * again.
 *
 * That is exactly what happened to the erasure-topology parity step, which set
 * PRIVACY_ERASURE_TOPOLOGY_DB_INTEGRATION while the test read
 * PRIVACY_TOPOLOGY_DB_INTEGRATION. It reported success for as long as it existed
 * without ever querying a database.
 *
 * This test compares the two sides so the mistake cannot recur. It is also the
 * guard that no amount of care replaces: the failure mode is invisible by
 * construction, so only a mechanical check catches it.
 */

const workflowPath = resolve(process.cwd(), '..', '.github', 'workflows', 'p0-db-baseline.yml');
const workflow = readFileSync(workflowPath, 'utf8');
const testDir = resolve(process.cwd(), 'test');

/**
 * Matches a full integration flag name.
 *
 * The trailing group matters: without it, a pattern anchored only on
 * `_DB_INTEGRATION` captures a prefix of `EMOPET_DB_INTEGRATION_TEST` and invents
 * mismatches that do not exist. An earlier version of this scan did exactly that
 * and reported eleven defects where there was one.
 */
const FLAG = '[A-Z][A-Z0-9_]*_DB_INTEGRATION(?:_[A-Z]+)?';

const testFiles = readdirSync(testDir).filter((name) => name.endsWith('.test.mjs'));

/**
 * Expands a test reference from a workflow step into the files it actually runs.
 *
 * A step may name a file or a glob — `node --test test/professional-share-*.test.mjs` runs
 * five files. An earlier version of this scan matched literal names only, so it reported
 * those five as tests no CI step ran, and would have skipped their flag parity entirely.
 * A guard that invents defects is worse than none, so the glob is expanded here against
 * the directory rather than assumed away.
 */
function expand(reference) {
  if (!reference.includes('*')) return [reference];
  const pattern = new RegExp(`^${reference.split('*').map(escapeRegExp).join('[^/]*')}$`);
  return testFiles.filter((name) => pattern.test(name));
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Steps of the workflow, each with the flags it sets and the tests it runs. */
function workflowSteps() {
  return workflow
    .split('\n      - name: ')
    .slice(1)
    .map((block) => ({
      name: block.split('\n')[0].trim(),
      flags: new Set([...block.matchAll(new RegExp(`^\\s+(${FLAG}):`, 'gm'))].map((m) => m[1])),
      tests: [...new Set(
        [...block.matchAll(/test\/([a-z0-9.*\-]+\.test\.mjs)/g)].flatMap((m) => expand(m[1])),
      )],
    }))
    .filter((step) => step.tests.length > 0);
}

/** Flags a test file reads to decide whether to run against a database. */
function flagsReadBy(fileName) {
  const source = readFileSync(resolve(testDir, fileName), 'utf8');
  return new Set([
    ...[...source.matchAll(new RegExp(`process\\.env\\.(${FLAG})\\b`, 'g'))].map((m) => m[1]),
    ...[...source.matchAll(new RegExp(`process\\.env\\['(${FLAG})'\\]`, 'g'))].map((m) => m[1]),
  ]);
}

const steps = workflowSteps();

test('every CI step supplies the integration flag its tests actually read', () => {
  const mismatches = [];

  for (const step of steps) {
    for (const fileName of step.tests) {
      let read;
      try {
        read = flagsReadBy(fileName);
      } catch {
        continue; // the workflow may name a test that no longer exists
      }
      for (const flag of read) {
        if (!step.flags.has(flag)) {
          mismatches.push(
            `step "${step.name}" runs ${fileName}, which reads ${flag}, `
              + `but the step sets ${[...step.flags].join(', ') || 'no flag'}`,
          );
        }
      }
    }
  }

  assert.deepEqual(
    mismatches,
    [],
    'A step that sets the wrong flag name passes while its database half never runs:\n  '
      + mismatches.join('\n  '),
  );
});

test('every gated integration test is actually run by some CI step', () => {
  const runByCi = new Set(steps.flatMap((step) => step.tests));
  const orphans = [];

  for (const fileName of readdirSync(testDir)) {
    if (!fileName.endsWith('.test.mjs')) continue;
    if (flagsReadBy(fileName).size === 0) continue; // not database-gated
    if (!runByCi.has(fileName)) orphans.push(fileName);
  }

  // A database-gated test nobody runs is worse than no test: it looks like
  // coverage in the repository and verifies nothing anywhere.
  assert.deepEqual(orphans, [], `database-gated tests no CI step runs:\n  ${orphans.join('\n  ')}`);
});

test('the instrument guardrail tests are run by CI', () => {
  const runByCi = new Set(steps.flatMap((step) => step.tests));

  // These carry G8, G9, G10, G11 and G12. They need no database, so nothing gates
  // them and nothing would reveal their absence from the workflow.
  for (const fileName of [
    'instrument-content-store.test.mjs',
    'instrument-administration.test.mjs',
    'instrument-audit-journal.test.mjs',
    'instrument-sensor-embargo.test.mjs',
    'instrument-no-licensed-content.test.mjs',
    'instrument-guardrails.test.mjs',
    'instrument-database-guards.integration.test.mjs',
  ]) {
    assert.ok(runByCi.has(fileName), `no CI step runs ${fileName}`);
  }
});

test('this parity test is itself run by CI', () => {
  // Otherwise it would be one more guard nobody executes, which is the very defect
  // it exists to prevent.
  const runByCi = new Set(steps.flatMap((step) => step.tests));
  assert.ok(runByCi.has('ci-integration-flag-parity.test.mjs'));
});
