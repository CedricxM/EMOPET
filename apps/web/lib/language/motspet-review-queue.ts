/**
 * MotsPet review queue v3.
 *
 * This is a projection of the canonical candidate inventory, never a second
 * manually-maintained concept list.
 */

import {
  MOTSPET_CANDIDATE_INVENTORY,
  MOTSPET_CANDIDATE_INVENTORY_REVISION,
  auditMotsPetCandidateInventory,
  type MotsPetCandidateInventoryEntry,
} from './motspet-candidate-inventory';

export const MOTSPET_REVIEW_QUEUE_REVISION =
  'motspet-review-queue-v3-2026-10-01' as const;

export interface MotsPetReviewQueueSnapshot {
  revision: typeof MOTSPET_REVIEW_QUEUE_REVISION;
  sourceInventoryRevision: typeof MOTSPET_CANDIDATE_INVENTORY_REVISION;
  controlled: readonly MotsPetCandidateInventoryEntry[];
  holds: readonly MotsPetCandidateInventoryEntry[];
  candidates: readonly MotsPetCandidateInventoryEntry[];
}

export const MOTSPET_NEXT_REVIEW_QUEUE: readonly MotsPetCandidateInventoryEntry[] =
  MOTSPET_CANDIDATE_INVENTORY.filter(
    (entry) => entry.status === 'CANDIDATE_REVIEW',
  );

export function buildMotsPetReviewQueueSnapshot(): MotsPetReviewQueueSnapshot {
  return {
    revision: MOTSPET_REVIEW_QUEUE_REVISION,
    sourceInventoryRevision: MOTSPET_CANDIDATE_INVENTORY_REVISION,
    controlled: MOTSPET_CANDIDATE_INVENTORY.filter(
      (entry) => entry.status === 'EXISTING_CONTROLLED',
    ),
    holds: MOTSPET_CANDIDATE_INVENTORY.filter(
      (entry) => entry.status === 'AUTHORITY_HOLD',
    ),
    candidates: MOTSPET_NEXT_REVIEW_QUEUE,
  };
}

export function auditMotsPetReviewQueue(): string[] {
  const errors = auditMotsPetCandidateInventory().map(
    (error) => 'candidate inventory: ' + error,
  );
  const snapshot = buildMotsPetReviewQueueSnapshot();

  const projected = [
    ...snapshot.controlled,
    ...snapshot.holds,
    ...snapshot.candidates,
  ];

  if (projected.length !== MOTSPET_CANDIDATE_INVENTORY.length) {
    errors.push('review queue projection does not cover the full candidate inventory');
  }

  const seen = new Set<string>();
  for (const entry of projected) {
    if (seen.has(entry.id)) {
      errors.push(entry.id + ': projected into more than one review bucket');
    }
    seen.add(entry.id);
  }

  for (const entry of snapshot.candidates) {
    if (entry.existingMotsPetId !== null) {
      errors.push(entry.id + ': review candidate must stay outside runtime authority');
    }
  }

  for (const entry of snapshot.holds) {
    if (entry.status !== 'AUTHORITY_HOLD') {
      errors.push(entry.id + ': HOLD projection status mismatch');
    }
  }

  return errors;
}
