/**
 * Gamification du PROPRIÉTAIRE (Sprint 05 — transverse).
 *
 * ⚠ INVARIANT FONDAMENTAL : le propriétaire est gamifié, le chien ne l'est
 * JAMAIS. Tous les badges, niveaux et défis ont pour sujet « VOUS » (votre
 * exploration, votre apprentissage, votre engagement). Aucune « performance »
 * du chien, aucune jauge de bonheur, aucun niveau du chien.
 *
 * Couche transverse : la progression se dérive des actions réelles des
 * Sprints 1-4 (spots ajoutés, entrées carnet, cercles rejoints, événements)
 * lues depuis localStorage, plus un historique mock.
 */

import { LS_KEYS as COMMUNITY_KEYS } from './community';
import { JOURNAL_OWNER_HEADER, getJournalOwnerToken } from './journal';

export type BadgeCategory = 'exploration' | 'carnet' | 'bien_etre' | 'communaute' | 'apprentissage';
export type Rarity = 'common' | 'rare' | 'epic';

export const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  exploration: 'Exploration',
  carnet: 'Carnet',
  bien_etre: 'Bien-être',
  communaute: 'Communauté',
  apprentissage: 'Apprentissage',
};

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

/** Historique mock (le propriétaire a déjà un peu d'activité). */
const BASE_COUNTERS: Counters = {
  mapPointsAdded: 2,
  beachesVisited: 6,
  departmentsVisited: 3,
  journalEntries: 8,
  walks: 96,
  photos: 24,
  circlesJoined: 0,
  eventsOrganized: 0,
  eventsParticipated: 3,
  questionsAnswered: 12,
  knowledgeCardsRead: [],
  baselineFrozen: true,
  validDataDays: 34,
};

const READ_KEY = 'breiz-gamification-read';

function len(key: string): number {
  if (typeof window === 'undefined') return 0;
  try { return (JSON.parse(localStorage.getItem(key) ?? '[]') as unknown[]).length; } catch { return 0; }
}
function keys(key: string): number {
  if (typeof window === 'undefined') return 0;
  try { return Object.keys(JSON.parse(localStorage.getItem(key) ?? '{}') as object).length; } catch { return 0; }
}
function readCards(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(READ_KEY) ?? '[]') as string[]; } catch { return []; }
}

/** Marque une fiche comme lue (idempotent). Renvoie true si nouvellement lue. */
export function markCardRead(cardId: string): boolean {
  if (typeof window === 'undefined') return false;
  const read = readCards();
  if (read.includes(cardId)) return false;
  read.push(cardId);
  try { localStorage.setItem(READ_KEY, JSON.stringify(read)); } catch {}
  return true;
}

