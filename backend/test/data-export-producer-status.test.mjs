/**
 * Portability export — honesty of the producer declaration.
 *
 * The export endpoint stamps `source: 'EMOPET_BACKEND'` on every envelope. It
 * already declares that raw high-rate MAT/TAG streams are not persisted. Producer availability is now level-specific: preprocessed summaries have a durable\n * writer, while ELI/baseline/device-metadata remain producer-limited. The route\n * must expose that distinction rather than assigning one empty-result meaning to all levels.
 *
 * These tests are source-level (no build, no database): they pin the shape of
 * the declaration, and they pin the evidence the declaration rests on.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const backendDir = join(here, '..');
const exportRoute = readFileSync(join(backendDir, 'api', 'routes', 'data-export.ts'), 'utf8');

/** Levels the envelope and /capabilities both have to speak about. */
const DECLARED_LEVELS = ['raw', 'preprocessed', 'inferred', 'device_metadata', 'baseline'];

/**
 * The `inferred` level is guarded structurally because it is structurally
 * producer-less: the canonical engine is wired to nothing (#118). The other
 * levels' statuses are dated observations — ingestion writers for them are in
 * flight on other slices, so a guard here would fail their work rather than
 * catch a defect. Their freshness is carried by producerStatusObservedAt.
 */
const STRUCTURALLY_PRODUCERLESS_TABLE = 'eliStates';

function collectTsSources(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'test') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectTsSources(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 1. The declaration exists and covers every level the export emits   */
/* ------------------------------------------------------------------ */

test('every publication level carries an explicit producer status', () => {
  const block = exportRoute.match(/EXPORT_LEVEL_PRODUCER_STATUS = \{([\s\S]*?)\} as const;/);
  assert.ok(block, 'EXPORT_LEVEL_PRODUCER_STATUS is missing from the export route');

  const missing = DECLARED_LEVELS.filter((level) => !new RegExp(`\\b${level}:`).test(block[1]));
  assert.deepEqual(missing, [], `levels without a declared producer status: ${missing.join(', ')}`);
});

test('the envelope and /capabilities both publish producer and level-specific empty-result status', () => {
  const producers = exportRoute.match(/levelProducerStatus: EXPORT_LEVEL_PRODUCER_STATUS/g) ?? [];
  assert.equal(producers.length, 2, 'producer status must be published on both the envelope and /capabilities');

  });

test('preprocessed emptiness is authoritative while producer-less levels remain explicit', () => {
  assert.match(exportRoute, /preprocessed: 'PERSISTING_WRITER_ACTIVE'/);
  assert.match(exportRoute, /preprocessed: 'AUTHORITATIVE_EMPTY_QUERY_RESULT'/);
  assert.match(exportRoute, /inferred: 'NO_CANONICAL_ELI_PRODUCER'/);
  assert.match(exportRoute, /inferred: 'NO_CANONICAL_PRODUCER'/);
});

/* ------------------------------------------------------------------ */
/* 2. The evidence the declaration rests on                            */
/* ------------------------------------------------------------------ */

test('preprocessed status is backed by the durable sensor-summary writer', () => {
  const sensorsRoute = readFileSync(join(backendDir, 'api', 'routes', 'sensors.ts'), 'utf8');
  assert.match(sensorsRoute, /\.insert\(sensorSummaries\)/);
  assert.match(exportRoute, /preprocessed: 'PERSISTING_WRITER_ACTIVE'/);
});

test('no backend module produces the inferred level', () => {
  // The observation that makes NO_CANONICAL_ELI_PRODUCER true. Production code
  // only, so a test fixture inserting rows is not mistaken for a producer.
  const sources = collectTsSources(join(backendDir, 'api')).concat(
    collectTsSources(join(backendDir, 'db')),
  );
  assert.ok(sources.length > 0, 'no backend sources collected — the guard would be vacuous');

  const writers = [];
  for (const file of sources) {
    const source = readFileSync(file, 'utf8');
    if (new RegExp(`insert\\(\\s*${STRUCTURALLY_PRODUCERLESS_TABLE}\\s*\\)`).test(source)) {
      writers.push(file.slice(backendDir.length + 1));
    }
  }

  assert.deepEqual(
    writers,
    [],
    `an ELI producer now exists (${writers.join(', ')}); update EXPORT_LEVEL_PRODUCER_STATUS in the same change`,
  );
});

test('the canonical ELI engine is still wired to no backend module', () => {
  // The dependency is declared, which is what makes the gap easy to miss.
  const manifest = JSON.parse(readFileSync(join(backendDir, 'package.json'), 'utf8'));
  assert.ok(
    '@emopet/eli-engine' in (manifest.dependencies ?? {}),
    'the engine dependency declaration is what this status is about',
  );

  const importers = collectTsSources(join(backendDir, 'api'))
    .filter((file) => /(?:from|require\()\s*'@emopet\/eli-engine'/.test(readFileSync(file, 'utf8')))
    .map((file) => file.slice(backendDir.length + 1));

  assert.deepEqual(
    importers,
    [],
    `the engine is now imported (${importers.join(', ')}); the inferred status must be revisited`,
  );
});

test('the export route still declares the raw-stream status it already had', () => {
  // Regression guard: the new declaration adds to the raw one, it does not replace it.
  assert.match(exportRoute, /rawDataStatus: 'NOT_PERSISTED_BY_CURRENT_BACKEND_SCHEMA'/);
  assert.match(exportRoute, /rawHighRateStreams: 'NOT_PERSISTED_BY_CURRENT_BACKEND_SCHEMA'/);
});

test('the producer status is dated and reads as an observation, not a decision', () => {
  // CLAUDE.md maturity separation: an observed state must not read as a decision,
  // and an undated status claim goes stale without anyone noticing.
  assert.match(exportRoute, /PRODUCER_STATUS_OBSERVED_AT = '\d{4}-\d{2}-\d{2}'/);
  assert.match(exportRoute, /observed runtime fact, not product or scientific release authority/);

  const dated = exportRoute.match(/producerStatusObservedAt: PRODUCER_STATUS_OBSERVED_AT/g) ?? [];
  assert.equal(dated.length, 2, 'the observation date must travel with the status on both surfaces');
  assert.ok(statSync(join(backendDir, 'api', 'routes', 'data-export.ts')).isFile());
});
