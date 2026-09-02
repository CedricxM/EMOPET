export const DEFAULT_LOOKBACK_DAYS = 14;

export interface LookbackWindow {
  days: number;
  since: Date;
}

/**
 * Parse a bounded-by-representation lookback window.
 *
 * Product/Data/Privacy have not selected a maximum horizon. This helper only
 * rejects malformed integers and values that JavaScript Date cannot represent.
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
