/**
 * Types de la base de connaissances régionale.
 *
 * 3 familles : Géographie vécue, Culture/traditions, Rythmes du quotidien.
 * On crée la STRUCTURE ; le contenu vérifié est un travail éditorial humain.
 * Tout ce qui n'est pas un exemple incontestable reste PENDING_VERIFIED_CONTENT.
 */

export type ContentStatus = 'EXEMPLE_DEMO' | 'PENDING_VERIFIED_CONTENT' | 'VERIFIED';

export interface GeographyEntry {
  id: string;
  name: string;
  type: 'plage' | 'sentier' | 'foret' | 'parc' | 'ville' | 'autre';
  department: string;
  latitude?: number;
  longitude?: number;
  /** Caractère du lieu, du point de vue d'un habitant. */
  description: string;
  /** Pertinence pour la promenade canine. */
  dogFriendlyNotes?: string;
  sourceVerified: boolean;
  _status: ContentStatus;
}

export interface CultureEntry {
  id: string;
  theme: 'fete' | 'musique' | 'langue' | 'gastronomie' | 'histoire' | 'symbole' | 'autre';
  title: string;
  description: string;
  /** Façons justes d'évoquer ce thème en conversation. */
  evocationExamples?: string[];
  sourceVerified: boolean;
  _status: ContentStatus;
}

/**
 * FAMILLE 3 — Rythmes du quotidien (météo, marées, agenda).
 *
 * ⚠ PATCH 4 — HORS PÉRIMÈTRE d'implémentation cette itération. On pose
 * uniquement l'interface ; aucune logique de récupération n'est écrite.
 * `implemented` reste `false`.
 *
 * Critère de déclenchement du futur chantier (pour mémoire) : démarrer SEULEMENT
 * lorsque (a) au moins une région est PRODUCTION_READY côté géo + culture, ET
 * (b) une source météo/marées fiable a été choisie. Tant que ces deux conditions
 * ne sont pas réunies, ne pas démarrer ce sous-système.
 */
export interface RhythmSourcePlaceholder {
  kind: 'meteo' | 'marees' | 'agenda_local';
  description: string;
  futureDataSource: string;
  implemented: false;
}

export interface RegionalKnowledgeBase {
  regionId: string;
  /** FAMILLE 1 — Géographie vécue (prioritaire ; nourrit aussi la carte communautaire). */
  geographyEntries: GeographyEntry[];
  /** FAMILLE 2 — Culture et traditions. */
  cultureEntries: CultureEntry[];
  /** FAMILLE 3 — Rythmes (structure seulement, non implémenté). */
  rhythmSources: RhythmSourcePlaceholder[];
}
