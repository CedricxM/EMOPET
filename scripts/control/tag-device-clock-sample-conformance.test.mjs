import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
  serializeDeviceClockSampleFrame,
} from '../../packages/ble-protocol/dist/index.js';

const root = fileURLToPath(new URL('../../', import.meta.url));

function hex(bytes) {
  return Buffer.from(bytes).toString('hex');
}

test('TAG C clock-sample writer is byte-identical to the canonical TypeScript codec', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'emopet-tag-clock-'));
  const binary = path.join(dir, 'device-clock-sample-fixture');

  try {
    const compile = spawnSync('cc', [
      '-std=c11',
      '-Wall',
      '-Wextra',
      '-Werror',
      '-pedantic',
      path.join(root, 'firmware/collar/main/transport/device_clock_sample.c'),
      path.join(root, 'firmware/collar/test/device_clock_sample_fixture.c'),
      '-o',
      binary,
    ], { encoding: 'utf8' });

    assert.equal(
      compile.status,
      0,
      `C clock fixture compile failed:\n${compile.stdout}\n${compile.stderr}`,
    );

    const run = spawnSync(binary, [], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);

    const lines = run.stdout.trim().split(/\r?\n/);
    assert.equal(lines.length, 2);

    const first = serializeDeviceClockSampleFrame({
      transportVersion: 1,
      bootSessionId: 0x10203040,
      deviceMs: 0x89abcdef,
    });
    const zero = serializeDeviceClockSampleFrame({
      transportVersion: 1,
      bootSessionId: 0,
      deviceMs: 0,
    });

    assert.equal(lines[0], hex(first));
    assert.equal(lines[1], hex(zero));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
