/**
 * Regional Pack — machine-readable territory bundle.
 *
 * A regional pack groups the already-separated regional authorities without
 * collapsing them into one source of truth:
 * - RegionalProfile = identity/routing metadata;
 * - RegionalKnowledgeBase = human-reviewed local knowledge;
 * - regional lexicon = culturally reviewed wording;
 * - Breiz source registry = third-party rights/provenance authority.
 *
 * The pack itself cannot authorize a source, validate a cultural term or
 * strengthen scientific claims.
 */

import {
  getBreizSource,
  isBreizSourceReleaseReady,
} from '../data/breiz/sourceRegistry';
import { getVerifiedRegionalLexicon } from './regional-lexicon';
import type { RegionalKnowledgeBase } from './knowledge-types';
import type { RegionalProfile } from './types';

export type RegionalDataDomain =
  | 'territorial_context'
  | 'culture'
  | 'events'
  | 'heritage'
  | 'services'
  | 'canine_network';

export interface RegionalSourceBinding {
  sourceId: string;
  domains: readonly RegionalDataDomain[];
  purpose: string;
}

export interface RegionalPack {
  id: string;
  regionId: string;
  profile: RegionalProfile;
  knowledgeBase: RegionalKnowledgeBase;
  defaultLocale: string;
  supportedLocales: readonly string[];
  requiredDataDomains: readonly RegionalDataDomain[];
  sourceBindings: readonly RegionalSourceBinding[];
  notes: readonly string[];
}

export type RegionalPackReleaseBlocker =
  | 'REGION_ID_MISMATCH'
  | 'PROFILE_NOT_PRODUCTION_READY'
  | 'NO_VERIFIED_REGIONAL_LEXICON'
  | 'REQUIRED_DATA_DOMAIN_WITHOUT_RELEASE_READY_SOURCE'
  | 'UNKNOWN_SOURCE_BINDING';

export interface RegionalPackReleaseVerdict {
  packId: string;
  regionId: string;
  releaseReady: boolean;
  blockers: readonly RegionalPackReleaseBlocker[];
  missingDomains: readonly RegionalDataDomain[];
  unknownSourceIds: readonly string[];
}

export function evaluateRegionalPackReleaseReadiness(
  pack: RegionalPack,
  nowMs: number = Date.now(),
): RegionalPackReleaseVerdict {
  const blockers: RegionalPackReleaseBlocker[] = [];
  const unknownSourceIds: string[] = [];

  if (
    pack.regionId !== pack.profile.regionId ||
    pack.regionId !== pack.knowledgeBase.regionId
  ) {
    blockers.push('REGION_ID_MISMATCH');
  }

  if (pack.profile.status !== 'PRODUCTION_READY') {
    blockers.push('PROFILE_NOT_PRODUCTION_READY');
  }

  if (getVerifiedRegionalLexicon(pack.regionId).length === 0) {
    blockers.push('NO_VERIFIED_REGIONAL_LEXICON');
  }

  const readyDomains = new Set<RegionalDataDomain>();

  for (const binding of pack.sourceBindings) {
    const source = getBreizSource(binding.sourceId);
    if (!source) {
      unknownSourceIds.push(binding.sourceId);
      continue;
    }

    if (isBreizSourceReleaseReady(source, nowMs)) {
      for (const domain of binding.domains) {
        readyDomains.add(domain);
      }
    }
  }

  if (unknownSourceIds.length > 0) {
    blockers.push('UNKNOWN_SOURCE_BINDING');
  }

  const missingDomains = pack.requiredDataDomains.filter(
    (domain) => !readyDomains.has(domain),
  );

  if (missingDomains.length > 0) {
    blockers.push('REQUIRED_DATA_DOMAIN_WITHOUT_RELEASE_READY_SOURCE');
  }

  return {
    packId: pack.id,
    regionId: pack.regionId,
    releaseReady: blockers.length === 0,
    blockers,
    missingDomains,
    unknownSourceIds,
  };
}
