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


test('Gate 5B web surface quarantines the local World prototype as preview-only', () => {
  const preview = readFileSync(
    new URL('../mock-world.ts', import.meta.url),
    'utf8',
  );
  const builder = readFileSync(
    new URL('../../components/world/WorldBuilder.tsx', import.meta.url),
    'utf8',
  );
  const page = readFileSync(
    new URL('../../app/world/page.tsx', import.meta.url),
    'utf8',
  );

  assert.equal(contract.activated, false);
  assert.equal(contract.requirements.parallelLegacyEconomy, false);
  assert.equal(contract.requirements.browserProgressionPersistence, false);

  assert.match(preview, /LOCAL_VISUAL_PREVIEW_NOT_ACCOUNT_PROGRESSION/);
  assert.match(builder, /PREVIEW_RESOURCE_BALANCE/);
  assert.match(builder, /Aucun état de compte n’a été modifié/);
  assert.match(builder, /Preview non persistant/);
  assert.doesNotMatch(preview, /localStorage|sessionStorage/);
  assert.doesNotMatch(builder, /localStorage|sessionStorage/);

  for (const forbidden of [
    'routinePoints',
    'observationQuality',
    'trustFragments',
    'calmStones',
    'bondMoments',
    'signalClarity',
    'reliable_rest_window_completed',
    'signal_quality_high',
    'mat_setup_completed',
  ]) {
    assert.equal(preview.includes(forbidden), false, `parallel legacy economy term returned: ${forbidden}`);
  }

  assert.doesNotMatch(page, /care routines|observation quality/i);
});
