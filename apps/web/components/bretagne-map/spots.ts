/**
 * Spots communautaires de la carte Bretagne (Sprint 01 — Couche B).
 *
 * Les propriétaires Breiz partagent des lieux utiles pour leur chien :
 * plages tolérantes, parcs, sentiers, vétérinaires, éducateurs, pensions,
 * magasins, cafés pet-friendly. Chaque spot a une catégorie (couleur de pin
 * dérivée de la charte EMOPET v2) et peut recevoir des commentaires.
 *
 * ⚠ Invariants : aucun terme médical/émotionnel. Les descriptions restent
 * factuelles et comportementales (le chien est observé, jamais personnifié).
 *
 * Projection identique à `data.ts` (viewBox 1000×720) :
 *   x = (lon + 5.2) * 180
 *   y = (48.9 - lat) * 320
 */

export type SpotCategory =
  | 'plage'
  | 'parc'
  | 'foret'
  | 'veterinaire'
  | 'comportementaliste'
  | 'pension'
  | 'magasin'
  | 'cafe';

export interface SpotCategoryMeta {
  value: SpotCategory;
  /** Libellé court affiché dans les chips de filtre et la fiche. */
  label: string;
  /** Couleur de pin / pastille (token CSS de la charte EMOPET v2). */
  color: string;
}

/** Catalogue des 8 catégories initiales (extensible). */
export const SPOT_CATEGORIES: SpotCategoryMeta[] = [
  { value: 'plage',              label: 'Plage',             color: 'var(--terracotta-500)' },
  { value: 'parc',               label: 'Parc',              color: 'var(--lichen-500)' },
  { value: 'foret',              label: 'Forêt / sentier',   color: 'var(--lichen-700)' },
  { value: 'veterinaire',        label: 'Vétérinaire',       color: 'var(--rouge)' },
  { value: 'comportementaliste', label: 'Éducateur',         color: 'var(--terracotta-700)' },
  { value: 'pension',            label: 'Pension / garde',   color: 'var(--granit-500)' },
  { value: 'magasin',            label: 'Magasin spécialisé', color: 'var(--granit-700)' },
  { value: 'cafe',               label: 'Café pet-friendly', color: 'var(--terracotta-400)' },
];

const CATEGORY_BY_VALUE: Record<SpotCategory, SpotCategoryMeta> = SPOT_CATEGORIES.reduce(
  (acc, meta) => {
    acc[meta.value] = meta;
    return acc;
  },
  {} as Record<SpotCategory, SpotCategoryMeta>,
);

export function categoryMeta(value: SpotCategory): SpotCategoryMeta {
  return CATEGORY_BY_VALUE[value];
}

/** Projette (lon, lat) WGS84 vers le repère SVG de la carte (viewBox 1000×720). */
export function lonLatToXY(lon: number, lat: number): { x: number; y: number } {
  return {
    x: Math.round((lon + 5.2) * 180 * 10) / 10,
    y: Math.round((48.9 - lat) * 320 * 10) / 10,
  };
}

/** Bornes Bretagne historique (doc Sprint 01) pour valider les coordonnées. */
export const BRETAGNE_BOUNDS = { latMin: 47.0, latMax: 49.0, lonMin: -5.5, lonMax: -1.0 };
const LORIENT = { lon: -3.3702, lat: 47.7482 };

/** Entrée de création d'un spot (client ET serveur). */
export interface SpotCreateInput {
  category: SpotCategory;
  name: string;
  description?: string;
  isAnonymous?: boolean;
  authorName?: string;
  lon?: number;
  lat?: number;
}

/** Validation déterministe (équivalent du schéma Zod serveur). */
export function validateNewSpot(input: SpotCreateInput): string[] {
  const errors: string[] = [];
  if (!SPOT_CATEGORIES.some((c) => c.value === input.category)) errors.push('Catégorie invalide.');
  const name = (input.name ?? '').trim();
  if (name.length < 3 || name.length > 120) errors.push('Le nom doit faire 3 à 120 caractères.');
  if (input.description && input.description.length > 500) errors.push('Description trop longue (500 max).');
  if (input.lon != null && (input.lon < BRETAGNE_BOUNDS.lonMin || input.lon > BRETAGNE_BOUNDS.lonMax)) errors.push('Longitude hors Bretagne.');
  if (input.lat != null && (input.lat < BRETAGNE_BOUNDS.latMin || input.lat > BRETAGNE_BOUNDS.latMax)) errors.push('Latitude hors Bretagne.');
  return errors;
}

