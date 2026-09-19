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

function indexOrFail(source, needle) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `missing source marker: ${needle}`);
  return index;
}

test('INT-09E mutations cannot manufacture unauthenticated success', () => {
  const mutationStart = indexOrFail(serviceSource, 'export async function saveFeatureConsent');
  const mutationEnd = indexOrFail(serviceSource, 'export function getConsentPromptCopy');
  const mutationSource = serviceSource.slice(mutationStart, mutationEnd);

  assert.match(serviceSource, /function requireFeatureMutationToken/);
  assert.doesNotMatch(mutationSource, /demo-user/);
  assert.doesNotMatch(mutationSource, /joinedAt:\s*new Date\(\)/);

  for (const fn of [
    'saveFeatureConsent',
    'joinFeatureWaitlistRequest',
    'acceptCommunityRulesRequest',
  ]) {
    const fnStart = indexOrFail(mutationSource, `export async function ${fn}`);
    const nextExport = mutationSource.indexOf('export async function ', fnStart + 1);
    const fnSource = mutationSource.slice(fnStart, nextExport === -1 ? mutationSource.length : nextExport);
    assert.match(fnSource, /requireFeatureMutationToken\(token\)/);
  }
});

test('INT-09E local waitlist and consent state change only after server ACK', () => {
  const waitlistRequest = indexOrFail(
    hookSource,
    'await joinFeatureWaitlistRequest(token, item.serviceId)',
  );
  const localWaitlist = indexOrFail(hookSource, 'joinWaitlist(item.serviceId)');
  assert.ok(waitlistRequest < localWaitlist);

  const consentRequest = indexOrFail(hookSource, 'await saveFeatureConsent(token');
  const communityApply = indexOrFail(hookSource, "setConsent('community_opt_in', true)");
  const locationApply = indexOrFail(hookSource, "setConsent('location_opt_in', true)");
  assert.ok(consentRequest < communityApply);
  assert.ok(consentRequest < locationApply);

  const rulesRequest = indexOrFail(hookSource, 'await acceptCommunityRulesRequest(token)');
  const rulesApply = indexOrFail(hookSource, 'setCommunityRulesAccepted(true)');
  assert.ok(rulesRequest < rulesApply);
});
