/**
 * Cercles locaux & communauté (Sprint 04 — Couche D).
 *
 * Cercles par ville bretonne, publications (question/discussion/annonce),
 * événements (balades de groupe) avec point de RDV qui apparaît sur la carte
 * du Sprint 01. Modération (filtre + signalement + auto-masquage à 2 flags).
 *
 * ⚠ Invariants : aucune donnée de bien-être du chien n'est partagée dans les
 * cercles ; pas de géoloc exacte entre membres (ville oui, adresse non) ;
 * consentement RGPD explicite pour rejoindre.
 *
 * Frontend-first : mock + localStorage (pas de wiring backend).
 */

export type CirclePostType = 'question' | 'discussion' | 'annonce';
export type EventType = 'balade' | 'rencontre' | 'dressage';
export type Participation = 'going' | 'maybe' | 'not_going';

export const POST_TYPE_LABELS: Record<CirclePostType, string> = {
  question: 'Question',
  discussion: 'Discussion',
  annonce: 'Annonce',
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  balade: 'Balade de groupe',
  rencontre: 'Rencontre',
  dressage: 'Session dressage',
};

export interface Circle {
  id: string;
  name: string;
  city: string;
  department: string;
  /** Centre (coords ville) — sert de RDV par défaut, jamais l'adresse d'un membre. */
  lat: number;
  lon: number;
  description: string;
  memberCount: number;
}

