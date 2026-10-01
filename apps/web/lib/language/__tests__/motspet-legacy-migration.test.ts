import assert from 'node:assert/strict';
import { test } from 'node:test';

import { en, fr } from '../../i18n/dictionaries';
import { getMotsPetEntry } from '../motspet';
import {
  MOTSPET_LEGACY_MIGRATION_MAP,
  getMotsPetLegacyMigrationEntry,
} from '../motspet-legacy-migration';

function getPathValue(
  root: Record<string, unknown>,
  path: string,
): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, root);
}

test('legacy migration map matches current FR/EN dictionary debt exactly', () => {
  for (const entry of MOTSPET_LEGACY_MIGRATION_MAP) {
    assert.equal(
      getPathValue(fr as unknown as Record<string, unknown>, entry.dictionaryPath),
      entry.legacyFr,
      entry.dictionaryPath + ' FR',
    );
    assert.equal(
      getPathValue(en as unknown as Record<string, unknown>, entry.dictionaryPath),
      entry.legacyEn,
      entry.dictionaryPath + ' EN',
    );
  }
});

test('legacy migration entries cannot invent missing MotsPet target concepts', () => {
  for (const entry of MOTSPET_LEGACY_MIGRATION_MAP) {
    if (entry.targetConceptId === null) continue;

    const target = getMotsPetEntry(entry.targetConceptId);
    assert.ok(
      target,
      entry.dictionaryPath + ' references unknown MotsPet concept ' + entry.targetConceptId,
    );
    assert.equal(
      target.status,
      'CONTROLLED_SEED',
      entry.dictionaryPath + ' may only point at a controlled target concept',
    );
  }
});

test('known global-index and broad wellbeing debt stays explicitly OPEN', () => {
  const balance = getMotsPetLegacyMigrationEntry('dashboard.balanceIndex');
  const wellbeing = getMotsPetLegacyMigrationEntry('bienEtre.title');

  assert.ok(balance);
  assert.equal(balance.disposition, 'OPEN_REMOVE_GLOBAL_INDEX_LANGUAGE');
  assert.equal(balance.targetConceptId, null);

  assert.ok(wellbeing);
  assert.equal(wellbeing.disposition, 'OPEN_RENAME_WELLBEING_SURFACE');
  assert.equal(wellbeing.targetConceptId, null);
});

test('every legacy migration entry carries authority and rationale', () => {
  for (const entry of MOTSPET_LEGACY_MIGRATION_MAP) {
    assert.ok(entry.rationale.trim().length > 0, entry.dictionaryPath);
    assert.ok(entry.authorityPaths.length > 0, entry.dictionaryPath);
    assert.ok(
      entry.authorityPaths.every((path) => path.startsWith('docs/')),
      entry.dictionaryPath,
    );
  }
});
