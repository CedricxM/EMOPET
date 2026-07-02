/**
 * Catalogue ELI v6 — référence UI (Sprint 03, Couche C).
 *
 * 4 familles, 23 proxies, 11 vetoes contextuels, confidence gating.
 * Valeurs alignées sur le moteur canonique (`@emopet/eli-engine`) mais
 * définies localement pour éviter tout import cross-package dans le build Next.
 *
 * ⚠ Invariants : aucun terme médical/pathologique, aucune émotion humaine.
 * Le système OBSERVE des indicateurs de bien-être NON médicaux.
 */

/** Confidence gating — identique à ReliabilityState du moteur. */
export type ConfidenceState = 'VALID' | 'DEGRADED' | 'SUPPRESSED';

export const CONFIDENCE_META: Record<ConfidenceState, { label: string; color: string; bg: string }> = {
  VALID: { label: 'Confiance élevée', color: 'var(--vert-ok)', bg: 'var(--accent-2-soft)' },
  DEGRADED: { label: 'Confiance partielle', color: 'var(--orange-pro)', bg: 'var(--prudence-bg)' },
  SUPPRESSED: { label: 'Données insuffisantes', color: 'var(--rouge)', bg: 'var(--rouge-bg)' },
};

export type FamilyId = 'activite' | 'repos' | 'regulation' | 'sociabilite';

export interface Family {
  id: FamilyId;
  label: string;
  description: string;
  color: string;
}

export const FAMILIES: Family[] = [
  { id: 'activite', label: 'Activité', description: 'Temps actif, intensité, transitions de phase.', color: 'var(--terracotta-500)' },
  { id: 'repos', label: 'Repos', description: 'Durée, régularité et continuité du repos.', color: 'var(--lichen-600)' },
  { id: 'regulation', label: 'Régulation', description: 'Variabilité respiratoire, phases de calme prolongé.', color: 'var(--granit-500)' },
  { id: 'sociabilite', label: 'Sociabilité', description: 'Interactions détectées, proximité, routines.', color: 'var(--terracotta-700)' },
];

export interface Proxy {
  id: string;
  family: FamilyId;
  label: string;
  unit: string;
  description: string;
  reference: string;
}

/** 23 proxies — catalogue de référence. */
export const PROXIES: Proxy[] = [
  // Activité (6)
  { id: 'A01', family: 'activite', label: 'Temps actif quotidien', unit: 'min', description: "Durée cumulée des phases d'activité sur 24 h.", reference: 'Brugarolas et al. (2015)' },
  { id: 'A02', family: 'activite', label: "Intensité moyenne d'activité", unit: 'g', description: "Accélération moyenne pendant les phases actives.", reference: 'Brugarolas et al. (2015)' },
  { id: 'A03', family: 'activite', label: 'Transitions actif / repos', unit: '/jour', description: "Nombre de bascules entre activité et repos.", reference: 'Foster et al. (2021)' },
  { id: 'A04', family: 'activite', label: 'Activité nocturne (00 h – 06 h)', unit: 'min', description: "Activité observée pendant la fenêtre nocturne.", reference: 'Foster et al. (2021)' },
  { id: 'A05', family: 'activite', label: "Pic d'activité diurne", unit: 'g', description: "Intensité du pic d'activité de la journée.", reference: 'Brugarolas et al. (2015)' },
  { id: 'A06', family: 'activite', label: "Régularité du cycle d'activité", unit: 'coeff.', description: "Stabilité du rythme actif/repos d'un jour à l'autre.", reference: 'Russell (1980)' },
  // Repos (7)
  { id: 'R01', family: 'repos', label: 'Durée totale de repos', unit: 'h', description: 'Temps de repos cumulé sur 24 h (proxy ballisto).', reference: 'Foster et al. (2021)' },
  { id: 'R02', family: 'repos', label: 'Repos profond estimé', unit: 'h', description: 'Phases de repos profond estimées (respiration + ballisto).', reference: 'Homma & Masaoka (2008)' },
  { id: 'R03', family: 'repos', label: 'Régularité des heures de coucher', unit: 'σ min', description: 'Écart-type des heures de début de repos.', reference: 'Russell (1980)' },
  { id: 'R04', family: 'repos', label: "Latence d'endormissement", unit: 'min', description: 'Temps observé avant la première phase de repos stable.', reference: 'Foster et al. (2021)' },
  { id: 'R05', family: 'repos', label: 'Interruptions de repos', unit: '/nuit', description: 'Nombre de réveils détectés pendant la nuit.', reference: 'Foster et al. (2021)' },
  { id: 'R06', family: 'repos', label: 'Continuité du repos', unit: 'indice', description: 'Indice de continuité des phases de repos.', reference: 'Homma & Masaoka (2008)' },
  { id: 'R07', family: 'repos', label: 'Repos diurne', unit: 'min', description: 'Repos observé en journée (hors nuit).', reference: 'Foster et al. (2021)' },
  // Régulation (5)
  { id: 'G01', family: 'regulation', label: 'Fréquence respiratoire au repos', unit: 'cycles/min', description: 'Cadence respiratoire estimée au repos.', reference: 'Homma & Masaoka (2008)' },
  { id: 'G02', family: 'regulation', label: 'Variabilité respiratoire', unit: 'coeff.', description: 'Variabilité de la respiration au repos.', reference: 'Homma & Masaoka (2008)' },
  { id: 'G03', family: 'regulation', label: 'Phases de calme prolongé', unit: '/jour', description: 'Nombre de phases de calme prolongé détectées.', reference: 'McEwen (1998)' },
  { id: 'G04', family: 'regulation', label: 'Temps de retour au calme', unit: 'min', description: "Durée observée pour revenir à la ligne de base après une activation.", reference: 'McEwen (1998)' },
  { id: 'G05', family: 'regulation', label: 'Stabilité posturale au repos', unit: 'indice', description: 'Stabilité de la posture pendant le repos.', reference: 'Brugarolas et al. (2015)' },
  // Sociabilité (5)
  { id: 'S01', family: 'sociabilite', label: 'Phases de calme prolongé partagées', unit: '/jour', description: 'Phases de calme observées en présence du propriétaire.', reference: 'Foster et al. (2021)' },
  { id: 'S02', family: 'sociabilite', label: 'Vocalisations détectées', unit: 'évén.', description: 'Événements de vocalisation détectés (TAG).', reference: 'Brugarolas et al. (2015)' },
  { id: 'S03', family: 'sociabilite', label: 'Proximité propriétaire', unit: 'min', description: 'Temps de proximité détectée avec le propriétaire.', reference: 'Foster et al. (2021)' },
  { id: 'S04', family: 'sociabilite', label: 'Réactivité aux passages', unit: 'évén.', description: "Réactions observées lors de passages extérieurs.", reference: 'Russell (1980)' },
  { id: 'S05', family: 'sociabilite', label: 'Synchronisation aux routines', unit: 'indice', description: 'Alignement de l’activité sur les routines du foyer.', reference: 'Foster et al. (2021)' },
];

