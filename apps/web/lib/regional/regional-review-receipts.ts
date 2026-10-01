/**
 * Regional language/culture review receipts.
 *
 * A cultural or linguistic term is not release-ready merely because it exists
 * in the repository or because an organisation has been contacted.
 *
 * This registry stores only controlled review receipts. It does not store
 * private contact data, contracts or email bodies.
 */

export type RegionalReviewDisposition = 'APPROVED' | 'REJECTED';

export interface RegionalReviewReceipt {
  receiptId: string;
  regionId: string;
  lexiconEntryId: string;
  reviewerRole: string;
  reviewerRef: string;
  reviewedAt: string;
  exactTerm: string;
  approvedMeaningFr: string;
  permittedUsage: readonly string[];
  sourceReference: string;
  disposition: RegionalReviewDisposition;
}

/**
 * No review receipt is currently promoted to repository authority.
 *
 * When a real review is completed, add the minimum non-sensitive receipt here
 * only after the exact evidence has been preserved through the project's
 * normal evidence/governance process.
 */
export const REGIONAL_REVIEW_RECEIPTS: readonly RegionalReviewReceipt[] = [] as const;

export function isRegionalReviewReceiptStructurallyValid(
  receipt: RegionalReviewReceipt,
  nowMs: number = Date.now(),
): boolean {
  if (
    receipt.receiptId.trim().length === 0 ||
    receipt.regionId.trim().length === 0 ||
    receipt.lexiconEntryId.trim().length === 0 ||
    receipt.reviewerRole.trim().length === 0 ||
    receipt.reviewerRef.trim().length === 0 ||
    receipt.exactTerm.trim().length === 0 ||
    receipt.approvedMeaningFr.trim().length === 0 ||
    receipt.sourceReference.trim().length === 0 ||
    receipt.permittedUsage.length === 0
  ) {
    return false;
  }

  const reviewedAt = Date.parse(receipt.reviewedAt);
  if (!Number.isFinite(reviewedAt) || reviewedAt > nowMs) {
    return false;
  }

  return true;
}

export function hasApprovedRegionalReviewReceipt(
  regionId: string,
  lexiconEntryId: string,
  exactTerm: string,
  receipts: readonly RegionalReviewReceipt[] = REGIONAL_REVIEW_RECEIPTS,
  nowMs: number = Date.now(),
): boolean {
  return receipts.some((receipt) => {
    return (
      receipt.disposition === 'APPROVED' &&
      receipt.regionId === regionId &&
      receipt.lexiconEntryId === lexiconEntryId &&
      receipt.exactTerm === exactTerm &&
      isRegionalReviewReceiptStructurallyValid(receipt, nowMs)
    );
  });
}
