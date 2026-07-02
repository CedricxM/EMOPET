/**
 * Système d'ancrage régional de l'assistant (Breiz).
 *
 * Principe : un MOTEUR commun (caractère + garde-fous) identique à toutes les
 * régions, et un PROFIL régional (`RegionalProfile`) qui porte tout ce qui
 * change d'une région à l'autre. Ajouter une région = créer un profil + une
 * base de connaissances, sans toucher au moteur.
 *
 * ⚠ On construit la STRUCTURE, pas le contenu culturel. Tout contenu non
 * vérifié est marqué `PENDING_VERIFIED_CONTENT` (remplissage éditorial humain).
 */

export type RegionStatus = 'TEMOIN_DEMO' | 'IN_PROGRESS' | 'PRODUCTION_READY';

export interface RegionalProfile {
  /** 'bretagne', 'alsace', 'normandie'... */
  regionId: string;
  /** 'Breiz' pour la Bretagne. */
  assistantName: string;
  /** Explication du nom (transparence / doc). */
  assistantNameOrigin: string;
  /** Départements couverts, ex. ['22','29','35','44','56']. */
  departments: string[];
  /** Règle de nommage appliquée (documentée, pas exécutable). */
  namingRule: string;
  /** Pointeur vers la base de connaissances chargée. */
  knowledgeBaseId: string;
  /** Statut de complétude (prêt en prod ?). */
  status: RegionStatus;
}

/** Contexte d'un tour de conversation passé au moteur. */
export interface ConversationContext {
  userMessage: string;
  /** Si true → chemin VERROUILLÉ (garde-fou médical 4.3), ton factuel. */
  touchesEliData: boolean;
  /** Niveau de confiance de la donnée ELI évoquée, si applicable. */
  eliConfidence?: 'VALID' | 'DEGRADED' | 'SUPPRESSED';
  /** Pour l'usage « Initier ». */
  timeOfDay?: string;
  recentActivity?: string;
}
