/**
 * Orchestration LIVE du contexte EMOPET.
 *
 * `buildContext` compose les contextes par catégorie (localisation, météo, qualité de
 * l'air, calendrier) en appelant les providers ACTIFS (flag + env), via `resilientFetch`
 * (cache/santé/retry), puis en ARBITRANT le résultat. Si AUCUN provider actif ne répond,
 * on bascule sur les providers de REPLI (`fallback`) — statut `fallback_used`. Sortie :
 * `EMOPETContext` prudent, tamponné non médical. Résolveurs injectables (tests sans réseau).
 *
 * Aucune API externe ne pilote une conclusion : un contexte indisponible ou incertain
 * reste `null` (jamais une valeur forcée).
 */

import type { ArbitratedSignal, ContextSignal, ProviderDescriptor, ProvenanceEntry } from '../api/types';
import type { CacheCategory } from '../api/cache';
import { activeProviders, fallbackProviders } from '../api/providerRegistry';
import { resilientFetch } from '../api/runProvider';
import * as openMeteo from '../api/adapters/openMeteo';
import * as metNo from '../api/adapters/metNo';
import * as openAQ from '../api/adapters/openAQ';
import * as geoApiGouv from '../api/adapters/geoApiGouv';
import * as nagerDate from '../api/adapters/nagerDate';
import { toNumericReadings } from './arbitration/evidenceResolver';
import { arbitrateNumeric } from './arbitration/contextArbitrator';
import { assembleContext, type EMOPETContext } from './contextAggregator';
import { cautiousUnavailable } from './policies/nonMedicalPolicy';

export interface BuildContextInput {
  lat: number;
  lon: number;
  /** ISO date (YYYY-MM-DD) ; défaut = aujourd'hui (UTC). */
  date?: string;
  /** Code pays ISO ; défaut = FR. */
  country?: string;
}

export type CategoryResolver = (input: BuildContextInput, signal?: AbortSignal) => Promise<ArbitratedSignal | undefined>;

export interface ContextResolvers {
  location?: CategoryResolver;
  weather?: CategoryResolver;
  airQuality?: CategoryResolver;
  calendar?: CategoryResolver;
}

type CategoryFetcher<T> = (input: BuildContextInput, signal?: AbortSignal) => Promise<ContextSignal<T>>;

/** Arrondi de coords pour la clé de cache (≈ 1 km), limite la cardinalité. */
function coordKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

/**
 * Arbitrage d'un contexte NON numérique (localisation, routine) : on retient le signal
 * le plus confiant ; provenance conservée. Vide → indisponible (jamais forcé).
 */
export function confirmFromSignals(signals: ReadonlyArray<ContextSignal>, category: string): ArbitratedSignal {
  if (signals.length === 0) return cautiousUnavailable(category, 'insufficient_data', 'Aucune source disponible.');
  const best = [...signals].sort((a, b) => b.confidence - a.confidence)[0]!;
  const provenance: ProvenanceEntry[] = signals.map((s) => ({ provider: s.provider, value: s.value, weight: s.confidence, freshness: s.freshness, usedInConsensus: s === best }));
  return {
    category,
    status: signals.length > 1 ? 'consensus' : 'confirmed',
    value: best.value,
    confidence: best.confidence,
    provenance,
    warnings: [],
    arbitratedAt: new Date().toISOString(),
  };
}

// ── Fetchers implémentés par catégorie (provider → appel adaptateur) ──────────
const WEATHER_FETCHERS: Record<string, CategoryFetcher<{ tempC?: number }>> = {
  'open-meteo': (input, signal) => openMeteo.getCurrentWeatherByCoords(input.lat, input.lon, { signal }),
  'met-no': (input, signal) => metNo.getCurrentWeatherByCoords(input.lat, input.lon, { signal }),
};
const AIR_FETCHERS: Record<string, CategoryFetcher<{ pm25?: number }>> = {
  openaq: (input, signal) => openAQ.getAirQualityByCoords(input.lat, input.lon, { signal }),
};

/** Appelle chaque provider d'une liste via `resilientFetch` ; renvoie les signaux obtenus. */
async function gatherList<T>(
  list: ReadonlyArray<ProviderDescriptor>,
  fetchers: Record<string, CategoryFetcher<T>>,
  cacheCategory: CacheCategory,
  input: BuildContextInput,
  signal?: AbortSignal,
): Promise<ContextSignal<T>[]> {
  const out: ContextSignal<T>[] = [];
  for (const d of list) {
    const fetcher = fetchers[d.providerName];
    if (!fetcher) continue; // listé mais adaptateur non câblé (scaffold) → ignoré
    const s = await resilientFetch<T>({
      provider: d.providerName,
      cacheKey: `${d.category}:${d.providerName}:${coordKey(input.lat, input.lon)}`,
      cacheCategory,
      fetcher: (sig) => fetcher(input, sig),
      signal,
    });
    if (s) out.push(s);
  }
  return out;
}