async function getJSON<T>(url: string, fallback: T, headers?: HeadersInit): Promise<T> {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

/**
 * Compteurs dérivés des VRAIES données serveur (R3) : spots, carnet, événements.
 * Les contenus de démo (seed) ne comptent pas — seuls les ajouts réels du
 * propriétaire (préfixes srv-/user-/evt-/milestone-) incrémentent la progression.
 * Repli sur `computeCounters()` (localStorage) en cas d'échec réseau.
 */
export async function fetchServerCounters(): Promise<Counters> {
  if (typeof window === 'undefined') return BASE_COUNTERS;
  const journalOwnerToken = getJournalOwnerToken();
  const [spotsRes, journalRes, eventsRes] = await Promise.all([
    getJSON<{ spots: Array<{ id: string }> }>('/api/map/spots', { spots: [] }),
    getJSON<{ entries: Array<{ id: string; type: string; photoUrls?: string[] }> }>(
      '/api/journal',
      { entries: [] },
      journalOwnerToken ? { [JOURNAL_OWNER_HEADER]: journalOwnerToken } : undefined,
    ),
    getJSON<{ events: Array<{ id: string }> }>('/api/community/events', { events: [] }),
  ]);

  const isUser = (id: string) => id.startsWith('srv-') || id.startsWith('user-') || id.startsWith('evt-') || id.startsWith('milestone-');
  const userSpots = spotsRes.spots.filter((s) => isUser(s.id)).length;
  const userEntries = journalRes.entries.filter((e) => isUser(e.id));
  const userWalks = userEntries.filter((e) => e.type === 'walk_recorded').length;
  const userPhotos = userEntries.reduce((n, e) => n + (e.photoUrls?.length ?? 0), 0);
  const userEvents = eventsRes.events.filter((e) => isUser(e.id)).length;

  return {
    ...BASE_COUNTERS,
    mapPointsAdded: BASE_COUNTERS.mapPointsAdded + userSpots,
    journalEntries: BASE_COUNTERS.journalEntries + userEntries.length,
    walks: BASE_COUNTERS.walks + userWalks,
    photos: BASE_COUNTERS.photos + userPhotos,
    eventsOrganized: BASE_COUNTERS.eventsOrganized + userEvents,
    circlesJoined: keys(COMMUNITY_KEYS.memberships),
    knowledgeCardsRead: readCards(),
  };
}

/** Compteurs courants = historique mock + actions réelles (localStorage, fallback synchrone). */
export function computeCounters(): Counters {
  const userWalks = (() => {
    if (typeof window === 'undefined') return 0;
    try {
      const entries = JSON.parse(localStorage.getItem('breiz-journal-user-entries') ?? '[]') as Array<{ type: string }>;
      return entries.filter((e) => e.type === 'walk_recorded').length;
    } catch { return 0; }
  })();
  const userEntries = len('breiz-journal-user-entries');
  return {
    ...BASE_COUNTERS,
    mapPointsAdded: BASE_COUNTERS.mapPointsAdded + len('breiz-map-user-spots'),
    journalEntries: BASE_COUNTERS.journalEntries + userEntries,
    walks: BASE_COUNTERS.walks + userWalks,
    circlesJoined: keys(COMMUNITY_KEYS.memberships),
    eventsOrganized: len(COMMUNITY_KEYS.events),
    knowledgeCardsRead: readCards(),
  };
}

/* ------------------------------------------------------------------ */
/* Niveaux d'expérience canine (du propriétaire)                       */
/* ------------------------------------------------------------------ */

export interface LevelInfo {
  level: number;
  name: string;
  min: number;
  unlocks: string;
}

export const LEVELS: LevelInfo[] = [
  { level: 1, name: 'Nouveau compagnon', min: 0, unlocks: 'Fonctions de base' },
  { level: 2, name: 'Promeneur', min: 100, unlocks: 'Fiches connaissance niveau 1' },
  { level: 3, name: 'Compagnon attentif', min: 300, unlocks: 'Statistiques avancées du carnet' },
  { level: 4, name: 'Explorateur', min: 700, unlocks: 'Catégories de carte personnalisées' },
  { level: 5, name: 'Pilier de communauté', min: 1500, unlocks: 'Peut devenir modérateur de cercle' },
  { level: 6, name: 'Compagnon expert', min: 3000, unlocks: 'Badge spécial + accès bêta' },
];

const POINTS = {
  journalEntry: 5,
  walk: 10,
  mapPoint: 15,
  eventParticipated: 20,
  eventOrganized: 50,
  questionAnswered: 5,
  knowledgeCard: 10,
};

/* ------------------------------------------------------------------ */
/* Catalogue des badges (sujet : LE PROPRIÉTAIRE)                      */
/* ------------------------------------------------------------------ */

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

const threshold = (get: (c: Counters) => number, target: number) => ({
  evaluate: (c: Counters) => get(c) >= target,
  progress: (c: Counters) => ({ current: Math.min(get(c), target), target }),
});

export const BADGE_CATALOG: Badge[] = [
  // Exploration
  { id: 'explorer_5_plages', category: 'exploration', label: '5 plages visitées', description: 'Vous avez exploré 5 plages différentes de Bretagne.', rarity: 'common', pointsReward: 25, ...threshold((c) => c.beachesVisited, 5) },
  { id: 'explorer_10_plages', category: 'exploration', label: 'Explorateur des côtes', description: 'Vous avez exploré 10 plages bretonnes.', rarity: 'rare', pointsReward: 50, ...threshold((c) => c.beachesVisited, 10) },
  { id: 'explorer_4_departements', category: 'exploration', label: 'Tour de Bretagne', description: 'Vous avez parcouru les 4 coins de la Bretagne.', rarity: 'rare', pointsReward: 50, ...threshold((c) => c.departmentsVisited, 4) },
  { id: 'pionnier', category: 'exploration', label: 'Pionnier de la carte', description: 'Vous avez ajouté 10 spots à la carte communautaire.', rarity: 'rare', pointsReward: 50, ...threshold((c) => c.mapPointsAdded, 10) },
  // Carnet
  { id: 'chroniqueur_debutant', category: 'carnet', label: 'Chroniqueur débutant', description: 'Vous avez écrit 10 entrées dans le carnet.', rarity: 'common', pointsReward: 25, ...threshold((c) => c.journalEntries, 10) },
  { id: 'chroniqueur_assidu', category: 'carnet', label: 'Chroniqueur assidu', description: 'Vous avez écrit 100 entrées dans le carnet.', rarity: 'epic', pointsReward: 100, ...threshold((c) => c.journalEntries, 100) },
  { id: 'marcheur_100', category: 'carnet', label: 'Marcheur — 100 balades', description: 'Vous avez enregistré 100 balades.', rarity: 'rare', pointsReward: 50, ...threshold((c) => c.walks, 100) },
  // Bien-être (engagement du propriétaire avec les données, jamais une perf du chien)
  { id: 'observateur', category: 'bien_etre', label: 'Observateur', description: 'Vous avez accompagné la construction de la baseline ELI (14 jours).', rarity: 'common', pointsReward: 25, evaluate: (c) => c.baselineFrozen, progress: (c) => ({ current: c.baselineFrozen ? 14 : c.validDataDays, target: 14 }) },
  { id: 'assidu_donnees', category: 'bien_etre', label: 'Assidu des données', description: 'Vous avez suivi 30 jours de données valides.', rarity: 'rare', pointsReward: 50, ...threshold((c) => c.validDataDays, 30) },
  // Communauté
  { id: 'membre_cercle', category: 'communaute', label: 'Membre de la veute', description: 'Vous avez rejoint un cercle.', rarity: 'common', pointsReward: 25, ...threshold((c) => c.circlesJoined, 1) },
  { id: 'organisateur', category: 'communaute', label: 'Organisateur', description: 'Vous avez organisé une balade de groupe.', rarity: 'rare', pointsReward: 50, ...threshold((c) => c.eventsOrganized, 1) },
  { id: 'pilier', category: 'communaute', label: 'Pilier de la communauté', description: 'Vous avez organisé 5 événements.', rarity: 'epic', pointsReward: 100, ...threshold((c) => c.eventsOrganized, 5) },
  { id: 'entraide', category: 'communaute', label: 'Entraide', description: 'Vous avez répondu à 20 questions de la communauté.', rarity: 'rare', pointsReward: 50, ...threshold((c) => c.questionsAnswered, 20) },
  // Apprentissage
  { id: 'apprenti', category: 'apprentissage', label: 'Apprenti', description: 'Vous avez lu 5 fiches de connaissance canine.', rarity: 'common', pointsReward: 25, ...threshold((c) => c.knowledgeCardsRead.length, 5) },
  { id: 'connaisseur', category: 'apprentissage', label: 'Connaisseur', description: 'Vous avez lu 10 fiches de connaissance canine.', rarity: 'rare', pointsReward: 50, ...threshold((c) => c.knowledgeCardsRead.length, 10) },
];

export interface Progression {
  totalPoints: number;
  level: LevelInfo;
  nextLevel: LevelInfo | null;
  progressToNext: { current: number; target: number; percentage: number };
  unlockedBadgeIds: string[];
}

export function computeProgression(c: Counters): Progression {
  const unlocked = BADGE_CATALOG.filter((b) => b.evaluate(c));
  const totalPoints =
    c.mapPointsAdded * POINTS.mapPoint +
    c.journalEntries * POINTS.journalEntry +
    c.walks * POINTS.walk +
    c.eventsParticipated * POINTS.eventParticipated +
    c.eventsOrganized * POINTS.eventOrganized +
    c.questionsAnswered * POINTS.questionAnswered +
    c.knowledgeCardsRead.length * POINTS.knowledgeCard +
    unlocked.reduce((s, b) => s + b.pointsReward, 0);

  let level = LEVELS[0]!;
  for (const l of LEVELS) if (totalPoints >= l.min) level = l;
  const nextLevel = LEVELS.find((l) => l.min > level.min) ?? null;
  const progressToNext = nextLevel
    ? { current: totalPoints - level.min, target: nextLevel.min - level.min, percentage: Math.round(((totalPoints - level.min) / (nextLevel.min - level.min)) * 100) }
    : { current: 1, target: 1, percentage: 100 };

  return { totalPoints, level, nextLevel, progressToNext, unlockedBadgeIds: unlocked.map((b) => b.id) };
}

/* ------------------------------------------------------------------ */
/* Fiches de connaissance (éducatives, NON médicales)                  */
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
  { id: 'k-signaux', pathway: 'comportement', order: 1, title: 'Les signaux d’apaisement', readMinutes: 4, content: "Bâillements, léchage de truffe, détournement du regard : ce sont des signaux d’apaisement décrits par Turid Rugaas. Les observer aide à comprendre quand votre chien cherche à désamorcer une situation. Ce sont des observations comportementales, pas des émotions humaines.", sources: ['Rugaas, T. (2006). On Talking Terms with Dogs.'] },
  { id: 'k-langage', pathway: 'comportement', order: 2, title: 'Lire la posture', readMinutes: 3, content: "Position des oreilles, de la queue, du poids du corps : la posture renseigne sur l’état d’activation. Une posture basse et figée appelle de la distance ; une posture souple indique la disponibilité au jeu.", sources: ['Handelman, B. (2012). Canine Behavior.'] },
  { id: 'k-exercice', pathway: 'bien_etre', order: 1, title: 'Les besoins d’exercice', readMinutes: 4, content: "Les besoins varient selon la race, l’âge et l’individu. L’enjeu n’est pas la quantité brute mais la régularité et la variété (marche, flair, jeu). Pour tout doute sur l’effort adapté, demandez conseil à votre vétérinaire.", sources: ['Foster et al. (2021).'] },
  { id: 'k-repos', pathway: 'bien_etre', order: 2, title: 'L’importance du repos', readMinutes: 3, content: "Un chien adulte se repose une grande partie de la journée. Un espace calme et des routines stables favorisent des phases de repos continues. EMOPET observe la régularité du repos, sans formuler d'évaluation vétérinaire.", sources: ['Foster et al. (2021).'] },
  { id: 'k-renforcement', pathway: 'communication', order: 1, title: 'Le renforcement positif', readMinutes: 4, content: "Récompenser le comportement souhaité au bon moment renforce son apparition. Le timing et la constance comptent plus que l’intensité de la récompense.", sources: ['Pryor, K. (1999). Don’t Shoot the Dog.'] },
  { id: 'k-limites', pathway: 'communication', order: 2, title: 'Poser des limites claires', readMinutes: 3, content: "Des règles cohérentes et prévisibles sécurisent. Mieux vaut peu de règles bien tenues que beaucoup de règles fluctuantes.", sources: ['Donaldson, J. (1996). The Culture Clash.'] },
  { id: 'k-meteo', pathway: 'bretagne', order: 1, title: 'Sortir par tous les temps', readMinutes: 3, content: "En Bretagne, le crachin et le vent font partie du quotidien. Un équipement adapté (séchage, protection des coussinets l’hiver) rend les sorties confortables toute l’année.", sources: ['Météo-France — climat breton.'] },
  { id: 'k-spots', pathway: 'bretagne', order: 2, title: 'Plages et réglementation', readMinutes: 3, content: "L’accès des chiens aux plages varie selon la commune et la saison. Vérifiez les arrêtés municipaux : beaucoup de plages sont tolérées hors saison estivale.", sources: ['Arrêtés municipaux — accès plages.'] },
];

export function cardsOfPathway(pathwayId: string): KnowledgeCard[] {
  return KNOWLEDGE_CARDS.filter((k) => k.pathway === pathwayId).sort((a, b) => a.order - b.order);
}

/* ------------------------------------------------------------------ */
/* Défis communautaires (collectifs, basés sur l'effort réel)          */
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

export const CHALLENGES: Challenge[] = [
  { id: 'ch-distance-mai', circleLabel: 'Cercle de Lorient', title: '500 km ensemble en juin', description: 'Distance cumulée des balades du cercle ce mois-ci.', current: 318, target: 500, unit: 'km', myContribution: 27, endsLabel: '12 jours restants' },
  { id: 'ch-walks-vannes', circleLabel: 'Cercle de Vannes', title: '200 balades collectives', description: 'Balades enregistrées par les membres ce mois-ci.', current: 142, target: 200, unit: 'balades', myContribution: 9, endsLabel: '12 jours restants' },
];
