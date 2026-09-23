export type OverpassReleaseDisposition = 'GO' | 'HOLD' | 'REMEDIATE';
export type OverpassLiveQueryFlow = 'REVIEWED' | 'OPEN';
export type OverpassCacheFlow = 'EPHEMERAL_MEMORY_ONLY' | 'OPEN';
export type OverpassRestrictedFlow = 'PROHIBITED' | 'REVIEWED' | 'OPEN';

export interface OverpassReleaseAuthority {
  disposition: OverpassReleaseDisposition;
  evidenceRevision: string | null;
  reviewedAt: string | null;
  reviewerRole: string | null;
  providerPolicyReceipt: string | null;
  renderedAttributionEvidence: string | null;
  liveQueryFlow: OverpassLiveQueryFlow;
  cacheFlow: OverpassCacheFlow;
  exportFlow: OverpassRestrictedFlow;
  derivedDatabaseFlow: OverpassRestrictedFlow;
  reason: string;
}

/**
 * DATA-LIC-G4 controlled release authority.
 *
 * Runtime environment variables configure a deployment; they do not prove that
 * the intended OpenStreetMap/Overpass service use has been reviewed. The
 * repository authority stays HOLD until provider/service-use policy and
 * rendered-attribution evidence have been reviewed for the current flow.
 */
export const OVERPASS_PRODUCTION_AUTHORITY: OverpassReleaseAuthority = {
  disposition: 'HOLD',
  evidenceRevision: null,
  reviewedAt: null,
  reviewerRole: null,
  providerPolicyReceipt: null,
  renderedAttributionEvidence: null,
  liveQueryFlow: 'OPEN',
  cacheFlow: 'EPHEMERAL_MEMORY_ONLY',
  exportFlow: 'PROHIBITED',
  derivedDatabaseFlow: 'PROHIBITED',
  reason:
    'Selected Overpass provider/service-use policy and controlled rendered-attribution evidence remain open under #116.',
};

export function isOverpassProductionUseAuthorized(
  authority: OverpassReleaseAuthority = OVERPASS_PRODUCTION_AUTHORITY,
  nowMs: number = Date.now(),
): boolean {
  if (authority.disposition !== 'GO') return false;
  if (!authority.evidenceRevision?.trim()) return false;
  if (!authority.reviewerRole?.trim()) return false;
  if (!authority.providerPolicyReceipt?.trim()) return false;
  if (!authority.renderedAttributionEvidence?.trim()) return false;
  if (!authority.reviewedAt) return false;

  const reviewedAt = Date.parse(authority.reviewedAt);
  if (!Number.isFinite(reviewedAt) || reviewedAt > nowMs) return false;

  if (authority.liveQueryFlow !== 'REVIEWED') return false;
  if (authority.cacheFlow !== 'EPHEMERAL_MEMORY_ONLY') return false;
  if (authority.exportFlow !== 'PROHIBITED') return false;
  if (authority.derivedDatabaseFlow !== 'PROHIBITED') return false;

  return true;
}
