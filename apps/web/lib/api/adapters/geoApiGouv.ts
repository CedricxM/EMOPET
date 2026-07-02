/**
 * Adaptateur geo.api.gouv.fr (communes/départements/régions FR). `geocoding`, `active`.
 * Open data, sans clé. Donne le contexte territorial (commune → département/région,
 * population, centre) — complète `lib/data/territory`.
 */

import { fetchWithTimeout } from '../fetchWithTimeout';
import { ProviderInvalidResponseError } from '../errors';
import { mustGetProvider } from '../providerRegistry';
import type { ContextSignal, ProviderDescriptor, ProviderHealthResult } from '../types';
import { buildSignal, nowIso } from './_shared';

const PROVIDER = 'geoapi-gouv';
export const descriptor: ProviderDescriptor = mustGetProvider(PROVIDER);
const BASE = descriptor.baseUrl;
const FIELDS = 'nom,code,codeDepartement,codeRegion,population,centre';

interface FetchOpts {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface CityMetadata {
  nom: string;
  code: string;
  codeDepartement?: string;
  codeRegion?: string;
  population?: number;
  lat?: number;
  lon?: number;
}

interface Commune {
  nom?: string;
  code?: string;
  codeDepartement?: string;
  codeRegion?: string;
  population?: number;
  centre?: { coordinates?: [number, number] };
}

/** Pur : normalise une commune geo.api.gouv en métadonnées de ville. Testable sans réseau. */
export function normalizeCommune(c: Commune): CityMetadata {
  if (!c.nom || !c.code) throw new ProviderInvalidResponseError(PROVIDER, 'Commune invalide.');
  const centre = c.centre?.coordinates;
  return {
    nom: c.nom,
    code: c.code,
    codeDepartement: c.codeDepartement,
    codeRegion: c.codeRegion,
    population: c.population,
    lon: centre?.[0],
    lat: centre?.[1],
  };
}

function citySignal(m: CityMetadata): ContextSignal<CityMetadata> {
  return buildSignal<CityMetadata>({
    provider: PROVIDER,
    category: 'geocoding',
    value: m,
    location: { lat: m.lat, lon: m.lon, city: m.nom, country: 'France', precision: 'city' },
    confidence: 0.9,
    sourceType: 'measured',
  });
}

async function firstCommune(url: string, opts: FetchOpts): Promise<Commune> {
  const res = await fetchWithTimeout(url, { provider: PROVIDER, signal: opts.signal ?? null, timeoutMs: opts.timeoutMs ?? 8000 });
  if (!res.ok) throw new ProviderInvalidResponseError(PROVIDER, `HTTP ${res.status}`);
  const json = (await res.json()) as Commune[];
  const c = json[0];
  if (!c) throw new ProviderInvalidResponseError(PROVIDER, 'Aucune commune.');
  return c;
}

export async function getFrenchCityMetadata(cityCodeOrName: string, opts: FetchOpts = {}): Promise<ContextSignal<CityMetadata>> {
  const byCode = /^\d{5}$/.test(cityCodeOrName.trim());
  const query = byCode
    ? `${BASE}/communes?code=${encodeURIComponent(cityCodeOrName.trim())}&fields=${FIELDS}`
    : `${BASE}/communes?nom=${encodeURIComponent(cityCodeOrName)}&boost=population&limit=1&fields=${FIELDS}`;
  return citySignal(normalizeCommune(await firstCommune(query, opts)));
}

export async function getTerritoryContext(lat: number, lon: number, opts: FetchOpts = {}): Promise<ContextSignal<CityMetadata>> {
  const url = `${BASE}/communes?lat=${lat}&lon=${lon}&fields=${FIELDS}`;
  return citySignal(normalizeCommune(await firstCommune(url, opts)));
}

export async function healthCheck(signal?: AbortSignal): Promise<ProviderHealthResult> {
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(`${BASE}/communes?code=56121&fields=nom`, { provider: PROVIDER, signal: signal ?? null, timeoutMs: 6000 });
    return { provider: PROVIDER, ok: res.ok, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso() };
  } catch (e) {
    return { provider: PROVIDER, ok: false, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso(), error: e instanceof Error ? e.message : String(e) };
  }
}

export function mockResponse(): ContextSignal[] {
  const c: Commune = {
    nom: 'Lorient',
    code: '56121',
    codeDepartement: '56',
    codeRegion: '53',
    population: 57084,
    centre: { coordinates: [-3.3702, 47.748] },
  };
  return [citySignal(normalizeCommune(c))];
}
