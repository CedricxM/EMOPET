import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MOTSPET_CANDIDATE_INVENTORY,
  MOTSPET_CANDIDATE_INVENTORY_REVISION,
} from '../motspet-candidate-inventory';
import {
  MOTSPET_NEXT_REVIEW_QUEUE,
  MOTSPET_REVIEW_QUEUE_REVISION,
  auditMotsPetReviewQueue,
  buildMotsPetReviewQueueSnapshot,
} from '../motspet-review-queue';

test('MotsPet review queue is a valid projection of the canonical inventory', () => {
  assert.deepEqual(auditMotsPetReviewQueue(), []);

  const snapshot = buildMotsPetReviewQueueSnapshot();
  assert.equal(snapshot.revision, MOTSPET_REVIEW_QUEUE_REVISION);
  assert.equal(
    snapshot.sourceInventoryRevision,
    MOTSPET_CANDIDATE_INVENTORY_REVISION,
  );

  assert.equal(
    snapshot.controlled.length + snapshot.holds.length + snapshot.candidates.length,
    MOTSPET_CANDIDATE_INVENTORY.length,
  );
});

test('next review queue contains only canonical CANDIDATE_REVIEW entries', () => {
  const canonicalCandidates = MOTSPET_CANDIDATE_INVENTORY.filter(
    (entry) => entry.status === 'CANDIDATE_REVIEW',
  );

  assert.deepEqual(MOTSPET_NEXT_REVIEW_QUEUE, canonicalCandidates);
  assert.deepEqual(
    MOTSPET_NEXT_REVIEW_QUEUE.map((entry) => entry.id),
    [
      'uncertainty',
      'trend',
      'share_scope',
      'explicit_preference',
      'moment',
      'memory',
      'community_visibility',
    ],
  );
  assert.ok(
    MOTSPET_NEXT_REVIEW_QUEUE.every(
      (entry) => entry.existingMotsPetId === null,
    ),
  );
});

test('v0.3 observation concepts are controlled rather than pending review', () => {
  const snapshot = buildMotsPetReviewQueueSnapshot();

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
    assert.ok(snapshot.controlled.some((entry) => entry.id === id), id);
    assert.equal(snapshot.candidates.some((entry) => entry.id === id), false);
  }
});

test('activation_change stays in the authority HOLD bucket', () => {
  const snapshot = buildMotsPetReviewQueueSnapshot();

  assert.ok(snapshot.holds.some((entry) => entry.id === 'activation_change'));
  assert.equal(
    snapshot.candidates.some((entry) => entry.id === 'activation_change'),
    false,
  );
});

test('review queue does not duplicate canonical candidate metadata', () => {
  const snapshot = buildMotsPetReviewQueueSnapshot();

  for (const candidate of snapshot.candidates) {
    const canonical = MOTSPET_CANDIDATE_INVENTORY.find(
      (entry) => entry.id === candidate.id,
    );
    assert.equal(candidate, canonical);
  }
});
