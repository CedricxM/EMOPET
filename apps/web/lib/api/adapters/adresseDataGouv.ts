/**
 * Adaptateur adresse.data.gouv.fr (BAN — géocodage FR). Catégorie `geocoding`, `active`.
 * Open data, sans clé. Sert l'onboarding/localisation à partir d'une saisie VOLONTAIRE
 * (jamais de géoloc IP). Repli international : `geoapify` (scaffold).
 */

import { fetchWithTimeout } from '../fetchWithTimeout';
import { ProviderInvalidResponseError } from '../errors';
import { mustGetProvider } from '../providerRegistry';
import type { ContextSignal, LocationPrecision, ProviderDescriptor, ProviderHealthResult } from '../types';
import { buildSignal, clamp01, nowIso } from './_shared';

const PROVIDER = 'adresse-data-gouv';
export const descriptor: ProviderDescriptor = mustGetProvider(PROVIDER);
const BASE = descriptor.baseUrl;

interface FetchOpts {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface GeoResult {
  label: string;
  lat: number;
  lon: number;
  city?: string;
  postcode?: string;
  citycode?: string;
  score?: number;
}

interface BanFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: { label?: string; city?: string; postcode?: string; citycode?: string; score?: number };
}

/** Pur : normalise une feature BAN en résultat de géocodage. Testable sans réseau. */
export function normalizeFeature(f: BanFeature): GeoResult {
  const coords = f.geometry?.coordinates;
  const p = f.properties;
  if (!coords || coords.length < 2 || !p?.label) {
    throw new ProviderInvalidResponseError(PROVIDER, 'Feature BAN invalide.');
  }
  const [lon, lat] = coords;
  return { label: p.label, lat, lon, city: p.city, postcode: p.postcode, citycode: p.citycode, score: p.score };
}

function geoSignal(g: GeoResult, precision: LocationPrecision): ContextSignal<GeoResult> {
  return buildSignal<GeoResult>({
    provider: PROVIDER,
    category: 'geocoding',
    value: g,
    location: { lat: g.lat, lon: g.lon, city: g.city, country: 'France', precision },
    confidence: typeof g.score === 'number' ? clamp01(Math.max(0.5, g.score)) : 0.8,
    sourceType: 'measured',
  });
}

async function firstFeature(url: string, opts: FetchOpts): Promise<BanFeature> {
  const res = await fetchWithTimeout(url, { provider: PROVIDER, signal: opts.signal ?? null, timeoutMs: opts.timeoutMs ?? 8000 });
  if (!res.ok) throw new ProviderInvalidResponseError(PROVIDER, `HTTP ${res.status}`);
  const json = (await res.json()) as { features?: BanFeature[] };
  const f = json.features?.[0];
  if (!f) throw new ProviderInvalidResponseError(PROVIDER, 'Aucun résultat.');
  return f;
}

export async function geocodeAddress(address: string, opts: FetchOpts = {}): Promise<ContextSignal<GeoResult>> {
  const f = await firstFeature(`${BASE}/search/?q=${encodeURIComponent(address)}&limit=1`, opts);
  return geoSignal(normalizeFeature(f), 'exact');
}

export async function reverseGeocode(lat: number, lon: number, opts: FetchOpts = {}): Promise<ContextSignal<GeoResult>> {
  const f = await firstFeature(`${BASE}/reverse/?lon=${lon}&lat=${lat}`, opts);
  return geoSignal(normalizeFeature(f), 'city');
}

export async function healthCheck(signal?: AbortSignal): Promise<ProviderHealthResult> {
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(`${BASE}/search/?q=lorient&limit=1`, { provider: PROVIDER, signal: signal ?? null, timeoutMs: 6000 });
    return { provider: PROVIDER, ok: res.ok, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso() };
  } catch (e) {
    return { provider: PROVIDER, ok: false, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso(), error: e instanceof Error ? e.message : String(e) };
  }
}

export function mockResponse(): ContextSignal[] {
  const f: BanFeature = {
    geometry: { coordinates: [-3.3702, 47.748] },
    properties: { label: 'Lorient', city: 'Lorient', postcode: '56100', citycode: '56121', score: 0.97 },
  };
  return [geoSignal(normalizeFeature(f), 'city')];
}