export interface FallbackResolveParams<T> {
  category: string;
  unit?: string;
  numericPath: (value: T) => number | undefined;
  active: ReadonlyArray<ProviderDescriptor>;
  fallback: ReadonlyArray<ProviderDescriptor>;
  fetchers: Record<string, CategoryFetcher<T>>;
  cacheCategory: CacheCategory;
  input: BuildContextInput;
  signal?: AbortSignal;
}

/**
 * Résout un contexte NUMÉRIQUE : providers actifs d'abord ; s'ils ne donnent rien,
 * bascule sur le repli (statut `fallback_used`). Vide → contexte indisponible (jamais forcé).
 */
export async function resolveWithFallback<T>(p: FallbackResolveParams<T>): Promise<ArbitratedSignal> {
  let signals = await gatherList<T>(p.active, p.fetchers, p.cacheCategory, p.input, p.signal);
  let usedFallback = false;
  if (signals.length === 0 && p.fallback.length > 0) {
    signals = await gatherList<T>(p.fallback, p.fetchers, p.cacheCategory, p.input, p.signal);
    usedFallback = signals.length > 0;
  }
  if (signals.length === 0) return cautiousUnavailable(p.category);

  const arb = arbitrateNumeric(toNumericReadings(signals, p.category, p.numericPath), { category: p.category, unit: p.unit });
  return usedFallback ? { ...arb, status: 'fallback_used', warnings: [...arb.warnings, 'fallback_used'] } : arb;
}

// ── Résolveurs par défaut (réels) ────────────────────────────────────────────
const defaultResolvers: Required<ContextResolvers> = {
  async weather(input, signal) {
    return resolveWithFallback<{ tempC?: number }>({
      category: 'weather',
      unit: '°C',
      numericPath: (v) => v.tempC,
      active: activeProviders('weather'),
      fallback: fallbackProviders('weather'),
      fetchers: WEATHER_FETCHERS,
      cacheCategory: 'weather_current',
      input,
      signal,
    });
  },
  async airQuality(input, signal) {
    return resolveWithFallback<{ pm25?: number }>({
      category: 'air_quality',
      unit: 'µg/m³',
      numericPath: (v) => v.pm25,
      active: activeProviders('air_quality'),
      fallback: fallbackProviders('air_quality'),
      fetchers: AIR_FETCHERS,
      cacheCategory: 'air_quality',
      input,
      signal,
    });
  },
  async location(input, signal) {
    if (activeProviders('geocoding').every((d) => d.providerName !== 'geoapi-gouv')) return cautiousUnavailable('geocoding');
    const s = await resilientFetch({
      provider: 'geoapi-gouv',
      cacheKey: `geocoding:geoapi-gouv:${coordKey(input.lat, input.lon)}`,
      cacheCategory: 'geocoding',
      fetcher: (sig) => geoApiGouv.getTerritoryContext(input.lat, input.lon, { signal: sig }),
      signal,
    });
    return confirmFromSignals(s ? [s] : [], 'geocoding');
  },
  async calendar(input, signal) {
    if (activeProviders('calendar').every((d) => d.providerName !== 'nager-date')) return cautiousUnavailable('calendar');
    const date = input.date ?? new Date().toISOString().slice(0, 10);
    const country = input.country ?? 'FR';
    const s = await resilientFetch({
      provider: 'nager-date',
      cacheKey: `calendar:nager-date:${country}:${date}`,
      cacheCategory: 'holidays',
      fetcher: (sig) => nagerDate.getRoutineContext(date, country, { signal: sig }),
      signal,
    });
    return confirmFromSignals(s ? [s] : [], 'calendar');
  },
};

async function runSafe(resolver: CategoryResolver | undefined, input: BuildContextInput, signal?: AbortSignal): Promise<ArbitratedSignal | undefined> {
  if (!resolver) return undefined;
  try {
    return await resolver(input, signal);
  } catch {
    return undefined; // une catégorie en panne ne fait jamais échouer le contexte global
  }
}

export async function buildContext(
  input: BuildContextInput,
  resolvers: ContextResolvers = defaultResolvers,
  signal?: AbortSignal,
): Promise<EMOPETContext> {
  const [location, weather, airQuality, calendar] = await Promise.all([
    runSafe(resolvers.location, input, signal),
    runSafe(resolvers.weather, input, signal),
    runSafe(resolvers.airQuality, input, signal),
    runSafe(resolvers.calendar, input, signal),
  ]);
  return assembleContext({ locationContext: location, weatherContext: weather, airQualityContext: airQuality, calendarContext: calendar });
}
