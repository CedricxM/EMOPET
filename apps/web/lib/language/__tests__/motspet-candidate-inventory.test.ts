import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getMotsPetEntry } from '../motspet';
import {
  MOTSPET_CANDIDATE_INVENTORY,
  MOTSPET_CANDIDATE_INVENTORY_REVISION,
  auditMotsPetCandidateInventory,
  getMotsPetCandidateInventoryEntry,
} from '../motspet-candidate-inventory';

test('MotsPet candidate inventory is structurally valid', () => {
  assert.deepEqual(auditMotsPetCandidateInventory(), []);
  assert.ok(MOTSPET_CANDIDATE_INVENTORY.length >= 20);

  for (const candidate of MOTSPET_CANDIDATE_INVENTORY) {
    assert.equal(candidate.revision, MOTSPET_CANDIDATE_INVENTORY_REVISION);
    assert.ok(candidate.internalTerms.length > 0, candidate.id);
    assert.ok(candidate.sourceSurfaces.length > 0, candidate.id);
    assert.ok(candidate.authorityPaths.length > 0, candidate.id);
  }
});

test('existing controlled candidates bind only to controlled runtime MotsPet entries', () => {
  for (const candidate of MOTSPET_CANDIDATE_INVENTORY.filter(
    (entry) => entry.status === 'EXISTING_CONTROLLED',
  )) {
    assert.ok(candidate.existingMotsPetId);
    const runtime = getMotsPetEntry(candidate.existingMotsPetId!);
    assert.ok(runtime);
    assert.equal(runtime.status, 'CONTROLLED_SEED');
  }
});

test('candidate-review concepts remain outside runtime MotsPet authority', () => {
  const candidates = MOTSPET_CANDIDATE_INVENTORY.filter(
    (entry) => entry.status === 'CANDIDATE_REVIEW',
  );

  assert.ok(candidates.length >= 10);

  for (const candidate of candidates) {
    assert.equal(candidate.existingMotsPetId, null);
    assert.equal(getMotsPetEntry(candidate.id), undefined);
  }
});

test('activation-change remains an explicit authority HOLD', () => {
  const candidate = getMotsPetCandidateInventoryEntry('activation_change');
  assert.ok(candidate);
  assert.equal(candidate.status, 'AUTHORITY_HOLD');
  assert.equal(candidate.existingMotsPetId, 'activation_change');

  const runtime = getMotsPetEntry('activation_change');
  assert.ok(runtime);
  assert.equal(runtime.status, 'HOLD');
});

test('inventory includes next evidence-contract concepts before UI wording migration', () => {
  for (const id of [
    'context',
    'time_window',
    'reference',
    'limits',
    'signal_quality',
    'uncertainty',
    'trend',
  ]) {
    const candidate = getMotsPetCandidateInventoryEntry(id);
    assert.ok(candidate, id);
    assert.equal(candidate.status, 'CANDIDATE_REVIEW');
  }
});

test('relationship/community candidates do not become sensor-derived authority', () => {
  for (const id of [
    'explicit_preference',
    'moment',
    'memory',
    'community_visibility',
  ]) {
    const candidate = getMotsPetCandidateInventoryEntry(id);
    assert.ok(candidate, id);
    assert.equal(candidate.status, 'CANDIDATE_REVIEW');
    assert.equal(candidate.existingMotsPetId, null);
  }
});
