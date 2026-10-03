import type { BreizDocument } from './breizDocument.schema';
import type { BreizSourceDescriptor } from './sourceRegistry';

export type BreizDocumentFreshnessVerdict =
  | 'fresh'
  | 'stale'
  | 'no_recheck_rule'
  | 'unreadable_last_checked_at'
  | 'future_last_checked_at';

type FreshnessDocument = Pick<BreizDocument, 'last_checked_at'>;

/**
 * Content freshness is independent from rights freshness.
 *
 * A currently valid rights receipt cannot keep an old snapshot publishable
 * forever. Public-use paths must also prove that the document was checked
 * within the source-specific freshness window.
 */
export function evaluateBreizDocumentFreshness(
  document: FreshnessDocument,
  source: Pick<BreizSourceDescriptor, 'freshnessHours'>,
  nowMs: number = Date.now(),
): BreizDocumentFreshnessVerdict {
  const freshnessHours = source.freshnessHours;
  if (
    freshnessHours == null ||
    !Number.isFinite(freshnessHours) ||
    freshnessHours <= 0
  ) {
    return 'no_recheck_rule';
  }

  const checkedAt = Date.parse(document.last_checked_at);
  if (!Number.isFinite(checkedAt)) return 'unreadable_last_checked_at';
  if (checkedAt > nowMs) return 'future_last_checked_at';

  const freshnessWindowMs = freshnessHours * 60 * 60 * 1000;
  return nowMs - checkedAt <= freshnessWindowMs ? 'fresh' : 'stale';
}

export function isBreizDocumentFresh(
  document: FreshnessDocument,
  source: Pick<BreizSourceDescriptor, 'freshnessHours'>,
  nowMs: number = Date.now(),
): boolean {
  return evaluateBreizDocumentFreshness(document, source, nowMs) === 'fresh';
}
