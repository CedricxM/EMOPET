/**
 * MotsPet review queue v2.
 *
 * Runtime-controlled concepts are derived from MotsPet v0.3. This file only
 * names concepts that still need review, so the queue cannot become stale when
 * a concept is promoted into the runtime lexicon.
 */

import { MOTSPET_ENTRIES } from './motspet';

export const MOTSPET_REVIEW_QUEUE_REVISION =
  'motspet-review-queue-v2-2026-10-01' as const;

export interface MotsPetNextReviewCandidate {
  id: string;
  domain: 'science' | 'privacy' | 'relationship' | 'community';
  internalTerms: readonly string[];
  sourceSurfaces: readonly string[];
  reviewQuestionFr: string;
  authorityPaths: readonly string[];
  revision: typeof MOTSPET_REVIEW_QUEUE_REVISION;
}

const CARE = 'docs/product/EMOPET_CARE_PRODUCT_MASTER_v0.1.md';
const CARE_MIGRATION = 'docs/product/CARE_UI_MIGRATION_MAP_2026-09-07.md';
const EXPERIENCE = 'docs/product/EMOPET_EXPERIENCE_DOCTRINE_v0.1.md';
const AUTHORITY_MAP = 'docs/control/EMOPET_PRODUCT_AUTHORITY_MAP_v0.1.md';
const OWNER_AUTHORITY = 'docs/product/EMOPET_OWNER_AUTHORITY_MASTER_v0.1.md';
const TOGETHER = 'docs/product/EMOPET_TOGETHER_RELATIONSHIP_ENGINE_MASTER_v0.1.md';
const SURFACES = 'docs/product/EMOPET_SURFACE_NECESSITY_MATRIX_v0.1.md';

function candidate(
  value: Omit<MotsPetNextReviewCandidate, 'revision'>,
): MotsPetNextReviewCandidate {
  return { ...value, revision: MOTSPET_REVIEW_QUEUE_REVISION };
}

export const MOTSPET_NEXT_REVIEW_QUEUE: readonly MotsPetNextReviewCandidate[] = [
  candidate({
    id: 'uncertainty',
    domain: 'science',
    internalTerms: ['uncertainty', 'uncertain'],
    sourceSurfaces: ['Care', 'Breiz'],
    reviewQuestionFr:
      'Exprimer l’incertitude de façon actionnable sans produire une fausse précision.',
    authorityPaths: [CARE, EXPERIENCE],
  }),
  candidate({
    id: 'trend',
    domain: 'science',
    internalTerms: ['trend', 'longitudinal_change'],
    sourceSurfaces: ['Care history'],
    reviewQuestionFr:
      'Parler d’évolution longitudinale uniquement pour une observation nommée et contextualisée.',
    authorityPaths: [CARE_MIGRATION, CARE],
  }),
  candidate({
    id: 'share_scope',
    domain: 'privacy',
    internalTerms: ['share_scope', 'professional_share_scope', 'audience_scope'],
    sourceSurfaces: ['Professional share', 'Community'],
    reviewQuestionFr:
      'Expliquer ce qui est partagé, avec qui, pour quelle finalité et quelle durée.',
    authorityPaths: [OWNER_AUTHORITY, AUTHORITY_MAP],
  }),
  candidate({
    id: 'explicit_preference',
    domain: 'relationship',
    internalTerms: ['explicit_preference', 'preference', 'refusal'],
    sourceSurfaces: ['Together', 'Breiz'],
    reviewQuestionFr:
      'Distinguer une préférence déclarée d’une préférence inférée ou d’un jugement sur la relation.',
    authorityPaths: [TOGETHER, EXPERIENCE],
  }),
  candidate({
    id: 'moment',
    domain: 'relationship',
    internalTerms: ['moment', 'intentional_capture'],
    sourceSurfaces: ['Moments', 'Memories'],
    reviewQuestionFr:
      'Préserver le caractère volontaire et privé par défaut d’une capture de moment.',
    authorityPaths: [SURFACES, EXPERIENCE],
  }),
  candidate({
    id: 'memory',
    domain: 'relationship',
    internalTerms: ['memory', 'deliberate_memory'],
    sourceSurfaces: ['Memories'],
    reviewQuestionFr:
      'Décrire une mémoire choisie sans fabriquer de récit sentimental depuis les capteurs.',
    authorityPaths: [SURFACES, AUTHORITY_MAP],
  }),
  candidate({
    id: 'community_visibility',
    domain: 'community',
    internalTerms: ['visibility', 'audience', 'community_visibility'],
    sourceSurfaces: ['Community', 'Circles', 'World'],
    reviewQuestionFr:
      'Rendre l’audience et la visibilité explicites sans exposition automatique de données privées.',
    authorityPaths: [SURFACES, OWNER_AUTHORITY],
  }),
] as const;

export function buildMotsPetReviewQueueSnapshot() {
  return {
    revision: MOTSPET_REVIEW_QUEUE_REVISION,
    controlled: MOTSPET_ENTRIES.filter((entry) => entry.status === 'CONTROLLED_SEED'),
    holds: MOTSPET_ENTRIES.filter((entry) => entry.status === 'HOLD'),
    candidates: MOTSPET_NEXT_REVIEW_QUEUE,
  } as const;
}

export function auditMotsPetReviewQueue(): string[] {
  const errors: string[] = [];
  const runtimeIds = new Set(MOTSPET_ENTRIES.map((entry) => entry.id));
  const candidateIds = new Set<string>();

  for (const entry of MOTSPET_NEXT_REVIEW_QUEUE) {
    if (candidateIds.has(entry.id)) errors.push(entry.id + ': duplicate candidate id');
    candidateIds.add(entry.id);

    if (runtimeIds.has(entry.id)) {
      errors.push(entry.id + ': candidate already exists in runtime MotsPet');
    }
    if (entry.internalTerms.length === 0) {
      errors.push(entry.id + ': no internal terms');
    }
    if (entry.sourceSurfaces.length === 0) {
      errors.push(entry.id + ': no source surfaces');
    }
    if (entry.authorityPaths.length === 0) {
      errors.push(entry.id + ': no authority paths');
    }
    if (entry.reviewQuestionFr.trim().length === 0) {
      errors.push(entry.id + ': blank review question');
    }
  }

  return errors;
}
