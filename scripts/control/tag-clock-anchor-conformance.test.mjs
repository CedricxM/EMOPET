import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
  parseClockAnchorResponse,
  serializeClockAnchorResponse,
} from '../../packages/ble-protocol/dist/index.js';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('TAG C and TypeScript clock-anchor responses are byte-for-byte identical', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'emopet-clock-anchor-'));
  const binary = path.join(dir, 'clock-anchor-fixture');

  try {
    const compile = spawnSync('cc', [
      '-std=c11',
      '-Wall',
      '-Wextra',
      '-Werror',
      '-pedantic',
      path.join(root, 'firmware/collar/main/transport/clock_anchor_transport.c'),
      path.join(root, 'firmware/collar/test/clock_anchor_transport_fixture.c'),
      '-o',
      binary,
    ], { encoding: 'utf8' });

    assert.equal(
      compile.status,
      0,
      `clock-anchor C compile failed:\n${compile.stdout}\n${compile.stderr}`,
    );

    const run = spawnSync(binary, [], { encoding: 'utf8' });
    assert.equal(
      run.status,
      0,
      `clock-anchor C fixture failed:\n${run.stdout}\n${run.stderr}`,
    );

    const cHex = run.stdout.trim();
    const ts = serializeClockAnchorResponse({
      requestNonce: 0x12345678,
      bootSessionId: 0x10203040,
      deviceMs: 0x55667788,
    });
    assert.equal(cHex, Buffer.from(ts).toString('hex'));

    assert.deepEqual(parseClockAnchorResponse(ts), {
      transportVersion: 1,
      messageType: 'CLOCK_ANCHOR_RESPONSE',
      requestNonce: 0x12345678,
      bootSessionId: 0x10203040,
      deviceMs: 0x55667788,
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
