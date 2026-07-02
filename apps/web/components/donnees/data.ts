/**
 * ⚠ DEMO MOCK DATA — Onglet Données / Consentement RGPD.
 *
 * Tout ce qui se trouve dans ce fichier est statique, **fictif** et destiné
 * uniquement à la démo prospect / présentations internes. À brancher au
 * backend EMOPET (endpoint /api/v6/consents/*) avant tout déploiement
 * production. Voir backend/src/consents/ pour le contrat attendu.
 *
 * Conformité règle EMOPET : "Phases d'agitation" reste descriptif, aucun label
 * émotionnel ni claim diagnostique introduit ici.
 */

export type LevelId = 'prive' | 'anonymise' | 'communaute' | 'recherche';

export interface Level {
  id: LevelId;
  label: string;
  glyph: string;
  accent: string;
  /** Qui voit les données à ce niveau. */
  audience: string;
  description: string;
}

export const LEVELS: Level[] = [
  {
    id: 'prive',
    label: 'PRIVÉ',
    glyph: '⊙',
    accent: 'var(--granit-700)',
    audience: 'Seulement toi',
    description:
      "Tes données restent sur ton appareil et le serveur EMOPET. Personne d'autre n'y accède. Tu peux les voir et les exporter à tout moment.",
  },
  {
    id: 'anonymise',
    label: 'ANONYMISÉ',
    glyph: '⊙○',
    accent: 'var(--lichen-700)',
    audience: 'EMOPET en agrégat statistique',
    description:
      "Tes données sont agrégées sans nom, race ou géolocalisation précise. Elles aident à améliorer les recommandations pour TOUS les chiens, sans qu'on puisse jamais remonter à Capitaine.",
  },
  {
    id: 'communaute',
    label: 'COMMUNAUTÉ EMOPET',
    glyph: '⊙⊙⊙',
    accent: 'var(--terracotta-500)',
    audience: 'Autres utilisateurs dans ta ville/région',
    description:
      "Tu partages avec les autres membres de la meute : ville (pas adresse exacte), race, âge, niveau d'activité général. Tu peux organiser des balades, comparer Capitaine à d'autres labradors de Bretagne.",
  },
  {
    id: 'recherche',
    label: 'RECHERCHE SCIENTIFIQUE',
    glyph: '⊙*',
    accent: 'var(--terracotta-700)',
    audience: 'Laboratoires partenaires sous accord scientifique',
    description:
      "Tes données anonymisées peuvent être utilisées par des laboratoires partenaires (vétérinaires, universités) pour faire avancer la science du bien-être canin. Tu reçois 1 mois d'abonnement gratuit par an en remerciement.",
  },
];

export type CategoryId =
  | 'sommeil'
  | 'activite'
  | 'agitation'
  | 'environnement'
  | 'localisation'
  | 'profil';

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  /** État ON/OFF par défaut. */
  defaultOn: boolean;
  /** Niveau par défaut. */
  defaultLevel: LevelId;
  /** Mesures collectées sur 30 j (null si pas pertinent). */
  measuresPerMonth: number | null;
  /** Capteurs concernés. */
  sensors: string[];
  /** Tooltip d'information éventuel (RGPD / non médical). */
  tooltip?: string;
}

/**
 * Les 6 catégories de données EMOPET.
 * NB : "Phases d'agitation" — règle absolue
 * du projet (pas de label émotionnel).
 */
export const CATEGORIES: Category[] = [
  {
    id: 'sommeil',
    name: 'Sommeil',
    description: 'Durée, cycles, qualité du repos.',
    defaultOn: true,
    defaultLevel: 'anonymise',
    measuresPerMonth: 89,
    sensors: ['PVDF', 'IMU'],
  },
  {
    id: 'activite',
    name: 'Activité physique',
    description: 'Intensité, durée, type de mouvement.',
    defaultOn: true,
    defaultLevel: 'anonymise',
    measuresPerMonth: 158,
    sensors: ['IMU', 'Cellules de charge'],
  },
  {
    id: 'agitation',
    name: "Phases d'agitation",
    description: 'Périodes d’éveil intense observées.',
    defaultOn: true,
    defaultLevel: 'prive',
    measuresPerMonth: 23,
    sensors: ['IMU', 'Microphone'],
    tooltip:
      "EMOPET observe les phases d'agitation sans formuler d'évaluation vétérinaire. À discuter avec votre vétérinaire.",
  },
  {
    id: 'environnement',
    name: 'Environnement tapis',
    description: 'Température, hygrométrie, pression.',
    defaultOn: true,
    defaultLevel: 'anonymise',
    measuresPerMonth: 720,
    sensors: ['BME280'],
  },
  {
    id: 'localisation',
    name: 'Localisation',
    description: 'Ville uniquement, jamais d’adresse précise.',
    defaultOn: false,
    defaultLevel: 'prive',
    measuresPerMonth: null,
    sensors: ['GPS app'],
    tooltip:
      "EMOPET n'utilise jamais l'adresse précise. Si tu actives, seule la ville sera utilisée pour la communauté.",
  },
  {
    id: 'profil',
    name: 'Profil chien',
    description: 'Race, âge, sexe, taille — déclaratif.',
    defaultOn: true,
    defaultLevel: 'prive',
    measuresPerMonth: null,
    sensors: ['Manuel'],
  },
];

/** Total mesures collectées 30 j (somme des catégories ayant un compteur). */
export const TOTAL_MEASURES_30D = CATEGORIES.reduce(
  (s, c) => s + (c.measuresPerMonth ?? 0),
  0,
); // 1018

/** Études fictives qui apparaîtront dans le modal "Voir les utilisations". */
export interface Study {
  id: string;
  title: string;
  lab: string;
  year: number;
  participants: number;
}

export const STUDIES: Study[] = [
  {
    id: 's1',
    title: 'Sommeil et race chez le Labrador',
    lab: 'INRAE Bretagne',
    year: 2026,
    participants: 234,
  },
  {
    id: 's2',
    title: 'Activité saisonnière chiens littoraux',
    lab: 'ENVA Nantes',
    year: 2026,
    participants: 1247,
  },
];