export function proxiesOf(family: FamilyId): Proxy[] {
  return PROXIES.filter((p) => p.family === family);
}

export function proxyById(id: string): Proxy | undefined {
  return PROXIES.find((p) => p.id === id);
}

/** 11 vetoes contextuels (V1–V11), libellés FR alignés sur le moteur canonique. */
export interface Veto {
  id: string;
  label: string;
  description: string;
  reference?: string;
  /** Déclarable par le propriétaire (sinon détecté automatiquement). */
  ownerReportable: boolean;
}

export const VETOES: Veto[] = [
  { id: 'V1', label: 'Post-exercice', description: 'Fenêtre de récupération respiratoire après une activité soutenue (<30 min).', reference: 'Brugarolas 2015', ownerReportable: false },
  { id: 'V2', label: 'Forte chaleur', description: 'Halètement thermique au-dessus du seuil de chaleur — non lié au comportement.', reference: 'Siguín 2025', ownerReportable: false },
  { id: 'V3', label: 'Retour à la maison', description: "Activation d'accueil dans les 10 min suivant votre retour.", ownerReportable: false },
  { id: 'V4', label: 'Ébrouement', description: 'Artefact de mouvement (secouement du corps) sur l’IMU.', ownerReportable: false },
  { id: 'V5', label: 'Collier mal positionné', description: 'Collier hors position ventrale — signaux peu fiables.', ownerReportable: false },
  { id: 'V6', label: 'Bruit ambiant élevé', description: 'Environnement bruyant — analyse vocale suspendue.', ownerReportable: false },
  { id: 'V7', label: 'Plusieurs occupants sur le MAT', description: 'Plusieurs présences détectées sur le tapis.', ownerReportable: false },
  { id: 'V8', label: 'Repas récent', description: 'Élévation respiratoire post-repas (<20 min).', ownerReportable: false },
  { id: 'V9', label: 'Période de chaleurs (femelle)', description: 'Dérive attendue de la baseline pendant la période de chaleurs.', ownerReportable: true },
  { id: 'V10', label: 'Chaleur + race brachycéphale', description: 'Respiration toujours élevée chez les races brachycéphales par temps chaud.', reference: 'Siguín 2025', ownerReportable: false },
  { id: 'V11', label: 'Interaction animale intense', description: 'Interaction entre chiens détectée — activation non comportementale.', reference: 'Siguín 2025', ownerReportable: false },
];

/** Contextes déclarables par le propriétaire (élargissent la tolérance des écarts). */
export interface OwnerContext {
  id: string;
  label: string;
  affects: FamilyId[];
}

