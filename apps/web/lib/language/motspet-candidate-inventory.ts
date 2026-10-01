/**
 * MotsPet candidate inventory v2.
 *
 * This inventory is deliberately upstream of public wording. It records the
 * next concepts that need language review without promoting them into the
 * runtime MotsPet lexicon.
 */

import { MOTSPET_ENTRIES, getMotsPetEntry } from './motspet';

export const MOTSPET_CANDIDATE_INVENTORY_REVISION =
  'motspet-candidate-inventory-v2-2026-10-01' as const;

export type MotsPetCandidateStatus =
  | 'EXISTING_CONTROLLED'
  | 'CANDIDATE_REVIEW'
  | 'AUTHORITY_HOLD';

export interface MotsPetCandidateInventoryEntry {
  id: string;
  domain:
    | 'care'
    | 'science'
    | 'privacy'
    | 'relationship'
    | 'community'
    | 'product';
  internalTerms: readonly string[];
  sourceSurfaces: readonly string[];
  reviewQuestionFr: string;
  authorityPaths: readonly string[];
  status: MotsPetCandidateStatus;
  existingMotsPetId: string | null;
  revision: typeof MOTSPET_CANDIDATE_INVENTORY_REVISION;
}

const CARE =
  'docs/product/EMOPET_CARE_PRODUCT_MASTER_v0.1.md';
const CARE_MIGRATION =
  'docs/product/CARE_UI_MIGRATION_MAP_2026-09-07.md';
const EXPERIENCE =
  'docs/product/EMOPET_EXPERIENCE_DOCTRINE_v0.1.md';
const AUTHORITY_MAP =
  'docs/control/EMOPET_PRODUCT_AUTHORITY_MAP_v0.1.md';
const OWNER_AUTHORITY =
  'docs/product/EMOPET_OWNER_AUTHORITY_MASTER_v0.1.md';
const TOGETHER =
  'docs/product/EMOPET_TOGETHER_RELATIONSHIP_ENGINE_MASTER_v0.1.md';
const SURFACES =
  'docs/product/EMOPET_SURFACE_NECESSITY_MATRIX_v0.1.md';
const DATA_TRUST =
  'docs/strategy/DATA_TRUST_AND_BUSINESS_MODEL_DOCTRINE_2026-09-07.md';

function entry(
  value: Omit<MotsPetCandidateInventoryEntry, 'revision'>,
): MotsPetCandidateInventoryEntry {
  return { ...value, revision: MOTSPET_CANDIDATE_INVENTORY_REVISION };
}