export interface CircleReply {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface CirclePost {
  id: string;
  circleId: string;
  type: CirclePostType;
  authorName: string;
  title?: string;
  content: string;
  replies: CircleReply[];
  flagCount: number;
  isHidden: boolean;
  createdAt: string;
}

export interface CircleEvent {
  id: string;
  circleId: string;
  type: EventType;
  organizerName: string;
  title: string;
  description?: string;
  startsAt: string; // ISO
  meetingPointName: string;
  lat: number;
  lon: number;
  participants: number;
  /** Statut de l'utilisateur courant (prototype). */
  myStatus?: Participation;
}

/* ------------------------------------------------------------------ */
/* Cercles initiaux (villes bretonnes)                                 */
/* ------------------------------------------------------------------ */

export const INITIAL_CIRCLES: Circle[] = [
  { id: 'lorient', name: 'Cercle de Lorient', city: 'Lorient', department: '56', lat: 47.7482, lon: -3.3702, description: "Ville d'ancrage EMOPET. Balades au port, plages de Larmor, sorties à Groix.", memberCount: 64 },
  { id: 'vannes', name: 'Cercle de Vannes', city: 'Vannes', department: '56', lat: 47.658, lon: -2.76, description: 'Sorties autour du golfe du Morbihan, remparts et bois périurbains.', memberCount: 41 },
  { id: 'rennes', name: 'Cercle de Rennes', city: 'Rennes', department: '35', lat: 48.117, lon: -1.68, description: 'Parcs urbains, prairies Saint-Martin, sorties forêt de Brocéliande.', memberCount: 58 },
  { id: 'brest', name: 'Cercle de Brest', city: 'Brest', department: '29', lat: 48.39, lon: -4.486, description: 'Sorties rade et presqu’île de Crozon, sentiers côtiers.', memberCount: 33 },
  { id: 'quimper', name: 'Cercle de Quimper', city: 'Quimper', department: '29', lat: 47.996, lon: -4.097, description: 'Vallée de l’Odet, plages du pays bigouden, sentiers du Finistère sud.', memberCount: 29 },
];

/* ------------------------------------------------------------------ */
/* Posts & événements mock                                             */
/* ------------------------------------------------------------------ */

export const INITIAL_POSTS: CirclePost[] = [
  { id: 'p1', circleId: 'lorient', type: 'question', authorName: 'Camille', title: 'Éducateur pour chiot réactif ?', content: 'Quel éducateur recommandez-vous autour de Lorient pour un chiot réactif en laisse ?', replies: [{ id: 'r1', authorName: 'Antoine', content: "J'ai travaillé avec l'éducateur du Ter, approche en renforcement positif, très bien.", createdAt: '2026-05-20T10:00:00+02:00' }], flagCount: 0, isHidden: false, createdAt: '2026-05-19T18:00:00+02:00' },
  { id: 'p2', circleId: 'lorient', type: 'discussion', authorName: 'Marie', content: 'Les plages où les chiens sont tolérés hors saison autour de Lorient ? Je partage mes spots.', replies: [], flagCount: 0, isHidden: false, createdAt: '2026-05-22T09:30:00+02:00' },
  { id: 'p3', circleId: 'vannes', type: 'question', authorName: 'Julien', title: 'Balade collective dimanche ?', content: 'Qui serait partant pour une balade au golfe dimanche matin ?', replies: [], flagCount: 0, isHidden: false, createdAt: '2026-05-23T11:00:00+02:00' },
  { id: 'p4', circleId: 'rennes', type: 'annonce', authorName: 'Léa (modératrice)', title: 'Charte du cercle', content: 'Bienvenue ! Merci de lire la charte communautaire avant de publier.', replies: [], flagCount: 0, isHidden: false, createdAt: '2026-05-10T08:00:00+02:00' },
];

export const INITIAL_EVENTS: CircleEvent[] = [
  { id: 'ev1', circleId: 'lorient', type: 'balade', organizerName: 'Camille', title: 'Balade du port', description: "Sortie tranquille le long du port de pêche, allure modérée.", startsAt: '2026-06-07T10:00:00+02:00', meetingPointName: 'Port de pêche, Lorient', lat: 47.726, lon: -3.367, participants: 8 },
  { id: 'ev2', circleId: 'vannes', type: 'balade', organizerName: 'Julien', title: 'Tour du golfe', description: 'Balade collective au bord du golfe du Morbihan.', startsAt: '2026-06-01T09:30:00+02:00', meetingPointName: 'Port de Vannes', lat: 47.575, lon: -2.76, participants: 5 },
  { id: 'ev3', circleId: 'rennes', type: 'rencontre', organizerName: 'Léa', title: 'Rencontre aux Prairies', description: 'Rencontre entre propriétaires aux prairies Saint-Martin.', startsAt: '2026-06-14T15:00:00+02:00', meetingPointName: 'Prairies Saint-Martin, Rennes', lat: 48.118, lon: -1.69, participants: 11 },
];

/* ------------------------------------------------------------------ */
/* Charte communautaire                                                */
/* ------------------------------------------------------------------ */

export const CHARTER_RULES: Array<{ title: string; text: string }> = [
  { title: 'Bienveillance', text: "La communauté Breiz est un espace d'entraide entre propriétaires de chiens. Respect et bienveillance sont la règle." },
  { title: 'Pas de conseils vétérinaires', text: 'Pour toute question qui demande un avis vétérinaire, consultez un vétérinaire. Les membres ne sont pas des professionnels du soin animal.' },
  { title: 'Respect de la vie privée', text: "Ne partagez pas d'informations personnelles d'autres membres. Pas de photos d'autrui sans consentement." },
  { title: 'Pas de commerce', text: 'Les cercles ne sont pas des espaces de vente. Pas de publicité ni de démarchage commercial.' },
  { title: 'Sécurité lors des rencontres', text: 'Les balades de groupe se font sous la responsabilité de chacun. Vérifiez la sociabilité de votre chien.' },
];

/* ------------------------------------------------------------------ */
/* Modération — filtre première ligne                                  */
/* ------------------------------------------------------------------ */

const FORBIDDEN_PATTERNS: RegExp[] = [
  /\b(viagra|casino|crypto\W{0,5}invest|bitcoin\W{0,5}profit)\b/i,
  /(bit\.ly|tinyurl|t\.me\/)/i,
  /\b(connard|salaud|abruti)\b/i,
];

/** Première ligne de défense. La modération humaine (file de signalements) reste la vraie protection. */
export function containsForbiddenContent(text: string): { blocked: boolean; reason?: string } {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) return { blocked: true, reason: 'Contenu non autorisé détecté (spam, lien suspect ou propos déplacés).' };
  }
  return { blocked: false };
}

/** Seuil de signalements au-delà duquel un contenu est auto-masqué. */
export const AUTO_HIDE_FLAG_THRESHOLD = 2;
const COMMUNITY_COORDINATE_PRECISION = 100;
const COMMUNITY_BOUNDS = { latMin: 47.0, latMax: 49.1, lonMin: -5.6, lonMax: -0.9 };

export function publicCommunityCoordinate(value: number): number {
  return Math.round(value * COMMUNITY_COORDINATE_PRECISION) / COMMUNITY_COORDINATE_PRECISION;
}

/* ------------------------------------------------------------------ */
/* Builders / validators (purs — client ET serveur)                   */
/* ------------------------------------------------------------------ */

export interface PostCreateInput {
  circleId: string;
  type: CirclePostType;
  title?: string;
  content: string;
  authorName?: string;
}

export function validatePostInput(input: PostCreateInput): string[] {
  const errors: string[] = [];
  if (!input.circleId) errors.push('Cercle manquant.');
  if (!(input.type in POST_TYPE_LABELS)) errors.push('Type de publication invalide.');
  if (!input.content || input.content.trim().length < 5) errors.push('Message trop court (5 caractères min).');
  if (input.content && input.content.length > 2000) errors.push('Message trop long (2000 max).');
  if (containsForbiddenContent(`${input.title ?? ''} ${input.content}`).blocked) errors.push('Contenu non autorisé détecté.');
  return errors;
}

