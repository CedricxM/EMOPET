/**
 * Adaptateur OpenAQ (qualité de l'air). Catégorie `air_quality`, statut `active`.
 *
 * IMPORTANT : la qualité de l'air est un CONTEXTE, jamais une interprétation médicale.
 * La normalisation (pure) est testée ; le câblage exact du schéma v3 est finalisé à
 * l'activation (le parse est tolérant et déclaré). Repli : `aqicn`.
 */

import { readEnv } from '../config';
import { fetchWithTimeout } from '../fetchWithTimeout';
import { ProviderInvalidResponseError } from '../errors';
import { mustGetProvider } from '../providerRegistry';
import type { ContextSignal, ProviderDescriptor, ProviderHealthResult, SignalLocation } from '../types';
import { buildSignal, nowIso } from './_shared';

const PROVIDER = 'openaq';
export const descriptor: ProviderDescriptor = mustGetProvider(PROVIDER);
const BASE = descriptor.baseUrl;

interface FetchOpts {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface AqMeasurement {
  parameter: string;
  value: number;
  unit?: string;
  datetime?: string;
}

export interface AirQualityValue {
  pm25?: number;
  pm10?: number;
  o3?: number;
  no2?: number;
  aqi?: number;
}

const PARAM_MAP: Record<string, keyof AirQualityValue> = {
  pm25: 'pm25',
  'pm2.5': 'pm25',
  pm10: 'pm10',
  o3: 'o3',
  no2: 'no2',
};

/** Pur : agrège une liste de mesures en un signal qualité d'air. Testable sans réseau. */
export function normalizeMeasurements(measurements: AqMeasurement[], location: SignalLocation): ContextSignal<AirQualityValue> {
  const value: AirQualityValue = {};
  let timestamp: string | undefined;
  for (const m of measurements) {
    const key = PARAM_MAP[(m.parameter ?? '').toLowerCase()];
    if (key && Number.isFinite(m.value)) {
      value[key] = m.value;
      if (m.datetime) timestamp = m.datetime;
    }
  }
  if (Object.keys(value).length === 0) {
    throw new ProviderInvalidResponseError(PROVIDER, 'Aucune mesure exploitable.');
  }
  return buildSignal<AirQualityValue>({
    provider: PROVIDER,
    category: 'air_quality',
    value,
    unit: 'µg/m³',
    timestamp,
    location,
    confidence: 0.85,
    sourceType: 'measured',
  });
}

interface OpenAqRow {
  parameter?: string;
  value?: number;
  unit?: string;
  date?: { utc?: string };
}

export async function getAirQualityByCoords(lat: number, lon: number, opts: FetchOpts = {}): Promise<ContextSignal<AirQualityValue>> {
  const key = readEnv('API_OPENAQ_KEY');
  const url = `${BASE}/latest?coordinates=${lat},${lon}&radius=15000&limit=50`;
  const res = await fetchWithTimeout(url, {
    provider: PROVIDER,
    signal: opts.signal ?? null,
    timeoutMs: opts.timeoutMs ?? 8000,
    headers: key ? { 'X-API-Key': key } : undefined,
  });
  if (!res.ok) throw new ProviderInvalidResponseError(PROVIDER, `HTTP ${res.status}`);
  const json = (await res.json()) as { results?: OpenAqRow[] };
  const rows = json.results ?? [];
  const measurements: AqMeasurement[] = rows
    .filter((r): r is Required<Pick<OpenAqRow, 'parameter' | 'value'>> & OpenAqRow => typeof r.value === 'number' && typeof r.parameter === 'string')
    .map((r) => ({ parameter: r.parameter, value: r.value, unit: r.unit, datetime: r.date?.utc }));
  return normalizeMeasurements(measurements, { lat, lon, precision: 'city' });
}

/** Alias sémantiques (contexte). */
export const getPollutionContext = getAirQualityByCoords;
export const getEnvironmentalContext = getAirQualityByCoords;

export async function healthCheck(signal?: AbortSignal): Promise<ProviderHealthResult> {
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(`${BASE}/instruments?limit=1`, { provider: PROVIDER, signal: signal ?? null, timeoutMs: 6000 });
    return { provider: PROVIDER, ok: res.ok, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso() };
  } catch (e) {
    return { provider: PROVIDER, ok: false, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso(), error: e instanceof Error ? e.message : String(e) };
  }
}

export function mockResponse(): ContextSignal[] {
  return [
    normalizeMeasurements(
      [
        { parameter: 'pm25', value: 9, unit: 'µg/m³', datetime: nowIso() },
        { parameter: 'pm10', value: 15, unit: 'µg/m³', datetime: nowIso() },
        { parameter: 'no2', value: 22, unit: 'µg/m³', datetime: nowIso() },
      ],
      { lat: 47.748, lon: -3.37, precision: 'city' },
    ),
  ];
}
