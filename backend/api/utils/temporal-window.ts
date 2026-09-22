export const DEFAULT_LOOKBACK_DAYS = 14;

export interface LookbackWindow {
  days: number;
  since: Date;
}

/**
 * Parse a lookback window bounded only by runtime representation.
 *
 * Product/Data/Privacy have not selected a maximum horizon for the Presence
 * windows owned by #142. This helper therefore rejects malformed integers and
 * values JavaScript Date cannot represent, but it does not invent a product cap.
 *
 * Importantly, there is currently no retention-derived number to copy here:
 * the two active call sites are Presence/absence routes that still fail closed
 * because durable Presence persistence/lifecycle authority is not implemented
 * (#135). Until a canonical durable Presence source/category exists, its actual
 * storage/lifecycle ceiling is not known.
 *
 * If a later Product/Data/Privacy decision adds a maximum, it must be justified
 * against the retention/lifecycle authority of the data the route actually
 * reads at that time and should reference the canonical policy rather than
 * duplicate a retention constant in this helper.
 *
 * The frozen #224 source contains a days <= 30 cap with no located approval.
 * That value is not authority merely because it exists in composed code.
 *
 * #140 Vet Report is intentionally out of scope here: it uses its own
 * parseVetReportDays contract and reads a different mixed dataset.
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