export const OWNER_CONTEXTS: OwnerContext[] = [
  { id: 'voyage', label: 'Voyage en cours', affects: ['repos', 'regulation'] },
  { id: 'convalescence', label: 'Convalescence post-vétérinaire', affects: ['activite', 'regulation'] },
  { id: 'visiteurs', label: 'Présence de visiteurs', affects: ['sociabilite', 'repos'] },
  { id: 'demenagement', label: 'Déménagement / nouvel environnement', affects: ['repos', 'regulation', 'sociabilite'] },
  { id: 'chaleurs', label: 'Période de chaleurs (femelle)', affects: ['activite', 'regulation'] },
];

/** Référence scientifique permanente (footer). */
export const SCIENTIFIC_FOOTER =
  'Indicateurs basés sur Russell (1980), McEwen (1998), Homma & Masaoka (2008), Brugarolas et al. (2015), Foster et al. (2021). Méthode propriétaire EMOPET — non médicale.';

export const RGPD_NOTICE =
  'Vos données sont chiffrées et restent vôtres. Vous pouvez les exporter ou les supprimer à tout moment.';

/** Message d'état d'un indicateur — STRICT : aucune formulation médicale ou émotionnelle. */
export type IndicatorState = 'stable' | 'amelioration' | 'attention';

export function indicatorStateMessage(state: IndicatorState): string {
  switch (state) {
    case 'stable':
      return 'Pattern de bien-être stable sur la période.';
    case 'amelioration':
      return 'Indicateurs en progression par rapport à la baseline.';
    case 'attention':
      return 'Écart notable observé. Vous pouvez en parler à votre vétérinaire si cela vous préoccupe.';
  }
}

/* ------------------------------------------------------------------ */
/* Terminologie fidèle au modèle ELI v6                                */
/* ------------------------------------------------------------------ */

/** Gating de publication (ELI v6 §13) : PUBLISH ≥0.70 / DEGRADE / REJECT <0.40. */
export const GATE_META: Record<'PUBLISH' | 'DEGRADE' | 'REJECT', { label: string; color: string }> = {
  PUBLISH: { label: 'Publié · confiance élevée', color: 'var(--vert-ok)' },
  DEGRADE: { label: 'Partiel · confiance dégradée', color: 'var(--orange-pro)' },
  REJECT: { label: 'Silence · données insuffisantes', color: 'var(--rouge)' },
};

/** Dimensions du WQI (Walk Quality Index) — ELI v6 §7. */
export const WQI_DIMENSIONS = [
  { id: 'exercise', label: 'Exercice', weight: 0.40 },
  { id: 'exploration', label: 'Exploration', weight: 0.35 },
  { id: 'social', label: 'Social', weight: 0.25 },
] as const;

/** Quality tiers de fenêtre d'observation — ELI v6 §11. */
export const TIER_META: Record<'GOLD' | 'SILVER' | 'BRONZE' | 'REJECTED', { label: string; color: string }> = {
  GOLD: { label: 'Gold', color: 'var(--vert-ok)' },
  SILVER: { label: 'Silver', color: 'var(--lichen-600)' },
  BRONZE: { label: 'Bronze', color: 'var(--orange-pro)' },
  REJECTED: { label: 'Rejeté', color: 'var(--rouge)' },
};

/** Seuils RSI (ELI v6 §8) : ≥80 routine stable ; <50 trois jours → signal. */
export const RSI_STABLE_THRESHOLD = 80;
export const RSI_ALERT_THRESHOLD = 50;

/** 5 sous-baselines contextuelles (ELI v6 §4). Comparer au bon contexte. */
export interface SubBaselineMeta {
  id: string;
  label: string;
  description: string;
}
export const SUB_BASELINES: SubBaselineMeta[] = [
  { id: 'deep_rest_mat', label: 'Repos profond (MAT)', description: 'Nuit, présence MAT >30 min, immobilité élevée — fenêtres Gold uniquement.' },
  { id: 'light_rest_mat', label: 'Repos léger (MAT)', description: 'Journée, présence MAT, immobilité moyenne.' },
  { id: 'owner_present', label: 'Propriétaire présent', description: 'Téléphone détecté, activité normale.' },
  { id: 'owner_absent', label: 'Propriétaire absent', description: 'Téléphone non détecté >15 min.' },
  { id: 'daytime_active', label: 'Activité diurne', description: 'Hors MAT, journée, activité modérée.' },
];

/** Message factuel de dérive prolongée (baseline freeze >30 j, ELI v6 §9). NON médical. */
export function driftMessage(dogName: string): string {
  return `Les signaux de ${dogName} ne sont pas revenus à leur profil habituel depuis un mois. Vous pouvez en parler à votre vétérinaire.`;
}
