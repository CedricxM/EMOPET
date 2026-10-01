import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function readRepoText(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

async function readRepoJson(path) {
  return JSON.parse(await readRepoText(path));
}

const matrix = await readRepoJson(
  'config/world/world-progression-privacy-gap-matrix-v1.json',
);
const gate = await readRepoJson(
  'config/world/world-progression-persistence-gate-v1.json',
);
const candidate = await readRepoJson(
  'config/world/world-progression-privacy-candidate-v1.json',
);

test('privacy gap matrix is aligned with the planned durable World relations', () => {
  const plannedFromGate = Object.keys(gate.plannedTables).sort();
  const plannedFromMatrix = [...matrix.plannedTables].sort();
  const plannedFromCandidate = candidate.relations.map((relation) => relation.table).sort();

  assert.deepEqual(plannedFromMatrix, plannedFromGate);
  assert.deepEqual(plannedFromMatrix, plannedFromCandidate);
  assert.equal(matrix.productionAuthority, false);
  assert.equal(matrix.status, 'BLOCKED_GAPS_OBSERVED_NOT_PROMOTED');
});

test('gap matrix exactly reflects current active privacy/runtime table references', async () => {
  for (const surface of matrix.activeSurfaces) {
    const text = await readRepoText(surface.path);
    const actualMentions = matrix.plannedTables
      .filter((table) => text.includes(table))
      .sort();

    assert.deepEqual(
      [...surface.currentTableMentions].sort(),
      actualMentions,
      `${surface.id} drifted from the checked-in gap matrix`,
    );
  }
});

test('current active privacy surfaces do not yet cover all planned World tables', async () => {
  const coverage = new Map(matrix.plannedTables.map((table) => [table, new Set()]));

  for (const surface of matrix.activeSurfaces) {
    const text = await readRepoText(surface.path);
    for (const table of matrix.plannedTables) {
      if (text.includes(table)) coverage.get(table).add(surface.id);
    }
  }

  for (const [table, surfaces] of coverage) {
    assert.equal(
      surfaces.size,
      0,
      `${table} unexpectedly gained active coverage; update/review the gap matrix before promotion`,
    );
  }

  assert.equal(matrix.claims.privacyReconciled, false);
  assert.equal(matrix.claims.migrationAuthorized, false);
  assert.equal(matrix.claims.durableProductionPersistence, false);
});

test('candidate lifecycle decisions remain unresolved and cannot silently promote persistence', () => {
  for (const relation of candidate.relations) {
    assert.equal(relation.erasureDisposition, 'TO_CONFIRM');
    assert.equal(relation.exportDisposition, 'TO_CONFIRM');
    assert.equal(relation.retentionDisposition, 'TO_CONFIRM');
    assert.equal(relation.subjectDiscoveryRequired, true);
    assert.equal(relation.residueVerificationRequired, true);
  }

  assert.equal(candidate.claims.completeAccountErasure, false);
  assert.equal(candidate.claims.completeAccountExport, false);
  assert.equal(candidate.claims.approvedRetention, false);
  assert.equal(candidate.claims.executableErasure, false);
  assert.equal(candidate.claims.durableProductionPersistence, false);
});

test('non-SQL World progression evidence remains blocked and legacy browser gamification is explicitly observed', async () => {
  const inventoryText = await readRepoText(matrix.nonSqlSurface.path);
  const hasPlannedTable = matrix.plannedTables.some((table) => inventoryText.includes(table));
  const hasWorldProgressionDecision = /world[ _-]?progression/i.test(inventoryText);

  assert.equal(
    matrix.nonSqlSurface.currentWorldProgressionDecision,
    'ACTIVE_INVENTORY_DECISION_ABSENT_LEGACY_RUNTIME_PRESENT',
  );
  assert.equal(matrix.nonSqlSurface.requiredBeforePromotion, true);
  assert.equal(hasPlannedTable, false);
  assert.equal(hasWorldProgressionDecision, false);

  assert.equal(matrix.nonSqlSurface.observedLegacyRuntimeSurfaces.length, 1);
  const legacy = matrix.nonSqlSurface.observedLegacyRuntimeSurfaces[0];
  assert.equal(legacy.path, 'apps/web/lib/gamification.ts');
  assert.equal(legacy.mechanism, 'localStorage');
  assert.equal(legacy.status, 'LEGACY_NON_SQL_GAMIFICATION_PRESENT');
  assert.equal(
    legacy.promotionTreatment,
    'RETIRE_MIGRATE_OR_EXPLICITLY_EXCLUDE_FROM_G1B2_AUTHORITY',
  );

  const legacySource = await readRepoText(legacy.path);
  assert.match(legacySource, /localStorage\.getItem/);
  assert.match(legacySource, /localStorage\.setItem/);
  for (const key of legacy.observedKeys) {
    assert.equal(
      legacySource.includes(key),
      true,
      `legacy gamification evidence key ${key} disappeared; review the gap rather than silently clearing it`,
    );
  }
});

test('gap matrix names every promotion question from the G1B.2 privacy candidate', () => {
  const unresolved = matrix.unresolvedDecisions.join(' ').toLowerCase();

  for (const required of [
    'erasure disposition',
    'export treatment',
    'retention',
    'subject-discovery',
    'residue verification',
    'foreign-key',
    'non-sql',
  ]) {
    assert.match(unresolved, new RegExp(required));
  }

  assert.equal(matrix.claims.accountErasureComplete, false);
  assert.equal(matrix.claims.accountExportComplete, false);
  assert.equal(matrix.claims.retentionApproved, false);
});
