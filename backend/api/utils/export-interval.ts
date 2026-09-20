export type ExportIntervalResult =
  | { ok: true; from: Date | null; to: Date | null }
  | { ok: false; error: 'invalid_from' | 'invalid_to' | 'invalid_interval' };

function parseSuppliedTimestamp(value: string | undefined): Date | null {
  if (value === undefined) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function parseExportInterval(
  rawFrom: string | undefined,
  rawTo: string | undefined,
): ExportIntervalResult {
  const from = parseSuppliedTimestamp(rawFrom);
  if (rawFrom !== undefined && from === null) {
    return { ok: false, error: 'invalid_from' };
  }

  const to = parseSuppliedTimestamp(rawTo);
  if (rawTo !== undefined && to === null) {
    return { ok: false, error: 'invalid_to' };
  }

  if (from !== null && to !== null && from.getTime() > to.getTime()) {
    return { ok: false, error: 'invalid_interval' };
  }

  return { ok: true, from, to };
}
