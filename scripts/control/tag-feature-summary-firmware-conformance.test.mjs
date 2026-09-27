import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
  serializeActivityVariabilityFeatureFrame,
} from '../../packages/ble-protocol/dist/index.js';

const root = fileURLToPath(new URL('../../', import.meta.url));

function hex(bytes) {
  return Buffer.from(bytes).toString('hex');
}

function compileFixture(binary) {
  const args = [
    '-std=c11',
    '-Wall',
    '-Wextra',
    '-Werror',
    '-pedantic',
    path.join(root, 'firmware/collar/main/sensors/activity_variability.c'),
    path.join(root, 'firmware/collar/main/transport/activity_feature_summary.c'),
    path.join(root, 'firmware/collar/test/activity_feature_summary_fixture.c'),
    '-lm',
    '-o',
    binary,
  ];

  const result = spawnSync('cc', args, { encoding: 'utf8' });
  assert.equal(
    result.status,
    0,
    `C fixture compile failed:\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
  );
}

test('TAG C writer is byte-for-byte identical to the canonical TypeScript feature codec', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'emopet-tag-feature-'));
  const binary = path.join(dir, 'activity-feature-summary-fixture');

  try {
    compileFixture(binary);
    const run = spawnSync(binary, [], { encoding: 'utf8' });
    assert.equal(
      run.status,
      0,
      `C fixture failed:\nSTDOUT:\n${run.stdout}\nSTDERR:\n${run.stderr}`,
    );

    const lines = run.stdout.trim().split(/\r?\n/);
    assert.equal(lines.length, 2, `expected two golden frames, got ${lines.length}`);

    const observed = serializeActivityVariabilityFeatureFrame({
      transportVersion: 1,
      source: 'TAG',
      featureKey: 'activity_variability',
      featureContractVersion: 'tag-activity-variability-cv30m-v1',
      sequence: 65535,
      bootSessionId: 0x10203040,
      windowEndMs: 3_600_000,
      windowSeconds: 1800,
      validSeconds: 1700,
      observationStatus: 'OBSERVED',
      nullReason: null,
      qualityState: 'VALID',
      value: 0.42,
    });

    const absent = serializeActivityVariabilityFeatureFrame({
      transportVersion: 1,
      source: 'TAG',
      featureKey: 'activity_variability',
      featureContractVersion: 'tag-activity-variability-cv30m-v1',
      sequence: 7,
      bootSessionId: 0x10203040,
      windowEndMs: 3_600_000,
      windowSeconds: 1800,
      validSeconds: 400,
      observationStatus: 'NOT_OBSERVED',
      nullReason: 'INSUFFICIENT_COVERAGE',
      qualityState: 'DEGRADED',
      value: null,
    });

    assert.equal(lines[0], hex(observed), 'OBSERVED C/TypeScript frame drift');
    assert.equal(lines[1], hex(absent), 'NOT_OBSERVED C/TypeScript frame drift');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
