import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function readRepoText(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}
async function readRepoJson(path) {
  return JSON.parse(await readRepoText(path));
}

const matrix = await readRepoJson('config/world/world-progression-privacy-gap-matrix-v1.json');
const gate = await readRepoJson('config/world/world-progression-persistence-gate-v1.json');
const candidate = await readRepoJson('config/world/world-progression-privacy-candidate-v1.json');

test('privacy gap matrix stays aligned with the durable World relations', () => {
  const expected = Object.keys(gate.plannedTables).sort();
  assert.deepEqual([...matrix.plannedTables].sort(), expected);
  assert.deepEqual(candidate.relations.map((row) => row.table).sort(), expected);
  assert.equal(matrix.productionAuthority, false);
  assert.equal(matrix.status, 'PARTIAL_TECHNICAL_RECONCILIATION_NOT_PROMOTED');
  assert.equal(matrix.claims.migrationSchemaPresent, true);
  assert.equal(matrix.claims.productionWritesActive, false);
});

test('gap matrix exactly reflects current active privacy/runtime table mentions', async () => {
  for (const surface of matrix.activeSurfaces) {
    const text = await readRepoText(surface.path);
    const actualMentions = matrix.plannedTables.filter((table) => text.includes(table)).sort();
    assert.deepEqual(
      [...surface.currentTableMentions].sort(),
      actualMentions,
      `${surface.id} drifted from the checked-in G2 gap matrix`,
    );
  }
});

test('technical visibility is implemented while lifecycle authority remains open', () => {
  assert.deepEqual(matrix.technicalProgress, {
    ownerLineageRegistered: true,
    erasureTopologyRegistered: true,
    persistenceCoverageRegistered: true,
    erasureDispositionRowsPresent: true,
    subjectDiscoveryIntegrated: true,
    residueVerificationIntegrated: true,
    privacyClassificationApproved: false,
    erasureDispositionApproved: false,
    exportTreatmentApproved: false,
    retentionApproved: false,
  });

  for (const relation of candidate.relations) {
    assert.equal(relation.erasureDisposition, 'TO_CONFIRM');
    assert.equal(relation.exportDisposition, 'TO_CONFIRM');
    assert.equal(relation.retentionDisposition, 'TO_CONFIRM');
  }

  assert.equal(matrix.claims.privacyReconciled, false);
  assert.equal(matrix.claims.durableProductionPersistence, false);
  assert.equal(matrix.claims.accountErasureComplete, false);
  assert.equal(matrix.claims.accountExportComplete, false);
  assert.equal(matrix.claims.retentionApproved, false);
});

test('remaining gap surfaces stay visibly unresolved', () => {
  for (const id of ['retention-schedule', 'data-inventory', 'data-export-policy']) {
    const surface = matrix.activeSurfaces.find((row) => row.id === id);
    assert.ok(surface);
    assert.deepEqual(surface.currentTableMentions, []);
  }

  const unresolved = matrix.unresolvedDecisions.join(' ').toLowerCase();
  for (const required of [
    'classification',
    'erasure disposition',
    'export treatment',
    'retention',
    'foreign-key',
    'non-sql',
  ]) {
    assert.match(unresolved, new RegExp(required));
  }
});

test('legacy browser gamification remains explicit non-SQL evidence', async () => {
  const inventoryText = await readRepoText(matrix.nonSqlSurface.path);
  assert.equal(matrix.nonSqlSurface.requiredBeforePromotion, true);
  assert.equal(
    matrix.nonSqlSurface.currentWorldProgressionDecision,
    'ACTIVE_INVENTORY_DECISION_ABSENT_LEGACY_RUNTIME_PRESENT',
  );
  assert.equal(/world[ _-]?progression/i.test(inventoryText), false);

  const legacy = matrix.nonSqlSurface.observedLegacyRuntimeSurfaces[0];
  const source = await readRepoText(legacy.path);
  assert.equal(legacy.mechanism, 'localStorage');
  assert.match(source, /localStorage\.getItem/);
  assert.match(source, /localStorage\.setItem/);
  for (const key of legacy.observedKeys) {
    assert.equal(source.includes(key), true);
  }
});
