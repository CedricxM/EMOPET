import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

/**
 * G9 — the sensor embargo, enforced on the import graph.
 *
 * The rule is that no MAT, TAG or ELI data may enter the decision to invite a
 * session, to size it, to place a cut, or to frame a section. That rule is not
 * broken by a faulty line of logic; it is broken by an `import` somebody adds one
 * day for convenience. A behavioural test can miss that. A reachability test on
 * the module graph cannot.
 *
 * This is the test to show an instrument owner for the embargo: it proves the
 * administration engine has no path to sensor or inference code at all, rather
 * than proving it currently chooses not to use one.
 */

const servicesDir = resolve(process.cwd(), 'api', 'services');
const backendRoot = resolve(process.cwd());

/** Modules that make up the administration engine. */
const ENGINE_ENTRY_POINTS = [
  'instrument-administration.ts',
  'instrument-breakpoints.ts',
  'instrument-session-sizing.ts',
  'instrument-validity.ts',
  'instrument-audit-journal.ts',
  'instrument-content-store.ts',
  'instrument-session-controls.ts',
];

/**
 * Anything that carries sensor, device or inference data.
 *
 * Both workspace packages and local modules, because a forbidden dependency could
 * arrive either way.
 */
const FORBIDDEN_MODULE_PATTERNS = [
  /@emopet\/eli-engine/,
  /@emopet\/ble-protocol/,
  /(^|\/)sensors?\b/i,
  /(^|\/)eli[-.]/i,
  /(^|\/)eli\b/i,
  /baseline/i,
  /presence/i,
  /weather/i,
  /(^|\/)devices?\b/i,
];

function readModule(path) {
  return readFileSync(path, 'utf8');
}

/** Import specifiers of one module, both static and dynamic. */
function importsOf(source) {
  const specifiers = new Set();
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      // `from` also appears inside template literals such as
      // `Cannot plan a session from '${state}'`. A module specifier has no
      // interpolation and no whitespace, which separates the two cleanly.
      if (/[\s`]/.test(specifier) || specifier.includes('${')) continue;
      specifiers.add(specifier);
    }
  }
  return [...specifiers];
}

/** Resolve a relative specifier to a TypeScript source file, if it is local. */
function resolveLocal(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = resolve(dirname(fromFile), specifier);
  for (const candidate of [
    base.replace(/\.js$/, '.ts'),
    `${base}.ts`,
    resolve(base, 'index.ts'),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** Every module reachable from the engine, with the path that led there. */
function reachableFromEngine() {
  const visited = new Map();
  const queue = ENGINE_ENTRY_POINTS.map((name) => ({
    file: resolve(servicesDir, name),
    trail: [name],
  }));

  const externals = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current.file)) continue;
    visited.set(current.file, current.trail);

    assert.ok(existsSync(current.file), `engine module missing: ${current.file}`);

    for (const specifier of importsOf(readModule(current.file))) {
      const local = resolveLocal(current.file, specifier);
      if (local === null) {
        externals.push({ specifier, trail: [...current.trail, specifier] });
        continue;
      }
      if (!visited.has(local)) {
        queue.push({ file: local, trail: [...current.trail, specifier] });
      }
    }
  }

  return { visited, externals };
}

const graph = reachableFromEngine();

test('G9 — the administration engine has no path to sensor or inference code', () => {
  const offences = [];

  for (const [file, trail] of graph.visited) {
    const relative = file.slice(backendRoot.length + 1);
    // The engine's own modules are named instrument-*; skip those, and judge
    // everything else they pull in.
    if (/^api\/services\/instrument-/.test(relative)) continue;
    for (const pattern of FORBIDDEN_MODULE_PATTERNS) {
      if (pattern.test(relative)) {
        offences.push(`${relative} reachable via ${trail.join(' -> ')}`);
      }
    }
  }

  for (const external of graph.externals) {
    for (const pattern of FORBIDDEN_MODULE_PATTERNS) {
      if (pattern.test(external.specifier)) {
        offences.push(`${external.specifier} imported via ${external.trail.join(' -> ')}`);
      }
    }
  }

  assert.deepEqual(
    offences,
    [],
    `The sensor embargo is an architectural rule: the administration engine must not be able\n`
      + `to reach sensor, device or inference code at all. Offending paths:\n  ${offences.join('\n  ')}`,
  );
});

test('G9 — the engine reaches only a short, reviewable set of dependencies', () => {
  const external = [...new Set(graph.externals.map((entry) => entry.specifier))].sort();

  // Pinned deliberately. A new entry here is a decision that deserves a reader,
  // not something that slips in with a feature.
  assert.deepEqual(external, [
    '@emopet/shared',
    'node:crypto',
    'node:fs/promises',
    'node:path',
  ]);

  const local = [...graph.visited.keys()]
    .map((file) => file.slice(backendRoot.length + 1).replaceAll('\\', '/'))
    .sort();
  for (const module of local) {
    assert.match(
      module,
      /^api\/services\/instrument-/,
      `the engine should only reach its own modules locally, found ${module}`,
    );
  }
});

test('G9 — no engine module mentions a sensor field, even in a string', () => {
  // A field name reaching the engine as a string would sidestep the import graph.
  for (const name of ENGINE_ENTRY_POINTS) {
    const source = readModule(resolve(servicesDir, name));
    // Sizing names the forbidden namespaces on purpose, to reject them by name.
    const isRejectionSite = name === 'instrument-session-sizing.ts';
    // Matches both a full field path ('sensor.restQuality') and a bare namespace
    // prefix ('sensor.'), which is the form the rejection site uses.
    const matches = [...source.matchAll(/['"`](sensor|computed|eli|mat|tag)\./g)];
    if (isRejectionSite) {
      assert.ok(matches.length > 0, 'sizing must name the forbidden namespaces to reject them');
      continue;
    }
    assert.deepEqual(
      matches.map((match) => match[0]),
      [],
      `${name} references a sensor-shaped field path`,
    );
  }
});

test('G9 — sizing rejects forbidden namespaces by name, not by omission', async () => {
  const sizing = await import('../dist/api/services/instrument-session-sizing.js');
  const allowed = ['median_session_duration', 'completion_rate', 'pause_frequency'];

  for (const forbidden of [
    'sensor.restQuality', 'computed.arousal', 'eli.confidence', 'mat.presence', 'tag.steps',
  ]) {
    assert.throws(
      () => sizing.assertSignalsAllowed({ [forbidden]: 1 }, allowed),
      /sensor or inference data/,
      forbidden,
    );
  }

  // And an ordinary unknown key fails too, so the rejection is not limited to the
  // namespaces we happened to think of.
  assert.throws(
    () => sizing.assertSignalsAllowed({ moon_phase: 1 }, allowed),
    /not in the closed list/,
  );
});
