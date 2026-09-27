import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel) => readFile(path.join(root, rel), 'utf8');

const authority = JSON.parse(
  await read('config/firmware/tag-transport-session-authority-v1.json'),
);
const platform = JSON.parse(
  await read('config/firmware/tag-platform-v1.json'),
);
const gatt = await read('firmware/collar/ncs/src/emopet_gatt.c');
const codec = await read('packages/ble-protocol/src/feature-summary.ts');
const migration = await read(
  'backend/db/migrations/0017_sensor_feature_transport_replay.sql',
);

test('G4 records current session behavior without promoting it to security or guaranteed uniqueness', () => {
  assert.equal(authority.bootSession.widthBits, 32);
  assert.equal(authority.bootSession.currentSource, 'sys_rand32_get');
  assert.equal(authority.bootSession.generationFrequency, 'ONCE_PER_APPLICATION_BOOT');
  assert.equal(authority.bootSession.cryptographicIdentity, false);
  assert.equal(authority.bootSession.deviceTrustAuthority, false);
  assert.equal(authority.bootSession.globalUniquenessGuaranteed, false);
  assert.equal(authority.bootSession.historicalCollisionProof, false);
  assert.equal(authority.bootSession.productionPolicy, 'OPEN');

  assert.match(gatt, /boot_session_id = sys_rand32_get\(\)/);
  assert.match(gatt, /feature_sequence = 0/);
  assert.match(gatt, /feature_sequence\+\+/);
});

test('sequence semantics stay uint16 wrap-aware and scoped to one boot session', () => {
  assert.equal(authority.sequence.widthBits, 16);
  assert.equal(authority.sequence.initialValue, 0);
  assert.equal(authority.sequence.scope, 'PER_BOOT_SESSION');
  assert.equal(
    authority.sequence.commitRule,
    'INCREMENT_AFTER_SUCCESSFUL_LIVE_NOTIFY',
  );
  assert.equal(authority.sequence.failedNotifyConsumesSequence, false);
  assert.equal(authority.sequence.wrapRule, 'MODULO_65536');

  assert.match(codec, /const delta = \(current\.sequence - previous\.sequence \+ 0x10000\) & 0xffff/);
  assert.match(codec, /if \(delta === 1\) return 'CONTIGUOUS'/);
});

test('backend replay identity matches G4 and stays separate from device authentication', () => {
  for (const column of [
    'device_id',
    'feature_key',
    'transport_boot_session_id',
    'transport_sequence',
  ]) {
    assert.ok(migration.includes(column), column);
  }
  assert.equal(authority.replayIdentity.purpose, 'TRANSPORT_REPLAY_EVIDENCE_ONLY');
  assert.equal(authority.replayIdentity.physicalDeviceAuthentication, false);
});

test('G4 preserves #633 measurement-time authority and keeps future buffering open', () => {
  assert.equal(authority.timeBoundary.windowEndMsOwner, 'FEATURE_PRODUCER');
  assert.equal(authority.timeBoundary.notificationTimeMayReplaceWindowEndMs, false);
  assert.equal(authority.timeBoundary.utcOnTag, false);
  assert.equal(authority.timeBoundary.bootAnchorAuthority, 'OPEN');
  assert.equal(authority.futureBufferingRule.currentOfflineQueueImplemented, false);
  assert.equal(authority.futureBufferingRule.sendTimeAllocationAllowedForBackfill, false);

  assert.doesNotMatch(gatt, /k_uptime_get_32\(\)/);
  assert.equal(
    platform.transport.windowEndMsSource,
    'CALLER_OWNED_MONOTONIC_MEASUREMENT_WINDOW_END',
  );
});

test('platform authority links G4 but cannot claim production session uniqueness', () => {
  assert.equal(
    platform.transport.sessionAuthority,
    'config/firmware/tag-transport-session-authority-v1.json',
  );
  assert.equal(platform.transport.productionSessionUniquenessVerified, false);
  assert.equal(platform.transport.offlineBufferingPolicy, 'OPEN');
});
