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

import type { SemanticEvidenceEnvelope } from '../language/types';

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
  /** Défense secondaire basée sur la requête ; l'enveloppe sémantique fait autorité lorsqu'elle existe. */
  touchesEliData: boolean;
  /** Niveau de publication historique, conservé pour compatibilité. */
  eliConfidence?: 'VALID' | 'DEGRADED' | 'SUPPRESSED' | 'UNKNOWN';
  /** Enveloppe structurée de vérité/qualité/provenance transmise par le produit. */
  semanticEnvelope?: SemanticEvidenceEnvelope;
  /** Pour l'usage « Initier ». */
  timeOfDay?: string;
  recentActivity?: string;
}
