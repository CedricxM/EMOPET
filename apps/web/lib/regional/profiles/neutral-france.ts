/**
 * Neutral national fallback.
 *
 * Used only when EMOPET cannot resolve a reviewed regional companion.
 * It prevents Bretagne/Breiz from becoming the accidental identity of every
 * unsupported territory.
 */

import type { RegionalKnowledgeBase } from '../knowledge-types';
import type { RegionalProfile } from '../types';

export const NEUTRAL_FRANCE_PROFILE: RegionalProfile = {
  regionId: 'neutral_france',
  assistantName: 'EMOPET',
  assistantNameOrigin: 'Identité nationale neutre de repli, sans revendication culturelle régionale',
  departments: [],
  namingRule: 'Fallback neutre : ne pas inventer d’identité régionale sans profil contrôlé',
  knowledgeBaseId: 'kb_neutral_france',
  status: 'IN_PROGRESS',
};

export const NEUTRAL_FRANCE_KNOWLEDGE: RegionalKnowledgeBase = {
  regionId: 'neutral_france',
  geographyEntries: [],
  cultureEntries: [],
  rhythmSources: [],
};
