import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const storeSource = readFileSync(
  new URL('../../apps/mobile/src/store/preferences.ts', import.meta.url),
  'utf8',
);
const hookSource = readFileSync(
  new URL('../../apps/mobile/src/hooks/use-feature-progress.ts', import.meta.url),
  'utf8',
);
const settingsSource = readFileSync(
  new URL('../../apps/mobile/app/settings/index.tsx', import.meta.url),
  'utf8',
);

function indexOrFail(source, needle) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `missing source marker: ${needle}`);
  return index;
}

test('INT-09E2 sensitive consent defaults are fail-closed', () => {
  assert.match(
    storeSource,
    /consents:\s*\{\s*location_opt_in:\s*false,\s*community_opt_in:\s*false,\s*vet_export_opt_in:\s*false,/s,
  );
  assert.match(
    storeSource,
    /\(key === 'location_opt_in' \|\| key === 'community_opt_in'\) && value/,
  );
  assert.match(storeSource, /activateLocationConsentFromDurableAuthority/);
  assert.match(storeSource, /activateCommunityConsentFromDurableAuthority/);
  assert.match(
    storeSource,
    /passivePhoneDetectionEnabled:\s*enabled && state\.consents\.location_opt_in/,
  );
});

test('INT-09E2 durable Feature Progress ACK uses dedicated positive activators', () => {
  const save = indexOrFail(hookSource, 'await saveFeatureConsent(token');
  const community = indexOrFail(
    hookSource,
    'activateCommunityConsentFromDurableAuthority()',
  );
  const location = indexOrFail(
    hookSource,
    'activateLocationConsentFromDurableAuthority()',
  );

  assert.ok(save < community);
  assert.ok(save < location);
  assert.doesNotMatch(hookSource, /setConsent\('community_opt_in', true\)/);
  assert.doesNotMatch(hookSource, /setConsent\('location_opt_in', true\)/);
});

test('INT-09E2 general Settings cannot create local location or community authority', () => {
  assert.match(settingsSource, /function onLocationConsentChange/);
  assert.doesNotMatch(
    settingsSource,
    /setConsent\('location_opt_in',\s*true\)/,
  );

  const communitySave = indexOrFail(
    settingsSource,
    'await saveFeatureConsent(token',
  );
  const communityActivate = indexOrFail(
    settingsSource,
    'activateCommunityConsentFromDurableAuthority()',
  );
  assert.ok(communitySave < communityActivate);
  assert.doesNotMatch(
    settingsSource,
    /onValueChange=\{\(value\) => setConsent\('community_opt_in', value\)\}/,
  );

  assert.match(settingsSource, /preference locale/);
  assert.match(settingsSource, /ne donne acces a aucune clinique/);
});
