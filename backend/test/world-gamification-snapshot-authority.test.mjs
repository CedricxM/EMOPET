import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const snapshotSource = await readFile(
  new URL('../api/services/world-gamification-snapshot.ts', import.meta.url),
  'utf8',
);

test('gamification snapshot requires explicit Owner scope for every progression state', () => {
  assert.match(
    snapshotSource,
    /buildWorldGamificationSnapshot\(input:\s*\{[\s\S]*?ownerId:\s*string;/,
  );
  assert.match(
    snapshotSource,
    /resourceState:\s*WorldOwnerScopedResourceState/,
  );
  assert.match(
    snapshotSource,
    /ownershipState:\s*WorldOwnerScopedOwnershipState/,
  );
  assert.match(
    snapshotSource,
    /WORLD_GAMIFICATION_RESOURCE_OWNER_SCOPE_MISMATCH/,
  );
  assert.match(
    snapshotSource,
    /WORLD_GAMIFICATION_OWNERSHIP_OWNER_SCOPE_MISMATCH/,
  );
  assert.match(
    snapshotSource,
    /projectWorldQuestProgress\(input\.ownerId,\s*input\.ledgerEntries\)/,
  );
});

test('gamification snapshot does not expose dog, ELI, sensor or ranking progression fields', () => {
  const outputInterface = snapshotSource.match(
    /export interface WorldGamificationSnapshot \{([\s\S]*?)\n\}/,
  );
  assert.ok(outputInterface, 'WorldGamificationSnapshot interface must exist');
  assert.doesNotMatch(
    outputInterface[1],
    /dog|eli|sensor|health|wellbeing|emotion|relationship|rank|level|xp|streak|score/i,
  );
});

test('gamification snapshot regional input remains coarse-code only', () => {
  const inputContract = snapshotSource.match(
    /buildWorldGamificationSnapshot\(input:\s*\{([\s\S]*?)\n\}\):/,
  );
  assert.ok(inputContract, 'snapshot input contract must exist');
  assert.match(inputContract[1], /regionCode:\s*string \| null \| undefined/);
  assert.doesNotMatch(
    inputContract[1],
    /lat|lng|longitude|latitude|address|geofence|distance|locationHistory/i,
  );
});
