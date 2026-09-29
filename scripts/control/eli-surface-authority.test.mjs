import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const authority = JSON.parse(read('config/eli/surface-authority-v1.json'));

function directTsFiles(relDir) {
  return readdirSync(join(root, relDir), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => `${relDir}/${entry.name}`)
    .sort();
}

function collectTsSources(relDir) {
  const dir = join(root, relDir);
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__' || entry.name === 'test') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectTsSources(relative(root, full).split(sep).join('/')));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(relative(root, full).split(sep).join('/'));
    }
  }
  return out;
}

test('G1 authority classifies every retained direct ELI source surface', () => {
  assert.equal(authority.issue, 118);
  assert.match(authority.status, /G1_INVENTORY_CLASSIFIED_AND_GUARDED/);
  assert.match(authority.status, /LATENT_RUNTIME_NOT_ACTIVATED/);

  const classified = new Set(authority.surfaces.map((entry) => entry.path));
  const expectedDirect = [
    ...directTsFiles('apps/web/lib/eli'),
    ...directTsFiles('apps/web/lib/data/eli'),
    ...directTsFiles('backend/api/services/eli-runtime'),
  ];

  for (const path of expectedDirect) {
    if (path.startsWith('backend/api/services/eli-runtime/')) {
      assert.ok(
        authority.authorizedRuntimeImporters.some((entry) => entry.path === path),
        `unclassified backend ELI runtime source: ${path}`,
      );
    } else {
      assert.ok(classified.has(path), `unclassified ELI source surface: ${path}`);
    }
  }
});

test('canonical engine importers are bounded to the two reviewed backend slices', () => {
  const importers = [
    ...collectTsSources('backend/api'),
    ...collectTsSources('apps/web'),
    ...collectTsSources('apps/mobile/src'),
  ]
    .filter((path) => /(?:from\s+|import\s*\()\s*['"]@emopet\/eli-engine/.test(read(path)))
    .sort();

  const authorized = authority.authorizedRuntimeImporters
    .map((entry) => entry.path)
    .sort();

  assert.deepEqual(importers, authorized);
  assert.ok(authorized.every((path) => path.startsWith('backend/api/services/eli-runtime/')));
});

test('web catalog is explicitly UI-only and cannot masquerade as engine config', () => {
  const source = read('apps/web/lib/eli/catalog.ts');
  assert.match(source, /ELI_SURFACE_AUTHORITY: UI_CATALOG_ONLY/);
  assert.match(source, /NOT_RUNTIME_AUTHORITY/);
  assert.match(source, /NOT_SCIENCE_AUTHORITY/);
  assert.doesNotMatch(source, /from\s+['"]@emopet\/eli-engine['"]/);
});

test('legacy data/eli validation stays mock-only and science-gated', () => {
  const source = read('apps/web/lib/data/eli/eliValidation.ts');
  assert.match(source, /ELI_SURFACE_AUTHORITY: MOCK_VALIDATION_HELPER/);
  assert.match(source, /SCIENCE_GATED/);
  assert.match(source, /NOT_RUNTIME_AUTHORITY/);
  assert.match(source, /valid_for_mock_output/);
  assert.doesNotMatch(source, /valid_for_production|production_ready|scientifically_valid/i);
});

test('demo and unwired client surfaces remain visibly non-authoritative', () => {
  assert.match(read('apps/web/lib/eli/mock.ts'), /PROTOTYPE \/ DEMO ONLY/);

  const provenance = read('apps/web/lib/eli/mock-provenance.ts');
  assert.match(provenance, /DEMO_MOCK_ONLY/);
  assert.match(provenance, /authoritative:\s*false/);

  const mobile = read('apps/mobile/src/hooks/use-v6-insights.ts');
  assert.match(mobile, /status:\s*'UNWIRED'/);
  assert.match(mobile, /authoritative:\s*false/);
  assert.match(mobile, /endpoint:\s*null/);
});

test('no canonical latent eli_states writer appears while G6 remains open', () => {
  const sources = [...collectTsSources('backend/api'), ...collectTsSources('backend/db')];
  const writers = sources.filter((path) => /\.insert\(\s*eliStates\s*\)/.test(read(path)));
  assert.deepEqual(writers, []);
  assert.equal(authority.hardStops.eliStatesCanonicalWriterPresent, false);
  assert.equal(authority.hardStops.genericLatentRuntimeActivated, false);
});

test('authority paths exist and classifications do not imply scientific validity', () => {
  for (const entry of authority.surfaces) {
    assert.ok(statSync(join(root, entry.path)).isFile(), entry.path);
  }
  assert.ok(statSync(join(root, authority.canonicalEngine.path)).isDirectory());
  assert.equal(authority.hardStops.scienceValidityImpliedByClassification, false);
});
