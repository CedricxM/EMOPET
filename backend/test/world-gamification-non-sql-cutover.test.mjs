import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const cutover = JSON.parse(
  await read('config/world/world-gamification-non-sql-cutover-v1.json'),
);

test('legacy browser gamification surfaces remain explicitly non-authoritative for G2', () => {
  assert.equal(cutover.status, 'LEGACY_SURFACES_PRESENT_CUTOVER_NOT_AUTHORIZED');
  assert.equal(cutover.productionAuthority, false);
  assert.equal(cutover.g2LedgerMayReadLegacyState, false);
  assert.equal(cutover.silentRewardImportAllowed, false);
  assert.equal(cutover.automaticDeletionAllowed, false);
  assert.equal(cutover.migrationRequiresCanonicalServerAuthority, true);
  assert.equal(cutover.claims.legacyCutoverComplete, false);
  assert.equal(cutover.claims.g2ProductionWritesAuthorized, false);
});

test('checked-in legacy key inventory matches the browser modules that currently own it', async () => {
  for (const surface of cutover.legacySurfaces) {
    const source = await read(surface.path);
    for (const key of surface.observedKeys) {
      assert.equal(
        source.includes(key),
        true,
        `${surface.path} no longer contains ${key}; review the cutover inventory`,
      );
    }
    assert.equal(surface.directImportToG2, 'FORBIDDEN');
  }
});

test('old gamification module still contains legacy metrics that must not become G2 reward evidence', async () => {
  const source = await read(cutover.legacyGamificationNotG2Authority.path);

  for (const fn of cutover.legacyGamificationNotG2Authority.functions) {
    assert.match(source, new RegExp(`\\b${fn}\\b`));
  }
  for (const signal of cutover.legacyGamificationNotG2Authority.legacySignalsObserved) {
    assert.equal(source.includes(signal), true, `legacy signal drift: ${signal}`);
  }

  assert.match(source, /baselineFrozen/);
  assert.match(source, /validDataDays/);
  assert.match(source, /computeProgression/);
  assert.match(source, /BADGE_CATALOG/);
  assert.match(source, /CHALLENGES/);
});

test('G2 backend persistence cannot depend on browser localStorage or legacy Breiz keys', async () => {
  const g2Sources = await Promise.all([
    read('backend/api/services/world-progression-ledger.ts'),
    read('backend/api/services/world-progression-postgres.ts'),
    read('backend/api/services/world-build-postgres.ts'),
    read('backend/api/services/world-progression-source-authority.ts'),
  ]);

  for (const source of g2Sources) {
    assert.doesNotMatch(source, /localStorage/);
    assert.doesNotMatch(source, /breiz-/i);
    assert.doesNotMatch(source, /computeProgression/);
    assert.doesNotMatch(source, /BADGE_CATALOG/);
    assert.doesNotMatch(source, /CHALLENGES/);
  }
});

test('cutover requires canonical migration and anti-double-reward behavior before any legacy import', () => {
  const rules = cutover.cutoverRules.join(' ').toLowerCase();
  const requirements = cutover.promotionRequirements.join(' ').toLowerCase();

  assert.match(rules, /canonical server-side source verification/);
  assert.match(rules, /must never be converted directly into world resources/);
  assert.match(rules, /idempotent/);
  assert.match(rules, /must not double-reward/);
  assert.match(rules, /must not happen silently/);

  assert.match(requirements, /retire, migrate or exclude/);
  assert.match(requirements, /owner-visible handling/);
  assert.match(requirements, /anti-double-reward/);
  assert.match(requirements, /non-sql erasure inventory/);
  assert.match(requirements, /dog\/care\/eli-derived legacy metrics/);
});