export function buildPost(input: PostCreateInput): CirclePost {
  return {
    id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    circleId: input.circleId,
    type: input.type,
    authorName: input.authorName?.trim() || 'Membre',
    title: input.title?.trim() || undefined,
    content: input.content.trim(),
    replies: [],
    flagCount: 0,
    isHidden: false,
    createdAt: new Date().toISOString(),
  };
}

export function buildReply(content: string, authorName = 'Membre'): CircleReply {
  return { id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, authorName, content: content.trim().slice(0, 1000), createdAt: new Date().toISOString() };
}

export interface EventCreateInput {
  circleId: string;
  type: EventType;
  title: string;
  description?: string;
  startsAt: string;
  meetingPointName: string;
  lat: number;
  lon: number;
  organizerName?: string;
}

export function validateEventInput(input: EventCreateInput): string[] {
  const errors: string[] = [];
  if (!input.circleId) errors.push('Cercle manquant.');
  if (!(input.type in EVENT_TYPE_LABELS)) errors.push("Type d'evenement invalide.");
  const title = input.title?.trim() ?? '';
  if (title.length < 3) errors.push('Titre trop court.');
  if (title.length > 120) errors.push('Titre trop long.');
  if (input.description && input.description.length > 600) errors.push('Description trop longue.');
  if (!input.meetingPointName || input.meetingPointName.trim().length < 3) errors.push('Point de rendez-vous manquant.');
  if (input.meetingPointName && input.meetingPointName.length > 120) errors.push('Point de rendez-vous trop long.');
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lon)) errors.push('Coordonnees invalides.');
  if (Number.isFinite(input.lat) && (input.lat < COMMUNITY_BOUNDS.latMin || input.lat > COMMUNITY_BOUNDS.latMax)) errors.push('Latitude hors zone communautaire.');
  if (Number.isFinite(input.lon) && (input.lon < COMMUNITY_BOUNDS.lonMin || input.lon > COMMUNITY_BOUNDS.lonMax)) errors.push('Longitude hors zone communautaire.');
  if (containsForbiddenContent(`${input.title ?? ''} ${input.description ?? ''} ${input.meetingPointName ?? ''}`).blocked) errors.push('Contenu non autorise detecte.');
  if (!input.startsAt || Number.isNaN(new Date(input.startsAt).getTime())) errors.push('Date invalide.');
  if (new Date(input.startsAt).getTime() <= Date.now()) errors.push("L'evenement doit etre dans le futur.");
  return errors;
}

export function buildEvent(input: EventCreateInput): CircleEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    circleId: input.circleId,
    type: input.type,
    organizerName: input.organizerName?.trim() || 'Membre',
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    startsAt: input.startsAt,
    meetingPointName: input.meetingPointName.trim(),
    lat: publicCommunityCoordinate(input.lat),
    lon: publicCommunityCoordinate(input.lon),
    participants: 1,
    myStatus: 'going',
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function sortCirclesByProximity(circles: Circle[], from?: { lat: number; lon: number }): Circle[] {
  if (!from) return circles;
  const d = (c: Circle) => (c.lat - from.lat) ** 2 + (c.lon - from.lon) ** 2;
  return [...circles].sort((a, b) => d(a) - d(b));
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avril', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "à l'instant";
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  return `il y a ${days} j`;
}

/* ------------------------------------------------------------------ */
/* Persistance localStorage (clés partagées avec /local pour la carte) */
/* ------------------------------------------------------------------ */

export const LS_KEYS = {
  memberships: 'breiz-community-memberships',
  posts: 'breiz-community-posts',
  events: 'breiz-community-events',
} as const;

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Événements créés par l'utilisateur (persistés). */
export function loadUserEvents(): CircleEvent[] {
  return readJSON<CircleEvent[]>(LS_KEYS.events, []);
}

/** Tous les événements (mock + utilisateur) — utilisé par la carte du Sprint 01. */
export function loadAllEvents(): CircleEvent[] {
  const user = loadUserEvents();
  return [...INITIAL_EVENTS, ...user.filter((u) => !INITIAL_EVENTS.some((e) => e.id === u.id))];
}

/** Événements à venir (à partir de maintenant), triés par date. */
export function upcomingEvents(events: CircleEvent[]): CircleEvent[] {
  const now = Date.now();
  return events.filter((e) => new Date(e.startsAt).getTime() >= now).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
