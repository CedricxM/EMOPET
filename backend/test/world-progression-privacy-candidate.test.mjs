import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const candidate = JSON.parse(
  await readFile(
    new URL('../../config/world/world-progression-privacy-candidate-v1.json', import.meta.url),
    'utf8',
  ),
);

test('G1B.2 privacy plan remains candidate-only and non-authoritative', () => {
  assert.equal(candidate.status, 'CANDIDATE_NOT_PROMOTED');
  assert.equal(candidate.productionAuthority, false);
  assert.equal(
    candidate.mappingAuthority,
    'TECHNICAL_WORLD_PERSISTENCE_PLAN_NOT_LEGAL_SIGNOFF',
  );
  assert.equal(
    candidate.lifecyclePolicyStatus,
    'TO_CONFIRM_BEFORE_DURABLE_ACTIVATION_ACCOUNT_ERASURE_OR_COMPLETE_ACCOUNT_EXPORT',
  );

  assert.deepEqual(candidate.claims, {
    completeAccountErasure: false,
    completeAccountExport: false,
    approvedRetention: false,
    executableErasure: false,
    durableProductionPersistence: false,
  });
});

test('every planned World table is a direct Owner relation with unresolved lifecycle policy', () => {
  const expected = new Set([
    'world_progression_events',
    'world_owned_items',
    'world_resource_spends',
  ]);

  assert.deepEqual(
    new Set(candidate.relations.map((relation) => relation.table)),
    expected,
  );

  for (const relation of candidate.relations) {
    assert.equal(relation.column, 'owner_id');
    assert.equal(relation.relationType, 'DIRECT_FK');
    assert.match(relation.technicalCategoryCandidate, /^account_product_/);
    assert.equal(relation.erasureDisposition, 'TO_CONFIRM');
    assert.equal(relation.exportDisposition, 'TO_CONFIRM');
    assert.equal(relation.retentionDisposition, 'TO_CONFIRM');
    assert.equal(relation.subjectDiscoveryRequired, true);
    assert.equal(relation.residueVerificationRequired, true);
  }
});

test('durable schema foundation is present but not privacy-promoted', () => {
  assert.deepEqual(candidate.durableSchemaFoundation, {
    migration: 'backend/db/migrations/0046_world_gamification_persistence.sql',
    schema: 'backend/db/schema/world-gamification.ts',
    status: 'PRESENT_NOT_PRIVACY_PROMOTED',
    productionWritesActivated: false,
  });
});

test('privacy promotion requires lineage, erasure, export, retention, discovery and residue reconciliation', () => {
  const requirements = candidate.promotionRequirements.join(' ').toLowerCase();

  for (const required of [
    'user-subject-lineage',
    'account-erasure-topology',
    'subject-persistence-privacy-coverage',
    'erasure-disposition-matrix',
    'data-export authority',
    'retention authority',
    'subject discovery',
    'erasure residue verification',
    'foreign keys',
    'non-sql world progression copy',
  ]) {
    assert.match(requirements, new RegExp(required));
  }
});
