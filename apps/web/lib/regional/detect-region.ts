/**
 * Détection de la région de l'utilisateur (Section 6 + PATCH 6).
 *
 * Priorité : (1) région déclarée dans le profil ; (2) département (déclaré ou
 * géoloc consentie) → mapping ; (3) fallback national neutre.
 *
 * RGPD : la géoloc n'est utilisée qu'avec consentement, et seul le
 * département/région est conservé, jamais la position précise.
 *
 * PATCH 6 : le département 44 est rattaché à la Bretagne pour ce produit,
 * même si l'INSEE le classe en Pays de la Loire. Mapping explicite ci-dessous.
 */

import { BRETAGNE_KNOWLEDGE, BRETAGNE_PROFILE } from './profiles/bretagne';
import { TEST_REGION_KNOWLEDGE, TEST_REGION_PROFILE } from './profiles/test-region';
import { NEUTRAL_FRANCE_KNOWLEDGE, NEUTRAL_FRANCE_PROFILE } from './profiles/neutral-france';
import type { RegionalKnowledgeBase } from './knowledge-types';
import type { RegionalProfile } from './types';

export interface RegionBundle {
  profile: RegionalProfile;
  knowledge: RegionalKnowledgeBase;
}

/** Registre des régions disponibles. Ajouter une région = l'enregistrer ici. */
export const REGION_REGISTRY: Record<string, RegionBundle> = {
  neutral_france: { profile: NEUTRAL_FRANCE_PROFILE, knowledge: NEUTRAL_FRANCE_KNOWLEDGE },
  bretagne: { profile: BRETAGNE_PROFILE, knowledge: BRETAGNE_KNOWLEDGE },
  test_region: { profile: TEST_REGION_PROFILE, knowledge: TEST_REGION_KNOWLEDGE },
};

export const DEFAULT_REGION_ID = 'neutral_france';

/**
 * Mapping département → région. Construit depuis les profils, avec le cas
 * particulier du 44 explicitement rattaché à la Bretagne (PATCH 6).
 */
function buildDepartmentMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [regionId, bundle] of Object.entries(REGION_REGISTRY)) {
    if (regionId === 'test_region' || regionId === 'neutral_france') continue; // profils non territoriaux
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
  // 3) Fallback neutre + invitation douce
  return {
    ...REGION_REGISTRY[DEFAULT_REGION_ID]!,
    isDefault: true,
    invitation: 'Pour des réponses plus proches de chez vous, indiquez votre région dans votre profil.',
  };
}


export type RegionalCompanionContextMode =
  | 'CURRENT_REGION'
  | 'HOME_REGION'
  | 'CURRENT_REGION_UNSUPPORTED_NEUTRAL'
  | 'NEUTRAL';

export interface ResolveRegionalCompanionContextInput {
  /** Stable/home region declared by the user. */
  homeRegionId?: string;
  /** Current region, if explicitly known from user input or consented location context. */
  currentRegionId?: string;
  /** Current department, only when the caller is allowed to use that context. */
  currentDepartment?: string;
}

export interface RegionalCompanionContext {
  active: DetectRegionResult;
  mode: RegionalCompanionContextMode;
  homeRegionId: string | null;
  currentRegionId: string | null;
  currentContextProvided: boolean;
  isAwayFromHome: boolean;
}

function getTerritorialRegionById(regionId?: string): RegionBundle | null {
  if (!regionId) return null;
  if (regionId === 'neutral_france' || regionId === 'test_region') return null;
  return REGION_REGISTRY[regionId] ?? null;
}

function getTerritorialRegionByDepartment(department?: string): RegionBundle | null {
  if (!department) return null;
  const regionId = DEPARTMENT_TO_REGION[department];
  return regionId ? getTerritorialRegionById(regionId) : null;
}

/**
 * Resolve the active regional companion while keeping home and current
 * territory semantics distinct.
 *
 * Privacy boundary: this function does not acquire location. Callers may pass
 * currentRegionId/currentDepartment only when that context is already allowed.
 *
 * Policy:
 * - supported current territory wins and may change companion identity;
 * - explicitly supplied but unsupported current territory falls neutral rather
 *   than reusing the home companion in the wrong place;
 * - when no current context exists, a supported home region is used;
 * - otherwise EMOPET stays neutral.
 */
export function resolveRegionalCompanionContext(
  input: ResolveRegionalCompanionContextInput = {},
): RegionalCompanionContext {
  const home = getTerritorialRegionById(input.homeRegionId);
  const currentContextProvided =
    (typeof input.currentRegionId === 'string' && input.currentRegionId.trim() !== '') ||
    (typeof input.currentDepartment === 'string' && input.currentDepartment.trim() !== '');

  const current =
    getTerritorialRegionById(input.currentRegionId) ??
    getTerritorialRegionByDepartment(input.currentDepartment);

  if (currentContextProvided) {
    if (current) {
      return {
        active: { ...current, isDefault: false },
        mode: 'CURRENT_REGION',
        homeRegionId: home?.profile.regionId ?? null,
        currentRegionId: current.profile.regionId,
        currentContextProvided: true,
        isAwayFromHome: home ? home.profile.regionId !== current.profile.regionId : false,
      };
    }

    const neutral = REGION_REGISTRY[DEFAULT_REGION_ID]!;
    return {
      active: {
        ...neutral,
        isDefault: true,
        invitation:
          'Ce territoire n’a pas encore de compagnon régional contrôlé. EMOPET reste neutre pour le moment.',
      },
      mode: 'CURRENT_REGION_UNSUPPORTED_NEUTRAL',
      homeRegionId: home?.profile.regionId ?? null,
      currentRegionId: null,
      currentContextProvided: true,
      isAwayFromHome: home !== null,
    };
  }

  if (home) {
    return {
      active: { ...home, isDefault: false },
      mode: 'HOME_REGION',
      homeRegionId: home.profile.regionId,
      currentRegionId: null,
      currentContextProvided: false,
      isAwayFromHome: false,
    };
  }

  const neutral = detectRegion({});
  return {
    active: neutral,
    mode: 'NEUTRAL',
    homeRegionId: null,
    currentRegionId: null,
    currentContextProvided: false,
    isAwayFromHome: false,
  };
}
