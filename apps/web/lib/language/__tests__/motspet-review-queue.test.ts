import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getMotsPetEntry } from '../motspet';
import {
  MOTSPET_NEXT_REVIEW_QUEUE,
  MOTSPET_REVIEW_QUEUE_REVISION,
  auditMotsPetReviewQueue,
  buildMotsPetReviewQueueSnapshot,
} from '../motspet-review-queue';

test('MotsPet v0.3 review queue is structurally valid', () => {
  assert.deepEqual(auditMotsPetReviewQueue(), []);
  assert.ok(MOTSPET_NEXT_REVIEW_QUEUE.length >= 7);

  for (const entry of MOTSPET_NEXT_REVIEW_QUEUE) {
    assert.equal(entry.revision, MOTSPET_REVIEW_QUEUE_REVISION);
    assert.ok(entry.internalTerms.length > 0, entry.id);
    assert.ok(entry.sourceSurfaces.length > 0, entry.id);
    assert.ok(entry.authorityPaths.length > 0, entry.id);
    assert.ok(entry.reviewQuestionFr.trim().length > 0, entry.id);
  }
});

test('review queue derives controlled and HOLD state from runtime MotsPet', () => {
  const snapshot = buildMotsPetReviewQueueSnapshot();

  assert.ok(snapshot.controlled.length >= 14);
  assert.ok(snapshot.controlled.every((entry) => entry.status === 'CONTROLLED_SEED'));
  assert.ok(snapshot.holds.some((entry) => entry.id === 'activation_change'));
  assert.ok(snapshot.holds.every((entry) => entry.status === 'HOLD'));
});

test('v0.3 core observation concepts are no longer left in candidate review', () => {
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
    const runtime = getMotsPetEntry(id);
    assert.ok(runtime, id);
    assert.equal(runtime.status, 'CONTROLLED_SEED');

    assert.equal(
      MOTSPET_NEXT_REVIEW_QUEUE.some((candidate) => candidate.id === id),
      false,
      id,
    );
  }
});

test('next review queue stays focused on concepts not yet in runtime authority', () => {
  for (const candidate of MOTSPET_NEXT_REVIEW_QUEUE) {
    assert.equal(getMotsPetEntry(candidate.id), undefined, candidate.id);
  }
});

test('relationship and community concepts remain review candidates, not sensor authority', () => {
  for (const id of [
    'explicit_preference',
    'moment',
    'memory',
    'community_visibility',
  ]) {
    const candidate = MOTSPET_NEXT_REVIEW_QUEUE.find((entry) => entry.id === id);
    assert.ok(candidate, id);
  }
});
