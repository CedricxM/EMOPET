import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('device trust authority remains fail-closed and MAC is not security identity', async () => {
  const url = new URL('../../config/security/device-trust-authority.json', import.meta.url);
  const cfg = JSON.parse(await readFile(url, 'utf8'));

  assert.equal(cfg.status, 'PRE_PRODUCTION / FAIL_CLOSED');
  assert.equal(cfg.devicePrincipal.macAddressAuthority, 'NOT_AUTHORITY');
  assert.equal(cfg.commands.rawBleBuilders, 'UNAUTHENTICATED_PAYLOAD_ONLY');
  assert.equal(cfg.commands.runtime, 'NOT_IMPLEMENTED');
  assert.equal(cfg.ota.secureBoot, 'OPEN');
  assert.equal(cfg.ota.imageSigning, 'OPEN');
  assert.equal(cfg.ota.antiRollback, 'OPEN');
});

test('raw BLE command builders cannot be described as authorization', async () => {
  const url = new URL('../../packages/ble-protocol/src/commands/index.ts', import.meta.url);
  const source = await readFile(url, 'utf8');

  assert.ok(source.includes("RAW_BLE_COMMAND_AUTHORITY = 'UNAUTHENTICATED_PAYLOAD_ONLY'"));
  assert.ok(source.includes('0xDE 0xAD is only a payload confirmation marker'));
  assert.ok(source.includes('It is NOT authentication'));
});

test('trusted command runtime fails closed until cryptographic architecture exists', async () => {
  const url = new URL('../../packages/ble-protocol/src/commands/authority.ts', import.meta.url);
  const source = await readFile(url, 'utf8');

  assert.ok(source.includes('DEVICE_COMMAND_TRUST_RUNTIME_NOT_IMPLEMENTED'));
  assert.ok(source.includes('nonce'));
  assert.ok(source.includes('commandSequence'));
  assert.ok(source.includes('keyVersion'));
  assert.ok(source.includes('signature'));
});
