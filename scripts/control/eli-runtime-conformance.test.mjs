import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('ELI conformance harness is explicitly synthetic and non-activating', async () => {
  const cfg = JSON.parse(await readFile(path.join(root, 'config/eli/runtime-conformance-v1.json'), 'utf8'));
  assert.equal(cfg.status, 'CONFORMANCE_HARNESS_ONLY / NOT_RUNTIME_ACTIVATION');
  assert.equal(cfg.inputAuthority, 'SYNTHETIC_OR_TEST_INJECTED_ONLY');
  assert.equal(cfg.firstFeature.transportStatus, 'BLE_V1_DOES_NOT_CARRY_FEATURE');
  assert.equal(cfg.forbidden.liveFeatureIngestion, true);
  assert.equal(cfg.forbidden.persistenceWrite, true);
  assert.equal(cfg.forbidden.apiActivation, true);
  assert.equal(cfg.forbidden.ownerProjection, true);
  assert.equal(cfg.current501MustRemain, true);
  assert.equal(cfg.currentDecision, 'HOLD_RUNTIME_ACTIVATION');
});

test('harness invokes canonical engine but hard-codes projection, persistence and route to null', async () => {
  const source = await readFile(
    path.join(root, 'backend/api/services/eli-runtime/activity-variability-conformance.ts'),
    'utf8',
  );
  assert.match(source, /stepEKF/);
  assert.match(source, /runVetoPipeline/);
  assert.match(source, /CONFORMANCE_ONLY_SYNTHETIC/);
  assert.match(source, /SYNTHETIC_TEST_INJECTION/);
  assert.match(source, /userProjection:\s*null/);
  assert.match(source, /persistenceWrite:\s*null/);
  assert.match(source, /apiRoute:\s*null/);
});

test('no backend route imports the conformance harness', async () => {
  const routesRoot = path.join(root, 'backend/api/routes');
  const entries = await readdir(routesRoot, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => path.join(entry.parentPath ?? routesRoot, entry.name));

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /activity-variability-conformance/,
      `runtime route must not import conformance harness: ${file}`,
    );
  }
});

test('current ELI API 501 remains in place', async () => {
  const source = await readFile(path.join(root, 'backend/api/routes/sensors.ts'), 'utf8');
  const occurrences = source.match(/eli_runtime_not_implemented/g) ?? [];
  assert.equal(occurrences.length, 2);
});
