import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const settingsSource = readFileSync(
  new URL('../../apps/mobile/app/settings/index.tsx', import.meta.url),
  'utf8',
);
const storeSource = readFileSync(
  new URL('../../apps/mobile/src/store/preferences.ts', import.meta.url),
  'utf8',
);

test('INT-09G2 Settings cannot manufacture subscription or hardware authority', () => {
  for (const forbidden of [
    'setSubscriptionTier',
    'setHardwareLinked',
    'const TIERS',
    'Kit lie',
    'Entitlements V1',
  ]) {
    assert.equal(
      settingsSource.includes(forbidden),
      false,
      `local authority control returned to Settings: ${forbidden}`,
    );
  }

  assert.match(settingsSource, /Compte & materiel/);
  assert.match(
    settingsSource,
    /niveau d abonnement et l association MAT\/TAG ne sont pas modifiables localement/,
  );
  assert.match(settingsSource, /autorite compte\/device de reference/);
});

test('INT-09G2 local store keeps entitlement/device placeholders read-only and fail-closed', () => {
  assert.match(storeSource, /subscriptionTier:\s*'free'/);
  assert.match(storeSource, /hardwareLinked:\s*false/);
  assert.match(storeSource, /Read-only placeholders until canonical account\/device authority is wired/);

  assert.doesNotMatch(storeSource, /setSubscriptionTier\s*:/);
  assert.doesNotMatch(storeSource, /setHardwareLinked\s*:/);
  assert.doesNotMatch(storeSource, /set\(\{\s*subscriptionTier\s*\}\)/);
  assert.doesNotMatch(storeSource, /set\(\{\s*hardwareLinked\s*\}\)/);
});
