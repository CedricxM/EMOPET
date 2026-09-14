export type MapboxReleaseDisposition = 'GO' | 'HOLD' | 'REMEDIATE';
export type MapboxTokenScope = 'PUBLIC_BROWSER_TOKEN_ONLY' | 'OPEN';

export interface MapboxReleaseAuthority {
  disposition: MapboxReleaseDisposition;
  evidenceRevision: string | null;
  reviewedAt: string | null;
  reviewerRole: string | null;
  accountAuthorityEvidence: string | null;
  billingAuthorityEvidence: string | null;
  termsReceipt: string | null;
  tokenCustodyEvidence: string | null;
  renderedAttributionEvidence: string | null;
  privacyReviewEvidence: string | null;
  tokenScope: MapboxTokenScope;
  reason: string;
}

/**
 * DATA-LIC-G5 controlled Mapbox service authority.
 *
 * A public browser token and an environment flag are configuration, not proof
 * that the account, billing relationship, accepted terms, token custody,
 * rendered attribution or privacy/data-processing implications were reviewed.
 * Only controlled evidence pointers belong here; never commit tokens, account
 * credentials, invoices, private contracts or personal account material.
 */
export const MAPBOX_PRODUCTION_AUTHORITY: MapboxReleaseAuthority = {
  disposition: 'HOLD',
  evidenceRevision: null,
  reviewedAt: null,
  reviewerRole: null,
  accountAuthorityEvidence: null,
  billingAuthorityEvidence: null,
  termsReceipt: null,
  tokenCustodyEvidence: null,
  renderedAttributionEvidence: null,
  privacyReviewEvidence: null,
  tokenScope: 'OPEN',
  reason:
    'Mapbox account/billing authority, accepted terms, token custody, rendered attribution and privacy review remain open under #116.',
};

export function isMapboxProductionUseAuthorized(
  authority: MapboxReleaseAuthority = MAPBOX_PRODUCTION_AUTHORITY,
): boolean {
  if (authority.disposition !== 'GO') return false;
  if (!authority.evidenceRevision?.trim()) return false;
  if (!authority.reviewerRole?.trim()) return false;
  if (!authority.accountAuthorityEvidence?.trim()) return false;
  if (!authority.billingAuthorityEvidence?.trim()) return false;
  if (!authority.termsReceipt?.trim()) return false;
  if (!authority.tokenCustodyEvidence?.trim()) return false;
  if (!authority.renderedAttributionEvidence?.trim()) return false;
  if (!authority.privacyReviewEvidence?.trim()) return false;
  if (!authority.reviewedAt) return false;

  const reviewedAt = Date.parse(authority.reviewedAt);
  if (!Number.isFinite(reviewedAt) || reviewedAt > Date.now()) return false;
  if (authority.tokenScope !== 'PUBLIC_BROWSER_TOKEN_ONLY') return false;

  return true;
}