/** Construit un spot à partir d'un input validé (pure). */
export function buildSpot(input: SpotCreateInput): CommunitySpot {
  const isAnonymous = input.isAnonymous ?? true;
  return {
    id: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category: input.category,
    name: input.name.trim(),
    description: input.description?.trim() || 'Spot ajouté par la communauté.',
    lon: input.lon ?? LORIENT.lon,
    lat: input.lat ?? LORIENT.lat,
    isAnonymous,
    authorName: isAnonymous ? undefined : (input.authorName?.trim() || 'Membre'),
    visitCount: 0,
    averageRating: null,
    comments: [],
    createdAt: new Date().toISOString(),
  };
}

export interface SpotComment {
  id: string;
  content: string;
  /** Note optionnelle 1-5. */
  rating?: number;
  /** "Anonyme" ou prénom selon le choix de l'auteur. */
  authorName: string;
  /** ISO 8601. */
  createdAt: string;
}

export interface CommunitySpot {
  id: string;
  category: SpotCategory;
  name: string;
  description: string;
  lon: number;
  lat: number;
  /** Anonyme par défaut (RGPD — pas de lien direct point ↔ identité). */
  isAnonymous: boolean;
  /** Affiché uniquement si non anonyme. */
  authorName?: string;
  visitCount: number;
  averageRating: number | null;
  comments: SpotComment[];
  /** ISO 8601. */
  createdAt: string;
}

/**
 * ⚠ DEMO MOCK DATA — spots communautaires.
 *
 * Distribution fictive pré-lancement. À remplacer par
 * `GET /api/v6/community/spots?bounds=...` filtré par viewport.
 */
