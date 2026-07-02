/**
 * Région FICTIVE de duplication (Section 9 — test de reproductibilité).
 * Prouve qu'ajouter une région = créer un profil + une base, SANS toucher
 * au moteur. Non utilisée en production.
 */

import type { RegionalKnowledgeBase } from '../knowledge-types';
import type { RegionalProfile } from '../types';

export const TEST_REGION_PROFILE: RegionalProfile = {
  regionId: 'test_region',
  assistantName: 'Testig',
  assistantNameOrigin: 'Nom fictif pour la validation du moteur',
  departments: ['99'],
  namingRule: "Nom issu de la langue ou de l'identité de la région",
  knowledgeBaseId: 'kb_test_region',
  status: 'IN_PROGRESS',
};

export const TEST_REGION_KNOWLEDGE: RegionalKnowledgeBase = {
  regionId: 'test_region',
  geographyEntries: [
    {
      id: 'geo_test_ville',
      name: 'Testville',
      type: 'ville',
      department: '99',
      description: 'Ville fictive de validation.',
      sourceVerified: true,
      _status: 'EXEMPLE_DEMO',
    },
  ],
  cultureEntries: [
    {
      id: 'cult_test',
      theme: 'autre',
      title: 'Tradition fictive',
      description: 'Exemple de validation du moteur.',
      sourceVerified: true,
      _status: 'EXEMPLE_DEMO',
    },
  ],
  rhythmSources: [],
};
