export const DEFAULT_LOOKBACK_DAYS = 14;

export interface LookbackWindow {
  days: number;
  since: Date;
}

/**
 * Parse a lookback window bounded only by runtime representation.
 *
 * Product/Data/Privacy have not selected a maximum horizon (#142 WINDOW-G3,
 * #140 VET-PERIOD-G3). This helper only rejects malformed integers and values
 * that JavaScript Date cannot represent.
 *
 * WHERE A MAXIMUM MUST COME FROM, when one is chosen: not from this file, and
 * not from a number picked for convenience. A query horizon longer than the
 * retention window of the data it reads cannot return anything, so the cap is
 * derivable from `config/privacy/retention-schedule.json` — 36 months for
 * `sensor_preprocessed_detailed` and `eli_inferred_detailed`, which is what
 * these endpoints read. Two consequences:
 *
 *  1. that number is still `PRODUCT_APPROVED_CANDIDATE_LEGAL_PRIVACY_SIGNOFF_PENDING`
 *     (#478), so a cap derived from it inherits candidate status and must not be
 *     presented to clients as settled policy;
 *  2. it must be *referenced*, never restated here. #470 retired duplicated
 *     retention constants and a test guards their return; a second copy in this
 *     file would recreate exactly that.
 *
 * The frozen #224 source contains a `days <= 30` cap with no located approval.
 * That value is not authority merely because it exists in composed code.
 */
export function parseLookbackWindow(
  rawValue: string | undefined,
  now: Date = new Date(),
): LookbackWindow | null {
  const normalized = rawValue === undefined
    ? String(DEFAULT_LOOKBACK_DAYS)
    : rawValue.trim();

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const days = Number(normalized);
  if (!Number.isSafeInteger(days) || days <= 0) {
    return null;
  }

  const since = new Date(now.getTime());
  since.setDate(since.getDate() - days);
  if (!Number.isFinite(since.getTime())) {
    return null;
  }

  return { days, since };
}
