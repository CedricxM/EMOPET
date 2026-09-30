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

    const baseChallenge = {
      schemaVersion: 'device-pop-challenge-v1',
      protocolVersion: 1,
      deviceId: '11111111-1111-4111-8111-111111111111',
      credentialVersion: 3,
      challengeId: '22222222-2222-4222-8222-222222222222',
      nonce: Buffer.alloc(32, 0x5a).toString('base64url'),
      issuedAt: '2026-09-27T18:29:00.000Z',
      expiresAt: '2026-09-27T18:31:00.000Z',
      signingContract: 'EMOPET_DEVICE_POP_FIXED_BINARY_V1',
    };

    const telemetry = buildDevicePopSigningPreimageV1({
      ...baseChallenge,
      purpose: 'DEVICE_DATA_TELEMETRY_INGRESS',
    });
    const activation = buildDevicePopSigningPreimageV1({
      ...baseChallenge,
      purpose: 'DEVICE_CREDENTIAL_ACTIVATION',
    });

    assert.equal(telemetry.length, 106);
    assert.equal(activation.length, 106);
    assert.equal(telemetry[20], 1);
    assert.equal(telemetry[21], 1);
    assert.equal(activation[20], 1);
    assert.equal(activation[21], 2);

    const cLines = run.stdout.trim().split(/\r?\n/);
    assert.equal(cLines.length, 2);
    assert.equal(cLines[0], telemetry.toString('hex'));
    assert.equal(cLines[1], activation.toString('hex'));

    const telemetryWithoutPurpose = Buffer.from(telemetry);
    telemetryWithoutPurpose[21] = 0;
    const activationWithoutPurpose = Buffer.from(activation);
    activationWithoutPurpose[21] = 0;
    assert.deepEqual(telemetryWithoutPurpose, activationWithoutPurpose);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
