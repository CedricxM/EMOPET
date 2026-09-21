/** Explicit UTC instants, without silent date normalisation or precision loss. */
export function canonicalRetentionUtc(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/.exec(value);
  if (!match || match[0] !== value) return null;

  const canonical = `${match[1]}.${(match[2] ?? '').padEnd(3, '0')}Z`;
  const parsed = Date.parse(canonical);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString() === canonical ? canonical : null;
}

/** Keep arithmetic results inside the same four-digit-year contract as inputs. */
export function representableRetentionUtc(date: Date): string | null {
  if (!Number.isFinite(date.getTime())) return null;
  const year = date.getUTCFullYear();
  return year >= 0 && year <= 9999 ? date.toISOString() : null;
}

/** Signed calendar-month shift, clamped to the last day of the target month. */
export function shiftRetentionUtcMonths(iso: string, months: number): string | null {
  const canonical = canonicalRetentionUtc(iso);
  if (!canonical || !Number.isSafeInteger(months)) return null;

  const source = new Date(canonical);
  const totalMonth = source.getUTCFullYear() * 12 + source.getUTCMonth() + months;
  if (!Number.isSafeInteger(totalMonth)) return null;
  const targetYear = Math.floor(totalMonth / 12);
  if (targetYear < 0 || targetYear > 9999) return null;
  const targetMonth = ((totalMonth % 12) + 12) % 12;

  // Date.UTC treats years 0..99 as 1900..1999; setUTCFullYear preserves them.
  const end = new Date(0);
  end.setUTCFullYear(targetYear, targetMonth + 1, 0);
  const target = new Date(0);
  target.setUTCFullYear(
    targetYear, targetMonth, Math.min(source.getUTCDate(), end.getUTCDate()),
  );
  target.setUTCHours(
    source.getUTCHours(), source.getUTCMinutes(),
    source.getUTCSeconds(), source.getUTCMilliseconds(),
  );
  return representableRetentionUtc(target);
}
