/**
 * Legacy compatibility module for the former cross-surface gamification system.
 *
 * PRODUCT AUTHORITY (2026-09-06):
 * - global points/levels/badges are NOT release-authorized;
 * - MAT/TAG/ELI, dog activity, distance, rest, signal quality, baseline/data
 *   adherence and relationship signals MUST NOT drive rewards or progression;
 * - learning content may keep a local read/unread state only so the Owner can
 *   resume where they stopped. Reading does not earn points or unlock product rights.
 *
 * The exported legacy types/functions are intentionally preserved as a temporary
 * compatibility layer while #233 removes obsolete UI dependencies. They are
 * neutral by design and must not be used as a new progression authority.
 */

export type BadgeCategory = 'exploration' | 'carnet' | 'bien_etre' | 'communaute' | 'apprentissage';
export type Rarity = 'common' | 'rare' | 'epic';

export const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  exploration: 'Exploration',
  carnet: 'Carnet',
  bien_etre: 'Bien-être',
  communaute: 'Communauté',
  apprentissage: 'Apprentissage',
};

/**
 * Compatibility shape only.
 * No field below is authorized to generate global points, levels or badges.
 */
export interface Counters {
  mapPointsAdded: number;
  beachesVisited: number;
  departmentsVisited: number;
  journalEntries: number;
  walks: number;
  photos: number;
  circlesJoined: number;
  eventsOrganized: number;
  eventsParticipated: number;
  questionsAnswered: number;
  knowledgeCardsRead: string[];
  baselineFrozen: boolean;
  validDataDays: number;
}

const READ_KEY = 'breiz-learning-read';

const EMPTY_COUNTERS: Counters = {
  mapPointsAdded: 0,
  beachesVisited: 0,
  departmentsVisited: 0,
  journalEntries: 0,
  walks: 0,
  photos: 0,
  circlesJoined: 0,
  eventsOrganized: 0,
  eventsParticipated: 0,
  questionsAnswered: 0,
  knowledgeCardsRead: [],
  baselineFrozen: false,
  validDataDays: 0,
};

function readCards(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

/** Marks a knowledge card as read. This is resume state, not a reward event. */
export function markCardRead(cardId: string): boolean {
  if (typeof window === 'undefined') return false;
  const read = readCards();
  if (read.includes(cardId)) return false;
  read.push(cardId);
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(read));
  } catch {
    // Local read-state persistence is best-effort only.
  }
  return true;
}

/**
 * Legacy API retained for callers that still expect asynchronous counters.
 * Deliberately does NOT read Care, journal, walks, Community, MAT/TAG or ELI data.
 */
export async function fetchServerCounters(): Promise<Counters> {
  return { ...EMPTY_COUNTERS, knowledgeCardsRead: readCards() };
}

/**
 * Legacy synchronous API retained for compatibility.
 * Deliberately returns no performance/adherence counters.
 */
export function computeCounters(): Counters {
  return { ...EMPTY_COUNTERS, knowledgeCardsRead: readCards() };
}

/* ------------------------------------------------------------------ */
/* Legacy progression compatibility                                    */
/* ------------------------------------------------------------------ */

export interface LevelInfo {
  level: number;
  name: string;
  min: number;
  unlocks: string;
}

/**
 * No global EMOPET level system is release-authorized.
 * A single neutral state prevents old callers from manufacturing progression.
 */
export const LEVELS: LevelInfo[] = [
  { level: 0, name: 'Parcours libre', min: 0, unlocks: 'Aucune fonction liée à un niveau' },
];

/** @deprecated Global badges are HOLD under #233. */
export interface Badge {
  id: string;
  category: BadgeCategory;
  label: string;
  description: string;
  rarity: Rarity;
  pointsReward: number;
  evaluate: (c: Counters) => boolean;
  progress: (c: Counters) => { current: number; target: number };
}

/** No release-authorized global badges. */
export const BADGE_CATALOG: Badge[] = [];

export interface Progression {
  totalPoints: number;
  level: LevelInfo;
  nextLevel: LevelInfo | null;
  progressToNext: { current: number; target: number; percentage: number };
  unlockedBadgeIds: string[];
}

/**
 * Compatibility-only neutral progression.
 * IMPORTANT: all inputs are intentionally ignored.
 */
export function computeProgression(_c: Counters): Progression {
  return {
    totalPoints: 0,
    level: LEVELS[0]!,
    nextLevel: null,
    progressToNext: { current: 0, target: 0, percentage: 0 },
    unlockedBadgeIds: [],
  };
}

/* ------------------------------------------------------------------ */
/* Knowledge cards: educational, non-medical, no reward coupling       */
/* ------------------------------------------------------------------ */

export interface KnowledgeCard {
  id: string;
  pathway: string;
  order: number;
  title: string;
  readMinutes: number;
  content: string;
  sources: string[];
}

