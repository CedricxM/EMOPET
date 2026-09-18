export type LocalDirectoryReleaseDisposition = 'GO' | 'HOLD' | 'REMEDIATE';

export interface LocalDirectoryReleaseAuthority {
  disposition: LocalDirectoryReleaseDisposition;
  evidenceRevision: string | null;
  reviewedAt: string | null;
  reviewerRole: string | null;
  reason: string;
}

/**
 * DATA-LIC-G3 controlled production authority.
 *
 * Environment variables are deployment switches, not evidence. Production
 * directory publication therefore needs both the runtime GO switch and a
 * separately reviewed repository authority record. This record deliberately
 * remains HOLD until row-level provenance/rights evidence has been reviewed.
 */
export const LOCAL_DIRECTORY_PRODUCTION_AUTHORITY: LocalDirectoryReleaseAuthority = {
  disposition: 'HOLD',
  evidenceRevision: null,
  reviewedAt: null,
  reviewerRole: null,
  reason: 'Row-level provenance, permitted-use basis and unsupported historical claims remain open under #116.',
};

export function isLocalDirectoryProductionReleaseAuthorized(
  authority: LocalDirectoryReleaseAuthority = LOCAL_DIRECTORY_PRODUCTION_AUTHORITY,
): boolean {
  if (authority.disposition !== 'GO') return false;
  if (!authority.evidenceRevision?.trim()) return false;
  if (!authority.reviewerRole?.trim()) return false;
  if (!authority.reviewedAt) return false;

  const reviewedAt = Date.parse(authority.reviewedAt);
  if (!Number.isFinite(reviewedAt) || reviewedAt > Date.now()) return false;

  return true;
}
