/**
 * Détection de la région de l'utilisateur (Section 6 + PATCH 6).
 *
 * Priorité : (1) région déclarée dans le profil ; (2) département (déclaré ou
 * géoloc consentie) → mapping ; (3) défaut Bretagne (région témoin).
 *
 * RGPD : la géoloc n'est utilisée qu'avec consentement, et seul le
 * département/région est conservé, jamais la position précise.
 *
 * PATCH 6 : le département 44 est rattaché à la Bretagne pour ce produit,
 * même si l'INSEE le classe en Pays de la Loire. Mapping explicite ci-dessous.
 */

import { BRETAGNE_KNOWLEDGE, BRETAGNE_PROFILE } from './profiles/bretagne';
import { TEST_REGION_KNOWLEDGE, TEST_REGION_PROFILE } from './profiles/test-region';
import type { RegionalKnowledgeBase } from './knowledge-types';
import type { RegionalProfile } from './types';

export interface RegionBundle {
  profile: RegionalProfile;
  knowledge: RegionalKnowledgeBase;
}

/** Registre des régions disponibles. Ajouter une région = l'enregistrer ici. */
export const REGION_REGISTRY: Record<string, RegionBundle> = {
  bretagne: { profile: BRETAGNE_PROFILE, knowledge: BRETAGNE_KNOWLEDGE },
  test_region: { profile: TEST_REGION_PROFILE, knowledge: TEST_REGION_KNOWLEDGE },
};

export const DEFAULT_REGION_ID = 'bretagne';

/**
 * Mapping département → région. Construit depuis les profils, avec le cas
 * particulier du 44 explicitement rattaché à la Bretagne (PATCH 6).
 */
function buildDepartmentMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [regionId, bundle] of Object.entries(REGION_REGISTRY)) {
    if (regionId === 'test_region') continue; // ne pas exposer la région de test
    for (const dep of bundle.profile.departments) map[dep] = regionId;
  }
  // Cas particulier documenté : 44 (Loire-Atlantique, INSEE Pays de la Loire)
  // est rattaché à la Bretagne pour ce produit.
  map['44'] = 'bretagne';
  return map;
}

const DEPARTMENT_TO_REGION = buildDepartmentMap();

export interface DetectRegionInput {
  /** Région déclarée explicitement dans le profil utilisateur. */
  declaredRegionId?: string;
  /** Département déclaré ou issu d'une géoloc consentie (ex. '29'). */
  department?: string;
}

export interface DetectRegionResult extends RegionBundle {
  /** Vrai si on est tombé sur le défaut faute d'information. */
  isDefault: boolean;
  /** Invitation douce à préciser sa région (si défaut). */
  invitation?: string;
}

export function detectRegion(input: DetectRegionInput = {}): DetectRegionResult {
  // 1) Région déclarée
  if (input.declaredRegionId && REGION_REGISTRY[input.declaredRegionId]) {
    return { ...REGION_REGISTRY[input.declaredRegionId]!, isDefault: false };
  }
  // 2) Département → région (avec cas 44)
  if (input.department) {
    const regionId = DEPARTMENT_TO_REGION[input.department];
    if (regionId && REGION_REGISTRY[regionId]) {
      return { ...REGION_REGISTRY[regionId]!, isDefault: false };
    }
  }
  // 3) Défaut Bretagne + invitation douce
  return {
    ...REGION_REGISTRY[DEFAULT_REGION_ID]!,
    isDefault: true,
    invitation: 'Pour des réponses plus proches de chez vous, indiquez votre région dans votre profil.',
  };
}