export interface Pathway {
  id: string;
  label: string;
  description: string;
}

export const PATHWAYS: Pathway[] = [
  { id: 'comportement', label: 'Comportement canin', description: 'Communication, signaux d’apaisement, langage corporel.' },
  { id: 'bien_etre', label: 'Bien-être au quotidien', description: 'Besoins d’exercice, enrichissement, repos.' },
  { id: 'communication', label: 'Communication homme-chien', description: 'Renforcement positif, codes, limites.' },
  { id: 'bretagne', label: 'Comprendre la Bretagne canine', description: 'Spots, météo, spécificités locales.' },
];

export const KNOWLEDGE_CARDS: KnowledgeCard[] = [
  {
    id: 'k-signaux',
    pathway: 'comportement',
    order: 1,
    title: 'Les signaux d’apaisement',
    readMinutes: 4,
    content:
      "Bâillements, léchage de truffe, détournement du regard : ce sont des signaux d’apaisement décrits par Turid Rugaas. Les observer aide à décrire une interaction sans prétendre connaître l’état interne du chien.",
    sources: ['Rugaas, T. (2006). On Talking Terms with Dogs.'],
  },
  {
    id: 'k-langage',
    pathway: 'comportement',
    order: 2,
    title: 'Lire la posture',
    readMinutes: 3,
    content:
      'Position des oreilles, de la queue et du poids du corps : la posture apporte du contexte observable. Elle doit être lue avec la situation complète et ne constitue pas, à elle seule, une vérité sur une émotion.',
    sources: ['Handelman, B. (2012). Canine Behavior.'],
  },
  {
    id: 'k-exercice',
    pathway: 'bien_etre',
    order: 1,
    title: 'Les besoins d’exercice',
    readMinutes: 4,
    content:
      'Les besoins varient selon la race, l’âge, l’individu et le contexte. L’enjeu n’est pas un objectif universel de distance. Pour tout doute sur l’effort adapté, demandez conseil à votre vétérinaire.',
    sources: ['Foster et al. (2021).'],
  },
  {
    id: 'k-repos',
    pathway: 'bien_etre',
    order: 2,
    title: 'L’importance du repos',
    readMinutes: 3,
    content:
      "Un chien adulte se repose une grande partie de la journée. Un espace calme et des routines stables peuvent soutenir des phases de repos continues. EMOPET peut décrire des observations qualifiées sans en faire une évaluation vétérinaire.",
    sources: ['Foster et al. (2021).'],
  },
  {
    id: 'k-renforcement',
    pathway: 'communication',
    order: 1,
    title: 'Le renforcement positif',
    readMinutes: 4,
    content:
      'Récompenser le comportement souhaité au bon moment renforce son apparition. Le timing et la constance comptent plus que l’intensité de la récompense.',
    sources: ["Pryor, K. (1999). Don’t Shoot the Dog."],
  },
  {
    id: 'k-limites',
    pathway: 'communication',
    order: 2,
    title: 'Poser des limites claires',
    readMinutes: 3,
    content:
      'Des règles cohérentes et prévisibles facilitent la compréhension du cadre de vie. Mieux vaut peu de règles stables que de nombreuses règles fluctuantes.',
    sources: ['Donaldson, J. (1996). The Culture Clash.'],
  },
  {
    id: 'k-meteo',
    pathway: 'bretagne',
    order: 1,
    title: 'Sortir par tous les temps',
    readMinutes: 3,
    content:
      'En Bretagne, pluie fine et vent sont fréquents. Un équipement et un séchage adaptés peuvent rendre les sorties plus confortables. Adaptez toujours la sortie au chien et aux conditions réelles.',
    sources: ['Météo-France — climat breton.'],
  },
  {
    id: 'k-spots',
    pathway: 'bretagne',
    order: 2,
    title: 'Plages et réglementation',
    readMinutes: 3,
    content:
      'L’accès des chiens aux plages varie selon la commune et la saison. Vérifiez la règle locale en vigueur avant de vous déplacer.',
    sources: ['Arrêtés municipaux — accès plages.'],
  },
];

export function cardsOfPathway(pathwayId: string): KnowledgeCard[] {
  return KNOWLEDGE_CARDS.filter((k) => k.pathway === pathwayId).sort((a, b) => a.order - b.order);
}

/* ------------------------------------------------------------------ */
/* Legacy challenge compatibility                                     */
/* ------------------------------------------------------------------ */

export interface Challenge {
  id: string;
  circleLabel: string;
  title: string;
  description: string;
  current: number;
  target: number;
  unit: string;
  myContribution: number;
  endsLabel: string;
}

/**
 * Distance/walk-volume collective challenges are not release-authorized.
 * Community utility should be event/group based, not a dog-performance quota.
 */
export const CHALLENGES: Challenge[] = [];
