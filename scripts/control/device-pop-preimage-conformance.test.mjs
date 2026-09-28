import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
  buildDevicePopSigningPreimageV1,
} from '../../backend/dist/api/security/device-pop-verifier.js';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('TAG C PoP preimage is byte-for-byte identical to backend verifier authority', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'emopet-device-pop-'));
  const binary = path.join(dir, 'device-pop-preimage-fixture');

  try {
    const compile = spawnSync('cc', [
      '-std=c11',
      '-Wall',
      '-Wextra',
      '-Werror',
      '-pedantic',
      path.join(root, 'firmware/collar/main/security/device_pop_preimage.c'),
      path.join(root, 'firmware/collar/test/device_pop_preimage_fixture.c'),
      '-o',
      binary,
    ], { encoding: 'utf8' });

    assert.equal(
      compile.status,
      0,
      `C preimage fixture compile failed:\nSTDOUT:\n${compile.stdout}\nSTDERR:\n${compile.stderr}`,
    );

    const run = spawnSync(binary, [], { encoding: 'utf8' });
    assert.equal(
      run.status,
      0,
      `C preimage fixture failed:\nSTDOUT:\n${run.stdout}\nSTDERR:\n${run.stderr}`,
    );

    const challenge = {
      schemaVersion: 'device-pop-challenge-v1',
      protocolVersion: 1,
      deviceId: '11111111-1111-4111-8111-111111111111',
      credentialVersion: 3,
      purpose: 'DEVICE_DATA_TELEMETRY_INGRESS',
      challengeId: '22222222-2222-4222-8222-222222222222',
      nonce: Buffer.alloc(32, 0x5a).toString('base64url'),
      issuedAt: '2026-09-27T18:29:00.000Z',
      expiresAt: '2026-09-27T18:31:00.000Z',
      signingContract: 'EMOPET_DEVICE_POP_FIXED_BINARY_V1',
    };

    const backend = buildDevicePopSigningPreimageV1(challenge);
    assert.equal(backend.length, 106);

    const cHex = run.stdout.trim();
    assert.equal(cHex.length, 212);
    assert.equal(cHex, backend.toString('hex'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
