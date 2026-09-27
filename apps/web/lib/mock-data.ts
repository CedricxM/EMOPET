/**
 * Fixtures de développement — AUCUNE de ces valeurs n'est une mesure.
 *
 * Ce fichier n'en disait rien jusqu'ici, alors qu'il alimente des surfaces
 * utilisateur. Les valeurs sont écrites à la main ; elles ne proviennent ni d'un
 * capteur MAT/TAG, ni d'une inférence backend, ni même d'une simulation
 * modélisée. Toute surface qui les publie doit porter la provenance
 * `ELI_WEB_MOCK_PROVENANCE` et le marqueur `DÉMO ·` — voir ELI-ARCH-G3 (#118).
 */

export const MOCK_DOG = {
  name: 'Gus',
  breed: 'Border Collie',
  ageYears: 4,
  weightKg: 18,
  initial: 'G',
};

export const MOCK_ELI = {
  state: 'valid' as const,
  value: 72,
  delta: +4,
  captureMinutes: 142,
  context: 'sur 24 heures',
};

export const MOCK_REPOS = {
  state: 'degraded' as const,
  interruptions: 3,
  durationMinutes: 187,
  confidence: 62,

  /**
   * Attributs exigés par Care §4 et absents jusqu'ici : la référence à laquelle
   * l'observation se compare, la source qui l'a produite, et ce qui explique la
   * confiance partielle. Sans eux la carte donnait trois nombres sans le
   * raisonnement qui les rend lisibles.
   */
  reference: { nights: 14, medianInterruptions: 2, medianDurationMinutes: 203 },
  source: { device: 'MAT', windowStart: '23 h 10', windowEnd: '06 h 25' },
  unusableMinutes: 41,
};

export const MOCK_ANTICIPATION = {
  dogName: MOCK_DOG.name,
  message: "Gus anticipe vos départs le matin.",
  detail:
    "Depuis 6 jours, une courte phase d'éveil se répète entre 7 h 40 et 7 h 55, juste avant votre sortie habituelle.",
};

export const MOCK_RECOVERY = {
  mins: 12,
  trigger: 'un passage bruyant dans la rue',
};

export const MOCK_TREND_14D = Array.from({ length: 14 }, (_, i) => ({
  day: i + 1,
  eli: 50 + Math.round(15 * Math.sin(i / 2) + i * 1.2),
  captureMinutes: 90 + Math.round(40 * Math.cos(i / 3)),
  state: (i === 3 || i === 9 ? 'degraded' : 'valid') as 'valid' | 'degraded',
}));

// MOCK_JOURNAL retiré (Sprint 02) — le carnet utilise désormais lib/journal.ts.

export const MOCK_LOCAL = [
  { id: 'l1', kind: 'Vétérinaire', name: 'Cabinet Saint-Maur', distanceKm: 0.8, note: 'Ouvert jusqu\'à 19 h' },
  { id: 'l2', kind: 'Parc', name: 'Parc des Buttes-Chaumont', distanceKm: 1.4, note: 'Zone libre 07 h – 09 h' },
  { id: 'l3', kind: 'Éducateur', name: 'Margaux Lefèvre', distanceKm: 2.1, note: 'Spécialité : rappel et calme' },
  { id: 'l4', kind: 'Urgence', name: 'Centre Vétérinaire 24/24', distanceKm: 3.6, note: '24 h / 24' },
];

export const MOCK_SENSORS = [
  { id: 'mat', label: 'MAT de repos', state: 'valid' as const, coverage: 86, firmware: '1.3.2' },
  { id: 'tag', label: 'TAG activité', state: 'degraded' as const, coverage: 54, firmware: '0.9.7' },
];
