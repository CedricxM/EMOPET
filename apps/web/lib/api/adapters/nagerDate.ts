/**
 * Adaptateur Nager.Date (jours fériés / routine). Catégorie `calendar`, statut `active`.
 * Open data, sans clé. Contexte de routine : week-end / jour férié = la routine de
 * balade peut différer (contexte, jamais une conclusion sur l'animal).
 */

import { fetchWithTimeout } from '../fetchWithTimeout';
import { ProviderInvalidResponseError } from '../errors';
import { mustGetProvider } from '../providerRegistry';
import type { ContextSignal, ProviderDescriptor, ProviderHealthResult } from '../types';
import { buildSignal, nowIso } from './_shared';

const PROVIDER = 'nager-date';
export const descriptor: ProviderDescriptor = mustGetProvider(PROVIDER);
const BASE = descriptor.baseUrl;

interface FetchOpts {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface Holiday {
  date: string;
  localName: string;
  name: string;
}
interface RawHoliday {
  date?: string;
  localName?: string;
  name?: string;
}

export function normalizeHolidays(raw: RawHoliday[]): Holiday[] {
  return raw
    .filter((h): h is RawHoliday & { date: string } => typeof h.date === 'string')
    .map((h) => ({ date: h.date, localName: h.localName ?? h.name ?? '', name: h.name ?? h.localName ?? '' }));
}

/** Pur : jour de semaine (0=dim..6=sam) + week-end. */
export function weekdayInfo(dateStr: string): { weekday: number; isWeekend: boolean } {
  const weekday = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return { weekday, isWeekend: weekday === 0 || weekday === 6 };
}

export interface RoutineValue {
  date: string;
  weekday: number;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
}

export function routineFrom(dateStr: string, holidays: Holiday[]): RoutineValue {
  const { weekday, isWeekend } = weekdayInfo(dateStr);
  const h = holidays.find((x) => x.date === dateStr);
  return { date: dateStr, weekday, isWeekend, isHoliday: Boolean(h), holidayName: h?.localName };
}

export async function getPublicHolidays(country: string, year: number, opts: FetchOpts = {}): Promise<ContextSignal<Holiday[]>> {
  const url = `${BASE}/PublicHolidays/${year}/${encodeURIComponent(country)}`;
  const res = await fetchWithTimeout(url, { provider: PROVIDER, signal: opts.signal ?? null, timeoutMs: opts.timeoutMs ?? 8000 });
  if (!res.ok) throw new ProviderInvalidResponseError(PROVIDER, `HTTP ${res.status}`);
  const raw = (await res.json()) as RawHoliday[];
  return buildSignal<Holiday[]>({ provider: PROVIDER, category: 'calendar', value: normalizeHolidays(raw), sourceType: 'measured', confidence: 0.95 });
}

export async function isHoliday(date: string, country: string, opts: FetchOpts = {}): Promise<boolean> {
  const sig = await getPublicHolidays(country, Number(date.slice(0, 4)), opts);
  return sig.value.some((h) => h.date === date);
}

export async function getRoutineContext(date: string, country: string, opts: FetchOpts = {}): Promise<ContextSignal<RoutineValue>> {
  const sig = await getPublicHolidays(country, Number(date.slice(0, 4)), opts);
  return buildSignal<RoutineValue>({ provider: PROVIDER, category: 'calendar', value: routineFrom(date, sig.value), sourceType: 'measured', confidence: 0.95 });
}

/** Alias sémantique (le `location` éventuel pourra raffiner le pays plus tard). */
export const getCalendarContext = getRoutineContext;

export async function healthCheck(signal?: AbortSignal): Promise<ProviderHealthResult> {
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(`${BASE}/AvailableCountries`, { provider: PROVIDER, signal: signal ?? null, timeoutMs: 6000 });
    return { provider: PROVIDER, ok: res.ok, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso() };
  } catch (e) {
    return { provider: PROVIDER, ok: false, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso(), error: e instanceof Error ? e.message : String(e) };
  }
}

export function mockResponse(): ContextSignal[] {
  const holidays = normalizeHolidays([{ date: '2026-07-14', localName: 'Fête nationale', name: 'Bastille Day' }]);
  return [buildSignal<RoutineValue>({ provider: PROVIDER, category: 'calendar', value: routineFrom('2026-07-14', holidays), sourceType: 'measured', confidence: 0.95 })];
}
