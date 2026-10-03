export type CommunityAction =
  | 'PUBLISH_COMMUNITY'
  | 'CREATE_MEET'
  | 'DISCLOSE_EXACT_LOCATION'
  | 'CREATE_RELAY'
  | 'DISPATCH_VOICE_CUE';

export interface CommunityAuthorityInput {
  action: CommunityAction;
  explicitConsent: boolean;
  purposeMatches: boolean;
  actorBlocked?: boolean;
  authorityRevoked?: boolean;
  inferredOnly?: boolean;
  source?: 'OWNER_EXPLICIT' | 'ELI' | 'MAT_TAG' | 'PRIVATE_MEMORY' | 'JOURNAL' | 'VET' | 'RAW_BREIZ';
  locationPrecision?: 'NONE' | 'AREA' | 'EXACT';
}

export interface CommunityAuthorityDecision {
  allowed: boolean;
  reason:
    | 'AUTHORIZED'
    | 'CONSENT_REQUIRED'
    | 'PURPOSE_MISMATCH'
    | 'BLOCKED'
    | 'REVOKED'
    | 'INFERENCE_CANNOT_ACT'
    | 'PRIVATE_SOURCE_CANNOT_BECOME_SOCIAL'
    | 'EXACT_LOCATION_REQUIRES_EXPLICIT_AUTHORITY';
}

const PRIVATE_SOURCES = new Set([
  'ELI',
  'MAT_TAG',
  'PRIVATE_MEMORY',
  'JOURNAL',
  'VET',
  'RAW_BREIZ',
]);

export function decideCommunityAuthority(input: CommunityAuthorityInput): CommunityAuthorityDecision {
  if (input.actorBlocked) return { allowed: false, reason: 'BLOCKED' };
  if (input.authorityRevoked) return { allowed: false, reason: 'REVOKED' };
  if (input.inferredOnly) return { allowed: false, reason: 'INFERENCE_CANNOT_ACT' };

  if (input.source && PRIVATE_SOURCES.has(input.source) && input.source !== 'OWNER_EXPLICIT') {
    return { allowed: false, reason: 'PRIVATE_SOURCE_CANNOT_BECOME_SOCIAL' };
  }

  if (!input.explicitConsent) return { allowed: false, reason: 'CONSENT_REQUIRED' };
  if (!input.purposeMatches) return { allowed: false, reason: 'PURPOSE_MISMATCH' };

  if (input.action === 'DISCLOSE_EXACT_LOCATION' && input.locationPrecision !== 'EXACT') {
    return { allowed: false, reason: 'EXACT_LOCATION_REQUIRES_EXPLICIT_AUTHORITY' };
  }

  return { allowed: true, reason: 'AUTHORIZED' };
}

export function mayAutoPublishFromObservation(): false {
  return false;
}

export function mayUseRelationshipScoreForMatchmaking(): false {
  return false;
}