export const MOTSPET_CANDIDATE_INVENTORY: readonly MotsPetCandidateInventoryEntry[] = [
  entry({
    id: 'observation',
    domain: 'care',
    internalTerms: ['observation', 'published_observation'],
    sourceSurfaces: ['Care', 'Breiz'],
    reviewQuestionFr: 'Conserver le mot observation comme unité publique bornée par preuve et contexte.',
    authorityPaths: [CARE, EXPERIENCE],
    status: 'EXISTING_CONTROLLED',
    existingMotsPetId: 'observation',
  }),
  entry({
    id: 'owner_note',
    domain: 'care',
    internalTerms: ['owner_note', 'owner_journal_entry'],
    sourceSurfaces: ['Care', 'Vet share'],
    reviewQuestionFr: 'Distinguer explicitement une note saisie par le propriétaire d’une observation EMOPET.',
    authorityPaths: [CARE, OWNER_AUTHORITY],
    status: 'EXISTING_CONTROLLED',
    existingMotsPetId: 'owner_note',
  }),
  entry({
    id: 'confidence',
    domain: 'science',
    internalTerms: ['confidence', 'quality_confidence'],
    sourceSurfaces: ['Care', 'History'],
    reviewQuestionFr: 'Exprimer la confiance sans la transformer en certitude ni score de santé.',
    authorityPaths: [CARE, CARE_MIGRATION],
    status: 'EXISTING_CONTROLLED',
    existingMotsPetId: 'confidence',
  }),
  entry({
    id: 'insufficient_evidence',
    domain: 'science',
    internalTerms: ['suppressed', 'no_result', 'insufficient_evidence'],
    sourceSurfaces: ['Care', 'Breiz'],
    reviewQuestionFr: 'Rendre l’abstention compréhensible sans rassurer à tort.',
    authorityPaths: [CARE, EXPERIENCE],
    status: 'EXISTING_CONTROLLED',
    existingMotsPetId: 'insufficient_evidence',
  }),
  entry({
    id: 'source',
    domain: 'care',
    internalTerms: ['source', 'provenance', 'source_id'],
    sourceSurfaces: ['Care', 'Breiz', 'Professional share'],
    reviewQuestionFr: 'Rendre l’origine d’une information lisible sans masquer les limites de la source.',
    authorityPaths: [CARE, AUTHORITY_MAP],
    status: 'EXISTING_CONTROLLED',
    existingMotsPetId: 'source',
  }),
  entry({
    id: 'consent',
    domain: 'privacy',
    internalTerms: ['consent', 'consent_state', 'contribution_permission'],
    sourceSurfaces: ['Privacy', 'Community', 'Professional share'],
    reviewQuestionFr: 'Préserver un consentement lié à une finalité précise, jamais global par défaut.',
    authorityPaths: [DATA_TRUST, OWNER_AUTHORITY],
    status: 'EXISTING_CONTROLLED',
    existingMotsPetId: 'consent',
  }),
  entry({
    id: 'activation_change',
    domain: 'science',
    internalTerms: ['arousal', 'activation', 'activation_change'],
    sourceSurfaces: ['Care'],
    reviewQuestionFr: 'Trouver une formulation publique non émotionnelle et non diagnostique avant toute activation.',
    authorityPaths: [CARE, CARE_MIGRATION],
    status: 'AUTHORITY_HOLD',
    existingMotsPetId: 'activation_change',
  }),
  entry({
    id: 'context',
    domain: 'care',
    internalTerms: ['context', 'observation_context'],
    sourceSurfaces: ['Care', 'Breiz'],
    reviewQuestionFr: 'Définir comment expliquer le contexte concret auquel une observation s’applique.',
    authorityPaths: [CARE, CARE_MIGRATION],
    status: 'EXISTING_CONTROLLED',
    existingMotsPetId: 'context',
  }),
  entry({
    id: 'time_window',
    domain: 'care',
    internalTerms: ['timeWindow', 'time_window'],
    sourceSurfaces: ['Care', 'History'],
    reviewQuestionFr: 'Nommer une période d’observation sans laisser croire à une mesure continue exhaustive.',
    authorityPaths: [CARE, CARE_MIGRATION],
    status: 'EXISTING_CONTROLLED',
    existingMotsPetId: 'time_window',
  }),
  entry({
    id: 'individual_reference',
    domain: 'science',
    internalTerms: ['individual_reference', 'contextual_reference', 'baseline_reference'],
    sourceSurfaces: ['Care', 'History'],
    reviewQuestionFr: 'Maintenir la référence comme repère propre au chien, sans norme universelle, percentile de race ni classement.',
    authorityPaths: [CARE, CARE_MIGRATION],
    status: 'EXISTING_CONTROLLED',
    existingMotsPetId: 'individual_reference',
  }),
  entry({
    id: 'limits',
    domain: 'science',
    internalTerms: ['limits', 'observation_limits'],
    sourceSurfaces: ['Care', 'Professional share'],
    reviewQuestionFr: 'Rendre visibles les limites de mesure/interprétation sans jargon inutile.',
    authorityPaths: [CARE, CARE_MIGRATION],
    status: 'EXISTING_CONTROLLED',
    existingMotsPetId: 'limits',
  }),
  entry({
    id: 'publication_state',
    domain: 'science',
    internalTerms: ['publication_state', 'publication_decision', 'eligibility_state'],
    sourceSurfaces: ['Care', 'History'],
    reviewQuestionFr: 'Conserver un état de publication distinct d’une validation scientifique, clinique ou médicale.',
    authorityPaths: [CARE, CARE_MIGRATION],
    status: 'EXISTING_CONTROLLED',
    existingMotsPetId: 'publication_state',
  }),
  entry({
    id: 'signal_quality',
    domain: 'science',
    internalTerms: ['signal_quality', 'quality_state'],
    sourceSurfaces: ['Care', 'Device state'],
    reviewQuestionFr: 'Distinguer qualité du signal et confiance dans une observation.',
    authorityPaths: [CARE],
    status: 'EXISTING_CONTROLLED',
    existingMotsPetId: 'signal_quality',
  }),
  entry({
    id: 'device_state',
    domain: 'product',
    internalTerms: ['device_state', 'capture_state'],
    sourceSurfaces: ['Care', 'Devices'],
    reviewQuestionFr: 'Nommer l’état technique du dispositif sans l’interpréter comme état du chien.',
    authorityPaths: [CARE, AUTHORITY_MAP],
    status: 'EXISTING_CONTROLLED',
    existingMotsPetId: 'device_state',
  }),
  entry({
    id: 'model_version',
    domain: 'science',
    internalTerms: ['model_version', 'inference_version', 'pipeline_version'],
    sourceSurfaces: ['Care', 'Professional share'],
    reviewQuestionFr: 'Exposer la version du modèle comme provenance technique, sans en faire une garantie de performance.',
    authorityPaths: [CARE, AUTHORITY_MAP],
    status: 'EXISTING_CONTROLLED',
    existingMotsPetId: 'model_version',
  }),
  entry({
    id: 'uncertainty',
    domain: 'science',
    internalTerms: ['uncertainty', 'uncertain'],
    sourceSurfaces: ['Care', 'Breiz'],
    reviewQuestionFr: 'Exprimer l’incertitude de façon actionnable sans produire une fausse précision.',
    authorityPaths: [CARE, EXPERIENCE],
    status: 'CANDIDATE_REVIEW',
    existingMotsPetId: null,
  }),
  entry({
    id: 'trend',
    domain: 'science',
    internalTerms: ['trend', 'longitudinal_change'],
    sourceSurfaces: ['Care history'],
    reviewQuestionFr: 'Parler d’évolution longitudinale uniquement pour une observation nommée et contextualisée.',
    authorityPaths: [CARE_MIGRATION, CARE],
    status: 'CANDIDATE_REVIEW',
    existingMotsPetId: null,
  }),
  entry({
    id: 'share_scope',
    domain: 'privacy',
    internalTerms: ['share_scope', 'professional_share_scope', 'audience_scope'],
    sourceSurfaces: ['Professional share', 'Community'],
    reviewQuestionFr: 'Expliquer précisément ce qui est partagé, avec qui et pour quelle durée/finalité.',
    authorityPaths: [OWNER_AUTHORITY, AUTHORITY_MAP],
    status: 'CANDIDATE_REVIEW',
    existingMotsPetId: null,
  }),
  entry({
    id: 'explicit_preference',
    domain: 'relationship',
    internalTerms: ['explicit_preference', 'preference', 'refusal'],
    sourceSurfaces: ['Together', 'Breiz'],
    reviewQuestionFr: 'Distinguer une préférence déclarée d’une préférence inférée ou d’un jugement sur la relation.',
    authorityPaths: [TOGETHER, EXPERIENCE],
    status: 'CANDIDATE_REVIEW',
    existingMotsPetId: null,
  }),
  entry({
    id: 'moment',
    domain: 'relationship',
    internalTerms: ['moment', 'intentional_capture'],
    sourceSurfaces: ['Moments', 'Memories'],
    reviewQuestionFr: 'Préserver le caractère volontaire et privé par défaut d’une capture de moment.',
    authorityPaths: [SURFACES, EXPERIENCE],
    status: 'CANDIDATE_REVIEW',
    existingMotsPetId: null,
  }),
  entry({
    id: 'memory',
    domain: 'relationship',
    internalTerms: ['memory', 'deliberate_memory'],
    sourceSurfaces: ['Memories'],
    reviewQuestionFr: 'Décrire une mémoire choisie sans fabriquer de récit sentimental depuis les capteurs.',
    authorityPaths: [SURFACES, AUTHORITY_MAP],
    status: 'CANDIDATE_REVIEW',
    existingMotsPetId: null,
  }),
  entry({
    id: 'community_visibility',
    domain: 'community',
    internalTerms: ['visibility', 'audience', 'community_visibility'],
    sourceSurfaces: ['Community', 'Circles', 'World'],
    reviewQuestionFr: 'Rendre l’audience et la visibilité explicites sans exposition automatique de données privées.',
    authorityPaths: [SURFACES, OWNER_AUTHORITY],
    status: 'CANDIDATE_REVIEW',
    existingMotsPetId: null,
  }),
] as const;

