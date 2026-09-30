export type WorldReleaseDisposition = 'GO' | 'HOLD' | 'REMEDIATE';

export interface WorldReleaseAuthority {
  disposition: WorldReleaseDisposition;
  founderAuthorizedAt: string | null;
  evidenceRevision: string | null;
  reviewedAt: string | null;
  reviewerRole: string | null;
  deploymentProfile: string | null;
  reason: string;
}

/**
 * WORLD-PROD controlled release authority.
 *
 * Founder authorization allows this workstream to progress to merge/production,
 * but a runtime environment flag alone is never production authority. A GO
 * requires versioned technical evidence and an identified deployment profile.
 */
export const WORLD_PRODUCTION_AUTHORITY: WorldReleaseAuthority = {
  disposition: 'HOLD',
  founderAuthorizedAt: '2026-09-30T08:51:41Z',
  evidenceRevision: null,
  reviewedAt: null,
  reviewerRole: null,
  deploymentProfile: null,
  reason:
    'Founder promotion authorization is recorded, but production deployment topology, fresh live hardening acceptance and Unity Editor/device evidence remain incomplete.',
};

export function isWorldProductionReleaseAuthorized(
  authority: WorldReleaseAuthority = WORLD_PRODUCTION_AUTHORITY,
): boolean {
  if (authority.disposition !== 'GO') return false;
  if (!authority.founderAuthorizedAt || !Number.isFinite(Date.parse(authority.founderAuthorizedAt))) return false;
  if (!authority.evidenceRevision?.trim()) return false;
  if (!authority.deploymentProfile?.trim()) return false;
  if (!authority.reviewerRole?.trim()) return false;
  if (!authority.reviewedAt) return false;

  const reviewedAt = Date.parse(authority.reviewedAt);
  const founderAuthorizedAt = Date.parse(authority.founderAuthorizedAt);
  if (!Number.isFinite(reviewedAt) || reviewedAt > Date.now()) return false;
  if (!Number.isFinite(founderAuthorizedAt) || founderAuthorizedAt > reviewedAt) return false;

  return true;
}
