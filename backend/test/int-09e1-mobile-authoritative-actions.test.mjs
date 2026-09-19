import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const serviceSource = readFileSync(
  new URL('../../apps/mobile/src/services/feature-progress.ts', import.meta.url),
  'utf8',
);
const hookSource = readFileSync(
  new URL('../../apps/mobile/src/hooks/use-feature-progress.ts', import.meta.url),
  'utf8',
);

test('INT-09E1 durable mutations require an authenticated token', () => {
  assert.match(serviceSource, /function requireMutationToken/);
  assert.match(serviceSource, /Connexion requise pour enregistrer cette action/);

  const demoUserOccurrences = serviceSource.match(/['"]demo-user['"]/g) ?? [];
  assert.equal(
    demoUserOccurrences.length,
    1,
    'demo-user may remain only in local explanatory progress, never mutation results',
  );

  for (const fn of [
    'saveFeatureConsent',
    'joinFeatureWaitlistRequest',
    'acceptCommunityRulesRequest',
  ]) {
    const start = serviceSource.indexOf(`export async function ${fn}`);
    assert.ok(start >= 0, `${fn} missing`);
    const nextExport = serviceSource.indexOf('export ', start + 10);
    const body = serviceSource.slice(start, nextExport >= 0 ? nextExport : undefined);
    assert.match(body, /requireMutationToken\(token\)/, `${fn} must require auth`);
    assert.doesNotMatch(body, /demo-user/, `${fn} must not fabricate demo identity`);
  }
});

test('INT-09E1 waitlist and rules local state follow server success', () => {
  const waitRequest = hookSource.indexOf('await joinFeatureWaitlistRequest(token, item.serviceId)');
  const waitLocal = hookSource.indexOf('joinWaitlist(item.serviceId)', waitRequest);
  assert.ok(waitRequest >= 0 && waitLocal > waitRequest);

  const rulesRequest = hookSource.indexOf('await acceptCommunityRulesRequest(token)');
  const rulesLocal = hookSource.indexOf('setCommunityRulesAccepted(true)', rulesRequest);
  assert.ok(rulesRequest >= 0 && rulesLocal > rulesRequest);
});

test('INT-09E1 positive consent is applied only after durable save', () => {
  const save = hookSource.indexOf('await saveFeatureConsent(token');
  const communityLocal = hookSource.indexOf("setConsent('community_opt_in', true)", save);
  const locationLocal = hookSource.indexOf("setConsent('location_opt_in', true)", save);
  const passiveLocal = hookSource.indexOf('setPassivePhoneDetectionEnabled(true)', save);

  assert.ok(save >= 0);
  assert.ok(communityLocal > save);
  assert.ok(locationLocal > save);
  assert.ok(passiveLocal > save);

  assert.doesNotMatch(
    hookSource,
    /setConsent\([^\n]+true\)[\s\S]{0,300}void saveFeatureConsent/,
  );
});
