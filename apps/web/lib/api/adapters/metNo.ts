/**
 * Adaptateur Meteorologisk Institutt (met.no) — météo. Catégorie `weather`, REPLI
 * de open-meteo. Open data, sans clé, mais User-Agent OBLIGATOIRE (CGU met.no).
 * Même forme normalisée que Open-Meteo (`WeatherValue`) → arbitrable ensemble.
 */

import { fetchWithTimeout } from '../fetchWithTimeout';
import { ProviderInvalidResponseError } from '../errors';
import { mustGetProvider } from '../providerRegistry';
import type { ContextSignal, ProviderDescriptor, ProviderHealthResult } from '../types';
import { buildSignal, nowIso } from './_shared';
import type { WeatherValue } from './openMeteo';

const PROVIDER = 'met-no';
export const descriptor: ProviderDescriptor = mustGetProvider(PROVIDER);
const BASE = descriptor.baseUrl; // https://api.met.no/weatherapi
const USER_AGENT = 'EMOPET/1.0 (bien-être canin non médical; contact: contact@emopet.fr)';

interface FetchOpts {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** met.no n'utilise pas les codes WMO mais des `symbol_code` → libellé FR court. */
export function symbolLabel(symbol: string | undefined): string {
  if (!symbol) return 'Variable';
  if (symbol.includes('thunder')) return 'Orage';
  if (symbol.includes('snow')) return 'Neige';
  if (symbol.includes('sleet')) return 'Neige fondue';
  if (symbol.includes('rain')) return 'Pluie';
  if (symbol.includes('fog')) return 'Brouillard';
  // « partlycloudy » contient « cloudy » → tester l'avant d'abord.
  if (symbol.includes('partlycloudy') || symbol.includes('fair')) return 'Partiellement nuageux';
  if (symbol.includes('cloudy')) return 'Nuageux';
  if (symbol.includes('clearsky')) return 'Ciel dégagé';
  return 'Variable';
}

interface MetNoResp {
  properties?: {
    timeseries?: Array<{
      time?: string;
      data?: {
        instant?: { details?: { air_temperature?: number; wind_speed?: number } };
        next_1_hours?: { summary?: { symbol_code?: string } };
      };
    }>;
  };
}

/** Pur : normalise la 1ʳᵉ entrée de timeseries en signal météo. Testable sans réseau. */
export function normalizeForecast(raw: MetNoResp, lat: number, lon: number): ContextSignal<WeatherValue> {
  const first = raw.properties?.timeseries?.[0];
  const details = first?.data?.instant?.details;
  if (!first || typeof details?.air_temperature !== 'number') {
    throw new ProviderInvalidResponseError(PROVIDER, 'Timeseries met.no invalide.');
  }
  const symbol = first.data?.next_1_hours?.summary?.symbol_code;
  return buildSignal<WeatherValue>({
    provider: PROVIDER,
    category: 'weather',
    value: {
      tempC: Math.round(details.air_temperature),
      code: 0, // pas de code WMO côté met.no
      label: symbolLabel(symbol),
      windKph: typeof details.wind_speed === 'number' ? Math.round(details.wind_speed * 3.6) : 0,
    },
    unit: '°C',
    timestamp: first.time,
    location: { lat, lon, precision: 'exact' },
    confidence: 0.9,
    sourceType: 'measured',
  });
}

export async function getCurrentWeatherByCoords(lat: number, lon: number, opts: FetchOpts = {}): Promise<ContextSignal<WeatherValue>> {
  const url = `${BASE}/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
  const res = await fetchWithTimeout(url, {
    provider: PROVIDER,
    signal: opts.signal ?? null,
    timeoutMs: opts.timeoutMs ?? 8000,
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new ProviderInvalidResponseError(PROVIDER, `HTTP ${res.status}`);
  return normalizeForecast((await res.json()) as MetNoResp, lat, lon);
}

export async function healthCheck(signal?: AbortSignal): Promise<ProviderHealthResult> {
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(`${BASE}/locationforecast/2.0/compact?lat=47.748&lon=-3.37`, {
      provider: PROVIDER,
      signal: signal ?? null,
      timeoutMs: 6000,
      headers: { 'User-Agent': USER_AGENT },
    });
    return { provider: PROVIDER, ok: res.ok, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso() };
  } catch (e) {
    return { provider: PROVIDER, ok: false, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso(), error: e instanceof Error ? e.message : String(e) };
  }
}

export function mockResponse(): ContextSignal[] {
  return [
    normalizeForecast(
      { properties: { timeseries: [{ time: nowIso(), data: { instant: { details: { air_temperature: 17.6, wind_speed: 3 } }, next_1_hours: { summary: { symbol_code: 'partlycloudy_day' } } } }] } },
      47.748,
      -3.37,
    ),
  ];
}