export const INITIAL_SPOTS: CommunitySpot[] = [
  {
    id: 's-grands-sables',
    category: 'plage',
    name: 'Plage des Grands Sables — Groix',
    description: "Grande plage convexe, accès chiens toléré hors saison estivale. Sable fin, peu de courant côté abrité.",
    lon: -3.45, lat: 47.63,
    isAnonymous: true,
    visitCount: 312, averageRating: 4.7,
    comments: [
      { id: 'c1', content: "Beaucoup d'espace pour courir tôt le matin. Pensez à la laisse près des baigneurs.", rating: 5, authorName: 'Anonyme', createdAt: '2026-05-10T07:40:00+02:00' },
    ],
    createdAt: '2026-03-02T10:00:00+01:00',
  },
  {
    id: 's-la-torche',
    category: 'plage',
    name: 'Pointe de la Torche — Penmarc’h',
    description: "Spot venté, longue bande de sable. Activité élevée observée chez les chiens (vent, embruns). Surveiller la marée.",
    lon: -4.35, lat: 47.84,
    isAnonymous: false, authorName: 'Marie',
    visitCount: 198, averageRating: 4.4,
    comments: [],
    createdAt: '2026-03-18T09:00:00+01:00',
  },
  {
    id: 's-gavres',
    category: 'plage',
    name: 'Dunes de Gâvres',
    description: "Cordon dunaire face à Lorient. Zone autorisée balisée, sentier plat adapté aux phases de repos prolongées entre deux courses.",
    lon: -3.37, lat: 47.69,
    isAnonymous: true,
    visitCount: 144, averageRating: 4.2,
    comments: [],
    createdAt: '2026-04-01T11:30:00+02:00',
  },
  {
    id: 's-kerbihan',
    category: 'parc',
    name: 'Parc de Kerbihan — Lorient',
    description: "Parc urbain arboré, allées ombragées. Point d'eau l'été. Fréquentation calme en semaine.",
    lon: -3.36, lat: 47.755,
    isAnonymous: true,
    visitCount: 256, averageRating: 4.1,
    comments: [
      { id: 'c2', content: 'Idéal pour une sortie courte le midi, retour rapide au calme.', authorName: 'Anonyme', createdAt: '2026-05-02T12:20:00+02:00' },
    ],
    createdAt: '2026-02-20T08:00:00+01:00',
  },
  {
    id: 's-broceliande',
    category: 'foret',
    name: 'Forêt de Brocéliande — Paimpont',
    description: "Sentiers forestiers longs, dénivelé doux. Sol souple. Pensez aux tiques au printemps (inspection au retour).",
    lon: -2.17, lat: 48.0,
    isAnonymous: true,
    visitCount: 421, averageRating: 4.8,
    comments: [],
    createdAt: '2026-03-05T14:00:00+01:00',
  },
  {
    id: 's-kervaud',
    category: 'foret',
    name: 'Bois de Kervaud — Vannes',
    description: "Boisement périurbain, boucle de 3 km. Bonne alternance d'activité et de phases de repos à l'ombre.",
    lon: -2.78, lat: 47.66,
    isAnonymous: true,
    visitCount: 88, averageRating: 3.9,
    comments: [],
    createdAt: '2026-04-22T16:00:00+02:00',
  },
  {
    id: 's-vet-ter',
    category: 'veterinaire',
    name: 'Clinique vétérinaire du Ter — Lorient',
    description: "Cabinet généraliste. Parking, accès de plain-pied. Prise de rendez-vous en ligne.",
    lon: -3.39, lat: 47.74,
    isAnonymous: false, authorName: 'Cédric',
    visitCount: 67, averageRating: 4.6,
    comments: [],
    createdAt: '2026-02-15T09:00:00+01:00',
  },
  {
    id: 's-vet-urg-rennes',
    category: 'veterinaire',
    name: 'Urgences vétérinaires — Rennes',
    description: "Service d'urgence ouvert la nuit et le week-end. Téléphoner avant de se déplacer.",
    lon: -1.68, lat: 48.11,
    isAnonymous: true,
    visitCount: 53, averageRating: 4.5,
    comments: [],
    createdAt: '2026-03-28T22:00:00+02:00',
  },
  {
    id: 's-educ-quimper',
    category: 'comportementaliste',
    name: 'Éducateur canin — Quimper',
    description: "Séances individuelles, méthodes en renforcement positif. Travail du rappel et du retour au calme.",
    lon: -4.10, lat: 47.99,
    isAnonymous: false, authorName: 'Julien',
    visitCount: 41, averageRating: 4.9,
    comments: [],
    createdAt: '2026-04-10T10:00:00+02:00',
  },
  {
    id: 's-educ-brest',
    category: 'comportementaliste',
    name: 'Éducateur canin — Brest',
    description: "Ateliers collectifs hebdomadaires. Travail de la marche en laisse et des interactions entre chiens.",
    lon: -4.49, lat: 48.39,
    isAnonymous: true,
    visitCount: 29, averageRating: 4.3,
    comments: [],
    createdAt: '2026-04-12T18:00:00+02:00',
  },
  {
    id: 's-pension-auray',
    category: 'pension',
    name: 'Pension canine du Golfe — Auray',
    description: "Garde en box individuels et parc clos. Visite préalable recommandée pour évaluer la sociabilité.",
    lon: -2.98, lat: 47.67,
    isAnonymous: true,
    visitCount: 36, averageRating: 4.0,
    comments: [],
    createdAt: '2026-03-30T11:00:00+02:00',
  },
  {
    id: 's-magasin-concarneau',
    category: 'magasin',
    name: 'Breizh Dog — Concarneau',
    description: "Magasin spécialisé : alimentation, matériel de balade, équipement pluie (utile en Bretagne).",
    lon: -3.92, lat: 47.87,
    isAnonymous: true,
    visitCount: 74, averageRating: 4.2,
    comments: [],
    createdAt: '2026-02-28T15:00:00+01:00',
  },
  {
    id: 's-cafe-lorient',
    category: 'cafe',
    name: 'Le Quai — Lorient',
    description: "Café-restaurant du port acceptant les chiens en terrasse et en salle. Gamelle d'eau à disposition.",
    lon: -3.37, lat: 47.748,
    isAnonymous: false, authorName: 'Camille',
    visitCount: 121, averageRating: 4.6,
    comments: [
      { id: 'c3', content: 'Accueil très détendu, parfait après une balade au port.', rating: 5, authorName: 'Camille', createdAt: '2026-05-05T16:30:00+02:00' },
    ],
    createdAt: '2026-03-12T13:00:00+01:00',
  },
  {
    id: 's-cafe-rennes',
    category: 'cafe',
    name: 'Café des Halles — Rennes',
    description: "Adresse pet-friendly proche du centre. Coin calme à l'arrière pour les sorties tranquilles.",
    lon: -1.685, lat: 48.108,
    isAnonymous: true,
    visitCount: 63, averageRating: 4.1,
    comments: [],
    createdAt: '2026-04-18T10:30:00+02:00',
  },
];
