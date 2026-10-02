/**
 * MotsPet — controlled human-language lexicon foundation.
 *
 * MotsPet sits between EMOPET semantic/scientific authorities and user-facing
 * language. It never creates scientific/legal authority by itself.
 */

export const MOTSPET_REVISION = 'motspet-v0.5-seed-2026-10-02' as const;

export type MotsPetDomain =
  | 'care'
  | 'science'
  | 'privacy'
  | 'relationship'
  | 'community'
  | 'regional'
  | 'product';

export type MotsPetStatus = 'CONTROLLED_SEED' | 'HOLD';

export type MotsPetReviewState =
  | 'INTERNAL_AUTHORITY_MAPPED'
  | 'EXTERNAL_REVIEW_PENDING'
  | 'EXTERNAL_REVIEWED'
  | 'AUTHORITY_HOLD';

export interface MotsPetEntry {
  id: string;
  domain: MotsPetDomain;
  internalTerms: readonly string[];
  publicFr: string;
  publicEn: string;
  definitionFr: string;
  prohibitedPublicTerms: readonly string[];
  requiresProvenance: boolean;
  authorityPaths: readonly string[];
  status: MotsPetStatus;
  revision: typeof MOTSPET_REVISION;
  reviewState: MotsPetReviewState;
  reviewer: string | null;
  reviewedAt: string | null;
  reviewReceipt: string | null;
  note?: string;
}

const CARE_AUTHORITY = 'docs/product/EMOPET_CARE_PRODUCT_MASTER_v0.1.md';
const LANGUAGE_AUTHORITY = 'docs/language/EMOPET_LANGUAGE_FOUNDER_DECISION_RECORD_2026-09-01.md';
const EXPERIENCE_AUTHORITY = 'docs/product/EMOPET_EXPERIENCE_DOCTRINE_v0.1.md';
const CARE_MIGRATION_AUTHORITY =
  'docs/product/CARE_UI_MIGRATION_MAP_2026-09-07.md';
const PRODUCT_AUTHORITY_MAP =
  'docs/control/EMOPET_PRODUCT_AUTHORITY_MAP_v0.1.md';
const TOGETHER_AUTHORITY =
  'docs/product/EMOPET_TOGETHER_RELATIONSHIP_ENGINE_MASTER_v0.1.md';
const SURFACE_NECESSITY_AUTHORITY =
  'docs/product/EMOPET_SURFACE_NECESSITY_MATRIX_v0.1.md';
const OWNER_TERMINOLOGY_AUTHORITY =
  'docs/records/terminology/GUARDIAN_TO_OWNER_SUPERSESSION_2026-09-11.md';
const DATA_TRUST_AUTHORITY =
  'docs/strategy/DATA_TRUST_AND_BUSINESS_MODEL_DOCTRINE_2026-09-07.md';

const internalReview = {
  revision: MOTSPET_REVISION,
  reviewState: 'INTERNAL_AUTHORITY_MAPPED' as const,
  reviewer: null,
  reviewedAt: null,
  reviewReceipt: null,
};