export function getMotsPetCandidateInventoryEntry(
  id: string,
): MotsPetCandidateInventoryEntry | undefined {
  return MOTSPET_CANDIDATE_INVENTORY.find((candidate) => candidate.id === id);
}

/**
 * Derived review queue.
 *
 * This is intentionally a projection of the canonical candidate inventory,
 * not a second manually-maintained list.
 */
export const MOTSPET_NEXT_REVIEW_QUEUE =
  MOTSPET_CANDIDATE_INVENTORY.filter(
    (entry) => entry.status === 'CANDIDATE_REVIEW',
  );

export function buildMotsPetReviewQueueSnapshot() {
  return {
    revision: MOTSPET_CANDIDATE_INVENTORY_REVISION,
    controlled: MOTSPET_ENTRIES.filter(
      (entry) => entry.status === 'CONTROLLED_SEED',
    ),
    holds: MOTSPET_ENTRIES.filter((entry) => entry.status === 'HOLD'),
    candidates: MOTSPET_NEXT_REVIEW_QUEUE,
  } as const;
}

export function auditMotsPetCandidateInventory(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const candidate of MOTSPET_CANDIDATE_INVENTORY) {
    if (seen.has(candidate.id)) errors.push(candidate.id + ': duplicate id');
    seen.add(candidate.id);

    if (candidate.authorityPaths.length === 0) {
      errors.push(candidate.id + ': no authority path');
    }
    if (candidate.reviewQuestionFr.trim().length === 0) {
      errors.push(candidate.id + ': blank review question');
    }

    if (candidate.status === 'EXISTING_CONTROLLED') {
      const existing = candidate.existingMotsPetId
        ? getMotsPetEntry(candidate.existingMotsPetId)
        : undefined;
      if (!existing || existing.status !== 'CONTROLLED_SEED') {
        errors.push(candidate.id + ': existing controlled concept mismatch');
      }
    }

    if (candidate.status === 'AUTHORITY_HOLD') {
      const existing = candidate.existingMotsPetId
        ? getMotsPetEntry(candidate.existingMotsPetId)
        : undefined;
      if (!existing || existing.status !== 'HOLD') {
        errors.push(candidate.id + ': authority HOLD concept mismatch');
      }
    }

    if (
      candidate.status === 'CANDIDATE_REVIEW' &&
      candidate.existingMotsPetId !== null
    ) {
      errors.push(candidate.id + ': candidate review must not point to runtime authority');
    }
  }

  const inventoryByRuntimeId = new Map<
    string,
    readonly MotsPetCandidateInventoryEntry[]
  >();

  for (const candidate of MOTSPET_CANDIDATE_INVENTORY) {
    if (!candidate.existingMotsPetId) continue;
    const current = inventoryByRuntimeId.get(candidate.existingMotsPetId) ?? [];
    inventoryByRuntimeId.set(candidate.existingMotsPetId, [...current, candidate]);
  }

  for (const runtimeEntry of MOTSPET_ENTRIES) {
    const mirrored = inventoryByRuntimeId.get(runtimeEntry.id) ?? [];

    if (mirrored.length !== 1) {
      errors.push(
        runtimeEntry.id +
          ': runtime MotsPet concept must appear exactly once in candidate inventory',
      );
      continue;
    }

    const candidate = mirrored[0]!;
    const expectedStatus =
      runtimeEntry.status === 'CONTROLLED_SEED'
        ? 'EXISTING_CONTROLLED'
        : 'AUTHORITY_HOLD';

    if (candidate.status !== expectedStatus) {
      errors.push(
        runtimeEntry.id +
          ': runtime status ' +
          runtimeEntry.status +
          ' must map to inventory status ' +
          expectedStatus,
      );
    }
  }

  return errors;
}
