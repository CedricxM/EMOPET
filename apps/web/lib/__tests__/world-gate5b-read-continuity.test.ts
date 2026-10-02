import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const contract = JSON.parse(
  readFileSync(
    new URL('../../../../config/world/world-gate5b-web-read-continuity-v1.json', import.meta.url),
    'utf8',
  ),
);
const transition = JSON.parse(
  readFileSync(
    new URL('../../../../config/world/world-region-transition-v1.json', import.meta.url),
    'utf8',
  ),
);

test('Gate 5B remains a non-activated read-only cutover contract', () => {
  assert.equal(contract.status, 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY');
  assert.equal(contract.activated, false);
  assert.equal(contract.requirements.serverSnapshotIsSourceOfTruth, true);
  assert.equal(contract.requirements.browserProgressionPersistence, false);
  assert.equal(contract.requirements.refreshMustRefetchServerSnapshot, true);
  assert.equal(contract.requirements.parallelLegacyEconomy, false);
  assert.equal(contract.requirements.writeTrafficAllowed, false);
  assert.equal(contract.activationRequiresExplicitCutoverDecision, true);
});

test('Gate 5B inherits the canonical regional continuity invariants', () => {
  assert.equal(contract.requirements.regionSelectionIsCoarseAndExplicit, true);
  assert.equal(contract.requirements.regionSwitchReward, false);
  assert.equal(contract.requirements.ownershipPersistsAcrossRegionSwitch, true);
  assert.equal(transition.switchReward, false);
  assert.equal(transition.ownershipPersistsAcrossRegionSwitch, true);
  assert.equal(transition.earnedResourceReset, false);
  assert.equal(transition.ownedItemExpiry, false);
});

test('Gate 5B points only to the governed server read client', () => {
  const client = readFileSync(
    new URL('../world-gamification-read.ts', import.meta.url),
    'utf8',
  );
  assert.equal(contract.client, 'apps/web/lib/world-gamification-read.ts');
  assert.match(client, /\/api\/world-gamification/);
  assert.doesNotMatch(client, /localStorage|sessionStorage/);
  assert.doesNotMatch(client, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
});