export const MOTSPET_ENTRIES: readonly MotsPetEntry[] = [
  {
    id: 'observation',
    domain: 'care',
    internalTerms: ['observation', 'published_observation'],
    publicFr: 'observation',
    publicEn: 'observation',
    definitionFr:
      'Énoncé utilisateur borné par le contexte, la source, la qualité ou la confiance, les limites et l’état de publication.',
    prohibitedPublicTerms: ['diagnostic', 'vérité biologique'],
    requiresProvenance: true,
    authorityPaths: [CARE_AUTHORITY, LANGUAGE_AUTHORITY],
    status: 'CONTROLLED_SEED',
    ...internalReview,
  },
  {
    id: 'owner_note',
    domain: 'care',
    internalTerms: ['owner_note', 'owner_journal_entry'],
    publicFr: 'note du propriétaire',
    publicEn: 'owner note',
    definitionFr:
      'Contexte ou fait saisi par le propriétaire. Une note du propriétaire reste distincte d’une observation produite par EMOPET.',
    prohibitedPublicTerms: ['preuve biologique', 'vérité capteur'],
    requiresProvenance: true,
    authorityPaths: [CARE_AUTHORITY, OWNER_TERMINOLOGY_AUTHORITY],
    status: 'CONTROLLED_SEED',
    ...internalReview,
  },
  {
    id: 'confidence',
    domain: 'science',
    internalTerms: ['confidence', 'quality_confidence'],
    publicFr: 'niveau de confiance',
    publicEn: 'confidence level',
    definitionFr:
      'Indication bornée de la solidité de l’observation publiée. Elle ne transforme pas une hypothèse en certitude.',
    prohibitedPublicTerms: ['certitude', 'garantie'],
    requiresProvenance: true,
    authorityPaths: [CARE_AUTHORITY, EXPERIENCE_AUTHORITY],
    status: 'CONTROLLED_SEED',
    ...internalReview,
  },
  {
    id: 'uncertainty',
    domain: 'science',
    internalTerms: ['uncertainty', 'uncertain', 'interpretation_uncertainty'],
    publicFr: 'incertitude',
    publicEn: 'uncertainty',
    definitionFr:
      'Indication explicite que les éléments disponibles bornent la précision ou la stabilité de l’interprétation. Elle ne doit ni augmenter la certitude ni être transformée en rassurance.',
    prohibitedPublicTerms: [
      'certain malgré tout',
      'probablement sans réserve',
      'aucun risque',
      'tout va bien',
    ],
    requiresProvenance: true,
    authorityPaths: [
      CARE_AUTHORITY,
      EXPERIENCE_AUTHORITY,
      PRODUCT_AUTHORITY_MAP,
    ],
    status: 'CONTROLLED_SEED',
    ...internalReview,
  },
  {
    id: 'insufficient_evidence',
    domain: 'science',
    internalTerms: ['suppressed', 'no_result', 'insufficient_evidence'],
    publicFr: 'pas assez d’éléments fiables',
    publicEn: 'not enough reliable evidence',
    definitionFr:
      'État explicite dans lequel EMOPET s’abstient de publier une observation plutôt que de surinterpréter des données insuffisantes.',
    prohibitedPublicTerms: ['tout va bien', 'aucun problème'],
    requiresProvenance: false,
    authorityPaths: [CARE_AUTHORITY, EXPERIENCE_AUTHORITY],
    status: 'CONTROLLED_SEED',
    ...internalReview,
  },
  {
    id: 'source',
    domain: 'care',
    internalTerms: ['source', 'provenance', 'source_id'],
    publicFr: 'source',
    publicEn: 'source',
    definitionFr:
      'Origine déclarée de l’information ou de la mesure présentée à l’utilisateur.',
    prohibitedPublicTerms: [],
    requiresProvenance: true,
    authorityPaths: [CARE_AUTHORITY],
    status: 'CONTROLLED_SEED',
    ...internalReview,
  },
  {
    id: 'context',
    domain: 'care',
    internalTerms: ['context', 'observation_context'],
    publicFr: 'contexte',
    publicEn: 'context',
    definitionFr:
      'Circonstances bornées dans lesquelles une observation ou une note est située. Le contexte ne constitue pas, à lui seul, une cause.',
    prohibitedPublicTerms: ['cause certaine', 'preuve de causalité'],
    requiresProvenance: true,
    authorityPaths: [CARE_AUTHORITY, EXPERIENCE_AUTHORITY],
    status: 'CONTROLLED_SEED',
    ...internalReview,
  },
  {
    id: 'time_window',
    domain: 'care',
    internalTerms: ['time_window', 'observation_window', 'capture_window'],
    publicFr: 'fenêtre de temps',
    publicEn: 'time window',
    definitionFr:
      'Intervalle temporel explicitement associé à une observation ou à une capture.',
    prohibitedPublicTerms: ['toujours', 'jamais'],
    requiresProvenance: true,
    authorityPaths: [CARE_AUTHORITY],
    status: 'CONTROLLED_SEED',
    ...internalReview,
  },
  {
    id: 'individual_reference',
    domain: 'science',
    internalTerms: ['individual_reference', 'contextual_reference', 'baseline_reference'],
    publicFr: 'référence individuelle',
    publicEn: 'individual reference',
    definitionFr:
      'Repère longitudinal propre au chien et au contexte autorisé, utilisé comme comparaison sans classement entre chiens.',
    prohibitedPublicTerms: ['norme universelle', 'chien normal', 'classement', 'percentile de race'],
    requiresProvenance: true,
    authorityPaths: [CARE_AUTHORITY, EXPERIENCE_AUTHORITY],
    status: 'CONTROLLED_SEED',
    ...internalReview,
  },
  {
    id: 'trend',
    domain: 'science',
    internalTerms: ['trend', 'longitudinal_change', 'observation_trend'],
    publicFr: 'évolution longitudinale',
    publicEn: 'longitudinal change',
    definitionFr:
      'Évolution dans le temps d’une observation nommée, comparée à une référence individuelle ou contextuelle explicite et située dans une fenêtre de temps. Ce concept ne constitue jamais un score global de bien-être.',
    prohibitedPublicTerms: [
      'tendance ELI globale',
      'score global en hausse',
      'bien-être en hausse',
      'bien-être en baisse',
      'amélioration générale',
      'dégradation générale',
    ],
    requiresProvenance: true,
    authorityPaths: [
      CARE_AUTHORITY,
      CARE_MIGRATION_AUTHORITY,
      PRODUCT_AUTHORITY_MAP,
    ],
    status: 'CONTROLLED_SEED',
    ...internalReview,
  },
  {
    id: 'limits',
    domain: 'science',
    internalTerms: ['limits', 'interpretation_limits', 'cannot_conclude'],
    publicFr: 'limites',
    publicEn: 'limits',
    definitionFr:
      'Ce que les données et le contexte disponibles ne permettent pas de conclure.',
    prohibitedPublicTerms: ['preuve absolue', 'certitude totale'],
    requiresProvenance: false,
    authorityPaths: [CARE_AUTHORITY, EXPERIENCE_AUTHORITY],
    status: 'CONTROLLED_SEED',
    ...internalReview,
  },
  {
    id: 'publication_state',
    domain: 'science',
    internalTerms: ['publication_state', 'publication_decision', 'eligibility_state'],
    publicFr: 'état de publication',
    publicEn: 'publication state',
    definitionFr:
      'État indiquant si une observation peut être présentée, dégradée ou supprimée selon les règles de qualité et de confiance.',
    prohibitedPublicTerms: ['validation clinique', 'validation scientifique automatique'],
    requiresProvenance: true,
    authorityPaths: [CARE_AUTHORITY],
    status: 'CONTROLLED_SEED',
    ...internalReview,
  },
  {
    id: 'device_state',
    domain: 'product',
    internalTerms: ['device_state', 'mat_state', 'tag_state'],
    publicFr: 'état du dispositif',
    publicEn: 'device state',
    definitionFr:
      'État technique du MAT ou du TAG, distinct d’un état biologique ou médical du chien.',
    prohibitedPublicTerms: ['état de santé', 'diagnostic'],
    requiresProvenance: true,
    authorityPaths: [CARE_AUTHORITY, EXPERIENCE_AUTHORITY],
    status: 'CONTROLLED_SEED',
    ...internalReview,
  },
  {
    id: 'signal_quality',
    domain: 'science',
    internalTerms: ['signal_quality', 'data_quality', 'capture_quality'],
    publicFr: 'qualité du signal',
    publicEn: 'signal quality',
    definitionFr:
      'Qualification de la qualité des données ou du signal avant toute décision d’inférence ou de publication.',
    prohibitedPublicTerms: ['qualité du bien-être', 'état émotionnel'],
    requiresProvenance: true,
    authorityPaths: [CARE_AUTHORITY, EXPERIENCE_AUTHORITY],
    status: 'CONTROLLED_SEED',
    ...internalReview,
  },
  {
    id: 'model_version',
    domain: 'science',
    internalTerms: ['model_version', 'inference_version', 'pipeline_version'],
    publicFr: 'version du modèle',
    publicEn: 'model version',
    definitionFr:
      'Version déclarée du modèle ou de la logique d’inférence ayant contribué à l’observation publiée.',
    prohibitedPublicTerms: [],
    requiresProvenance: true,
    authorityPaths: [CARE_AUTHORITY],
    status: 'CONTROLLED_SEED',
    ...internalReview,
  },
  {
    id: 'explicit_preference',
    domain: 'relationship',
    internalTerms: [
      'explicit_preference',
      'confirmed_preference',
      'confirmed_refusal',
    ],
    publicFr: 'préférence déclarée',
    publicEn: 'explicit preference',
    definitionFr:
      'Préférence, contrainte ou refus explicitement déclaré ou confirmé par le propriétaire pour personnaliser une suggestion. Ce concept décrit un choix utilisateur et ne constitue pas une inférence sur l’état, les émotions ou la relation du chien.',
    prohibitedPublicTerms: [
      'le chien préfère',
      'le chien aime',
      'preuve de lien',
      'score de relation',
      'bon propriétaire',
    ],
    requiresProvenance: true,
    authorityPaths: [
      TOGETHER_AUTHORITY,
      EXPERIENCE_AUTHORITY,
      PRODUCT_AUTHORITY_MAP,
      SURFACE_NECESSITY_AUTHORITY,
    ],
    status: 'CONTROLLED_SEED',
    ...internalReview,
  },
  {
    id: 'consent',
    domain: 'privacy',
    internalTerms: ['consent', 'consent_state', 'contribution_permission'],
    publicFr: 'consentement',
    publicEn: 'consent',
    definitionFr:
      'Permission liée à un usage déterminé. Une permission ne vaut pas autorisation générale pour un autre usage.',
    prohibitedPublicTerms: ['accord global définitif', 'autorisation pour tout usage'],
    requiresProvenance: true,
    authorityPaths: [LANGUAGE_AUTHORITY, DATA_TRUST_AUTHORITY],
    status: 'CONTROLLED_SEED',
    ...internalReview,
  },
  {
    id: 'activation_change',
    domain: 'science',
    internalTerms: ['arousal', 'activation', 'activation_change'],
    publicFr: 'variation d’activation observée',
    publicEn: 'observed change in activation',
    definitionFr:
      'Candidat de langage scientifique à conserver sous contrôle tant que la projection publique exacte n’est pas consolidée entre science, produit et interface.',
    prohibitedPublicTerms: ['stress', 'anxiété', 'peur', 'heureux', 'triste'],
    requiresProvenance: true,
    authorityPaths: [CARE_AUTHORITY, LANGUAGE_AUTHORITY],
    status: 'HOLD',
    revision: MOTSPET_REVISION,
    reviewState: 'AUTHORITY_HOLD',
    reviewer: null,
    reviewedAt: null,
    reviewReceipt: null,
    note: 'Ne pas promouvoir dans les surfaces utilisateur depuis ce registre tant que le wording public n’est pas explicitement autorisé.',
  },
] as const;

export function getMotsPetEntry(id: string): MotsPetEntry | undefined {
  return MOTSPET_ENTRIES.find((entry) => entry.id === id);
}

export function getControlledMotsPetEntries(): readonly MotsPetEntry[] {
  return MOTSPET_ENTRIES.filter((entry) => entry.status === 'CONTROLLED_SEED');
}

export function buildMotsPetPromptBlock(): string {
  const entries = getControlledMotsPetEntries();

  const lines = entries.map((entry) => {
    const provenance = entry.requiresProvenance ? ' · provenance/contexte requis' : '';
    return `- ${entry.id}: « ${entry.publicFr} »${provenance}`;
  });

  return [
    '# Contrat de langage MotsPet',
    `Révision : ${MOTSPET_REVISION}`,
    'Utilise le sens scientifique/produit autorisé, puis formule en langage humain sans renforcer la certitude.',
    'Une adaptation régionale peut changer le rythme ou le vocabulaire, jamais la classe de vérité, la confiance, la provenance, le consentement ou la frontière médicale.',
    'Lexique contrôlé disponible :',
    ...lines,
    'Les entrées MotsPet au statut HOLD ne sont pas autorisées comme vocabulaire public par ce bloc.',
  ].join('\n');
}
