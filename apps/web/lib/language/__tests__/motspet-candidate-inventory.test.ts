import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MOTSPET_ENTRIES, getMotsPetEntry } from '../motspet';
import {
  MOTSPET_CANDIDATE_INVENTORY,
  MOTSPET_CANDIDATE_INVENTORY_REVISION,
  MOTSPET_NEXT_REVIEW_QUEUE,
  auditMotsPetCandidateInventory,
  buildMotsPetReviewQueueSnapshot,
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

test('inventory reconciles v0.3 observation-contract concepts as existing controlled authority', () => {
  for (const id of [
    'context',
    'time_window',
    'individual_reference',
    'limits',
    'publication_state',
    'device_state',
    'signal_quality',
    'model_version',
  ]) {
    const candidate = getMotsPetCandidateInventoryEntry(id);
    assert.ok(candidate, id);
    assert.equal(candidate.status, 'EXISTING_CONTROLLED', id);
    assert.equal(candidate.existingMotsPetId, id, id);

    const runtime = getMotsPetEntry(id);
    assert.ok(runtime, id);
    assert.equal(runtime.status, 'CONTROLLED_SEED', id);
  }
});

test('inventory keeps the remaining next-review concepts outside runtime authority', () => {
  for (const id of [
    'community_visibility',
  ]) {
    const candidate = getMotsPetCandidateInventoryEntry(id);
    assert.ok(candidate, id);
    assert.equal(candidate.status, 'CANDIDATE_REVIEW', id);
    assert.equal(candidate.existingMotsPetId, null, id);
    assert.equal(getMotsPetEntry(id), undefined, id);
  }
});

test('v0.4 uncertainty and trend are reconciled as bounded controlled concepts', () => {
  for (const id of ['uncertainty', 'trend']) {
    const candidate = getMotsPetCandidateInventoryEntry(id);
    assert.ok(candidate, id);
    assert.equal(candidate.status, 'EXISTING_CONTROLLED', id);
    assert.equal(candidate.existingMotsPetId, id, id);

    const runtime = getMotsPetEntry(id);
    assert.ok(runtime, id);
    assert.equal(runtime.status, 'CONTROLLED_SEED', id);
  }
});

test('explicit preference is reconciled as controlled Owner-preference authority', () => {
  const candidate = getMotsPetCandidateInventoryEntry('explicit_preference');
  assert.ok(candidate);
  assert.equal(candidate.status, 'EXISTING_CONTROLLED');
  assert.equal(candidate.existingMotsPetId, 'explicit_preference');

  const runtime = getMotsPetEntry('explicit_preference');
  assert.ok(runtime);
  assert.equal(runtime.status, 'CONTROLLED_SEED');
});

test('share scope is reconciled as controlled privacy metadata', () => {
  const candidate = getMotsPetCandidateInventoryEntry('share_scope');
  assert.ok(candidate);
  assert.equal(candidate.status, 'EXISTING_CONTROLLED');
  assert.equal(candidate.existingMotsPetId, 'share_scope');

  const runtime = getMotsPetEntry('share_scope');
  assert.ok(runtime);
  assert.equal(runtime.status, 'CONTROLLED_SEED');
  assert.equal(runtime.domain, 'privacy');
});

test('Moment and Memory are controlled relationship-history concepts, not sensor-derived authority', () => {
  for (const id of ['moment', 'memory']) {
    const candidate = getMotsPetCandidateInventoryEntry(id);
    assert.ok(candidate, id);
    assert.equal(candidate.status, 'EXISTING_CONTROLLED', id);
    assert.equal(candidate.existingMotsPetId, id, id);

    const runtime = getMotsPetEntry(id);
    assert.ok(runtime, id);
    assert.equal(runtime.status, 'CONTROLLED_SEED', id);
    assert.equal(runtime.domain, 'relationship', id);
  }
});

test('Community visibility remains outside runtime MotsPet authority', () => {
  const candidate = getMotsPetCandidateInventoryEntry('community_visibility');
  assert.ok(candidate);
  assert.equal(candidate.status, 'CANDIDATE_REVIEW');
  assert.equal(candidate.existingMotsPetId, null);
  assert.equal(getMotsPetEntry('community_visibility'), undefined);
});


test('candidate inventory mirrors every runtime MotsPet authority exactly once', () => {
  for (const runtime of MOTSPET_ENTRIES) {
    const mirrors = MOTSPET_CANDIDATE_INVENTORY.filter(
      (candidate) => candidate.existingMotsPetId === runtime.id,
    );

    assert.equal(mirrors.length, 1, runtime.id);

    const expectedStatus =
      runtime.status === 'CONTROLLED_SEED'
        ? 'EXISTING_CONTROLLED'
        : 'AUTHORITY_HOLD';

    assert.equal(mirrors[0]!.status, expectedStatus, runtime.id);
  }
});


test('review queue is derived from the canonical candidate inventory', () => {
  const projectedIds = MOTSPET_NEXT_REVIEW_QUEUE.map((entry) => entry.id);
  const canonicalIds = MOTSPET_CANDIDATE_INVENTORY
    .filter((entry) => entry.status === 'CANDIDATE_REVIEW')
    .map((entry) => entry.id);

  assert.deepEqual(projectedIds, canonicalIds);
  assert.deepEqual(projectedIds, [
    'community_visibility',
  ]);
});

test('review queue snapshot derives runtime controlled and HOLD state without duplication', () => {
  const snapshot = buildMotsPetReviewQueueSnapshot();

  assert.equal(snapshot.revision, MOTSPET_CANDIDATE_INVENTORY_REVISION);
  assert.ok(snapshot.controlled.length >= 14);
  assert.ok(
    snapshot.controlled.every((entry) => entry.status === 'CONTROLLED_SEED'),
  );
  assert.ok(snapshot.holds.some((entry) => entry.id === 'activation_change'));
  assert.ok(snapshot.holds.every((entry) => entry.status === 'HOLD'));
  assert.equal(snapshot.candidates, MOTSPET_NEXT_REVIEW_QUEUE);
});
