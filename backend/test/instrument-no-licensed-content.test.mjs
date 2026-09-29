import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * G8 — no licensed instrument content in the repository.
 *
 * The repository is public today and will become private, but its history stays
 * exposed either way, so a single commit carrying licensed wording cannot be taken
 * back. This test is the last line before that happens.
 *
 * It scans tracked files rather than the working tree, because what matters is
 * what git can carry. It is intended to be CI-blocking.
 */

const repoRoot = resolve(process.cwd(), '..');

function trackedFiles() {
  return execFileSync('git', ['ls-files'], { cwd: repoRoot, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter((path) => path.length > 0);
}

const tracked = trackedFiles();

/** Files that legitimately contain demo instrument strings. */
const CONTENT_BEARING = [
  'config/instruments/demo-instrument-v0.json',
  'backend/api/services/instrument-content-store.ts',
  'backend/test/instrument-content-store.test.mjs',
  'backend/test/instrument-no-licensed-content.test.mjs',
  'docs/research/cbarq-demo-p-spec.md',
];

test('G8 — every tracked item key is a demo key', () => {
  const offenders = [];

  for (const path of tracked) {
    if (path.startsWith('docs/')) continue; // prose may discuss key shapes
    let source;
    try {
      source = readFileSync(resolve(repoRoot, path), 'utf8');
    } catch {
      continue; // binary or unreadable: no wording to leak
    }
    for (const match of source.matchAll(/\b([A-Z][A-Z0-9]*)_ITEM_(\d+)\b/g)) {
      if (match[1] !== 'DEMO') offenders.push(`${path}: ${match[0]}`);
    }
    for (const match of source.matchAll(/\b([A-Z][A-Z0-9]*)_SECTION_([A-Z0-9]+)\b/g)) {
      if (match[1] !== 'DEMO') offenders.push(`${path}: ${match[0]}`);
    }
  }

  assert.deepEqual(offenders, [], `non-demo instrument keys are tracked:\n  ${offenders.join('\n  ')}`);
});

test('G8 — the only tracked instrument bundle is the demo fixture', () => {
  const bundles = tracked.filter((path) => path.startsWith('config/instruments/'));

  assert.deepEqual(bundles, ['config/instruments/demo-instrument-v0.json']);

  const bundle = JSON.parse(readFileSync(resolve(repoRoot, bundles[0]), 'utf8'));
  // A tracked bundle claiming any other licence status would mean licensed content
  // had been committed, whatever its items actually said.
  assert.equal(bundle.licenseStatus, 'demo_only');
  assert.equal(bundle.status, 'DEMO_FIXTURE_NOT_A_VALIDATED_INSTRUMENT');
});

test('G8 — every rendered string in the tracked bundle is visibly fake', () => {
  const bundle = JSON.parse(
    readFileSync(resolve(repoRoot, 'config/instruments/demo-instrument-v0.json'), 'utf8'),
  );

  const rendered = [
    ...bundle.items.map((item) => item.text),
    ...bundle.sections.map((section) => section.title),
    ...Object.values(bundle.scales).flatMap((scale) => scale.labels),
  ];

  assert.ok(rendered.length >= 24 + 3 + 5);
  for (const text of rendered) {
    assert.ok(text.startsWith('DEMO — '), `not visibly fake: ${text}`);
  }
});

test('G8 — no tracked file outside the fixture carries item wording', () => {
  // The demo item texts are distinctive enough to search for directly: if one
  // appeared somewhere unexpected, the same would happen to a licensed item.
  const bundle = JSON.parse(
    readFileSync(resolve(repoRoot, 'config/instruments/demo-instrument-v0.json'), 'utf8'),
  );
  const needles = bundle.items.slice(0, 6).map((item) => item.text);
  const offenders = [];

  for (const path of tracked) {
    if (CONTENT_BEARING.includes(path)) continue;
    let source;
    try {
      source = readFileSync(resolve(repoRoot, path), 'utf8');
    } catch {
      continue;
    }
    for (const needle of needles) {
      if (source.includes(needle)) offenders.push(`${path}: ${needle.slice(0, 40)}…`);
    }
  }

  assert.deepEqual(offenders, [], `item wording found outside the fixture:\n  ${offenders.join('\n  ')}`);
});

test('G8 — no scoring coefficients are tracked under a real instrument name', () => {
  const offenders = [];

  for (const path of tracked) {
    if (path.startsWith('docs/')) continue;
    let source;
    try {
      source = readFileSync(resolve(repoRoot, path), 'utf8');
    } catch {
      continue;
    }
    // A tracked scoring method must be visibly a demo one. Anything claiming to
    // score the licensed instrument would be a scoring rule we have no right to.
    for (const match of source.matchAll(/scoringMethod['"\s:=]+['"]([^'"]+)['"]/g)) {
      if (!/^DEMO_/.test(match[1])) offenders.push(`${path}: scoringMethod ${match[1]}`);
    }
  }

  assert.deepEqual(offenders, [], offenders.join('\n  '));
});

test('G8 — the CI database workflow watches the instrument paths', () => {
  const workflow = readFileSync(
    resolve(repoRoot, '.github', 'workflows', 'p0-db-baseline.yml'),
    'utf8',
  );

  // A file outside the workflow's path list runs no validation at all, which is
  // the quietest way for a guard to stop guarding.
  for (const path of [
    'backend/db/**',
    'backend/api/services/instrument-*.ts',
    'backend/test/instrument-*.test.mjs',
    'config/instruments/**',
    'config/privacy/**',
  ]) {
    assert.ok(workflow.includes(`- '${path}'`), `workflow does not watch ${path}`);
  }
});
