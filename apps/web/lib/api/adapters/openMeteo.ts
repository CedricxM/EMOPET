/**
 * Adaptateur Open-Meteo (météo). Catégorie `weather`, statut `active`.
 *
 * RÉUTILISE `lib/weather.ts` (déjà intégré, open data sans clé) pour le courant et
 * les prévisions ; ajoute la normalisation en `ContextSignal` et un contexte chaleur/
 * pluie/UV PRUDENT et NON MÉDICAL (décrit les conditions, jamais l'état de l'animal).
 */

import { fetchCurrentWeather, fetchForecast, weatherLabel } from '../../weather';
import type { CurrentWeather, DailyWeather } from '../../weather';
import { fetchWithTimeout } from '../fetchWithTimeout';
import { ProviderInvalidResponseError, ProviderUnavailableError } from '../errors';
import { mustGetProvider } from '../providerRegistry';
import type { ContextSignal, ProviderDescriptor, ProviderHealthResult } from '../types';
import { buildSignal, nowIso } from './_shared';

const PROVIDER = 'open-meteo';
export const descriptor: ProviderDescriptor = mustGetProvider(PROVIDER);
const BASE = descriptor.baseUrl; // https://api.open-meteo.com/v1

export interface WeatherValue {
  tempC: number;
  code: number;
  label: string;
  windKph: number;
}
export type HeatBand = 'froid' | 'frais' | 'doux' | 'chaud' | 'tres_chaud';
export interface HeatValue {
  tempC: number;
  band: HeatBand;
  note: string;
}
export interface RainValue {
  code: number;
  rain: boolean;
  label: string;
}
export type UVBand = 'faible' | 'modere' | 'eleve' | 'tres_eleve' | 'extreme';
export interface UVValue {
  uvIndex: number;
  band: UVBand;
}

interface FetchOpts {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Pur : mappe une météo courante (forme `lib/weather.ts`) en signal. Testable sans réseau. */
export function currentToSignal(cw: CurrentWeather, lat: number, lon: number): ContextSignal<WeatherValue> {
  return buildSignal<WeatherValue>({
    provider: PROVIDER,
    category: 'weather',
    value: { tempC: cw.tempC, code: cw.code, label: cw.label, windKph: cw.windKph },
    unit: '°C',
    timestamp: cw.time,
    location: { lat, lon, precision: 'exact' },
    confidence: 0.9,
    sourceType: 'measured',
  });
}

export async function getCurrentWeatherByCoords(lat: number, lon: number, opts: FetchOpts = {}): Promise<ContextSignal<WeatherValue>> {
  const cw = await fetchCurrentWeather(lat, lon, opts.signal);
  if (!cw) throw new ProviderUnavailableError(PROVIDER, 'Météo actuelle indisponible.');
  return currentToSignal(cw, lat, lon);
}

export async function getForecastByCoords(lat: number, lon: number, days = 3, opts: FetchOpts = {}): Promise<ContextSignal<DailyWeather[]>> {
  const daily = await fetchForecast(lat, lon, days, opts.signal);
  if (daily.length === 0) throw new ProviderUnavailableError(PROVIDER, 'Prévisions indisponibles.');
  return buildSignal<DailyWeather[]>({
    provider: PROVIDER,
    category: 'weather',
    value: daily,
    unit: '°C',
    location: { lat, lon, precision: 'exact' },
    confidence: 0.6,
    sourceType: 'forecast',
  });
}

/** Bande de chaleur — CONTEXTE de conditions, pas un état de l'animal. */
export function heatBand(tempC: number): { band: HeatBand; note: string } {
  if (tempC <= 0) return { band: 'froid', note: 'Conditions froides.' };
  if (tempC < 12) return { band: 'frais', note: 'Conditions fraîches.' };
  if (tempC < 22) return { band: 'doux', note: 'Conditions douces.' };
  if (tempC < 28) return { band: 'chaud', note: 'Conditions chaudes ; privilégier les heures fraîches.' };
  return { band: 'tres_chaud', note: 'Conditions très chaudes ; réserver les sorties aux heures fraîches.' };
}

export async function getHeatContext(lat: number, lon: number, opts: FetchOpts = {}): Promise<ContextSignal<HeatValue>> {
  const s = await getCurrentWeatherByCoords(lat, lon, opts);
  const { band, note } = heatBand(s.value.tempC);
  return buildSignal<HeatValue>({
    provider: PROVIDER,
    category: 'weather',
    value: { tempC: s.value.tempC, band, note },
    unit: '°C',
    timestamp: s.timestamp,
    location: s.location,
    confidence: s.confidence,
    sourceType: 'measured',
  });
}

/** Pur : présence de pluie depuis un code WMO. */
export function rainFromCode(code: number): { rain: boolean; label: string } {
  const rain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
  return { rain, label: weatherLabel(code) };
}

export async function getRainContext(lat: number, lon: number, opts: FetchOpts = {}): Promise<ContextSignal<RainValue>> {
  const s = await getCurrentWeatherByCoords(lat, lon, opts);
  const { rain, label } = rainFromCode(s.value.code);
  return buildSignal<RainValue>({
    provider: PROVIDER,
    category: 'weather',
    value: { code: s.value.code, rain, label },
    timestamp: s.timestamp,
    location: s.location,
    confidence: s.confidence,
    sourceType: 'measured',
  });
}

/** Pur : bande d'index UV (échelle OMS). */
export function uvBand(uv: number): UVBand {
  if (uv < 3) return 'faible';
  if (uv < 6) return 'modere';
  if (uv < 8) return 'eleve';
  if (uv < 11) return 'tres_eleve';
  return 'extreme';
}

export async function getUVContext(lat: number, lon: number, opts: FetchOpts = {}): Promise<ContextSignal<UVValue>> {
  const url = `${BASE}/forecast?latitude=${lat}&longitude=${lon}&current=uv_index&timezone=auto`;
  const res = await fetchWithTimeout(url, { provider: PROVIDER, signal: opts.signal ?? null, timeoutMs: opts.timeoutMs ?? 8000 });
  if (!res.ok) throw new ProviderInvalidResponseError(PROVIDER, `HTTP ${res.status}`);
  const j = (await res.json()) as { current?: { uv_index?: number; time?: string } };
  const uv = j.current?.uv_index;
  if (typeof uv !== 'number') throw new ProviderInvalidResponseError(PROVIDER, 'uv_index manquant.');
  return buildSignal<UVValue>({
    provider: PROVIDER,
    category: 'weather',
    value: { uvIndex: uv, band: uvBand(uv) },
    timestamp: j.current?.time,
    location: { lat, lon, precision: 'exact' },
    confidence: 0.85,
    sourceType: 'measured',
  });
}

export async function healthCheck(signal?: AbortSignal): Promise<ProviderHealthResult> {
  const start = Date.now();
  try {
    const cw = await fetchCurrentWeather(47.748, -3.37, signal);
    return { provider: PROVIDER, ok: cw !== null, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso() };
  } catch (e) {
    return { provider: PROVIDER, ok: false, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso(), error: e instanceof Error ? e.message : String(e) };
  }
}

export function mockResponse(): ContextSignal[] {
  return [currentToSignal({ tempC: 18, code: 2, label: weatherLabel(2), windKph: 12, time: nowIso() }, 47.748, -3.37)];
}
