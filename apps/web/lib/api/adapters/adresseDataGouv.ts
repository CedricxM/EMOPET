/**
 * Adaptateur de géocodage BAN via le service Géoplateforme de l'IGN.
 *
 * NOTE DE COMPATIBILITÉ : l'identifiant interne `adresse-data-gouv` est conservé
 * temporairement pour ne pas casser les consumers existants. Le trafic réseau ne
 * doit plus utiliser api-adresse.data.gouv.fr, décommissionné en janvier 2026.
 *
 * Source officielle : https://data.geopf.fr/geocodage
 * Données : Base Adresse Nationale (BAN), sans géolocalisation IP.
 */

import { fetchWithTimeout } from '../fetchWithTimeout';
import { ProviderInvalidResponseError } from '../errors';
import { mustGetProvider } from '../providerRegistry';
import type { ContextSignal, LocationPrecision, ProviderDescriptor, ProviderHealthResult } from '../types';
import { buildSignal, clamp01, nowIso } from './_shared';

const PROVIDER = 'adresse-data-gouv';
export const descriptor: ProviderDescriptor = mustGetProvider(PROVIDER);

/**
 * Runtime authority for BAN geocoding. Do not derive this value from the legacy
 * provider registry entry until that generated registry/matrix is migrated in a
 * dedicated reconciliation pass.
 */
export const GEOPLATEFORME_GEOCODING_BASE = 'https://data.geopf.fr/geocodage';
const BASE = GEOPLATEFORME_GEOCODING_BASE;

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

/** Pur : normalise une feature GeoJSON BAN/Géoplateforme. */
export function normalizeFeature(f: BanFeature): GeoResult {
  const coords = f.geometry?.coordinates;
  const p = f.properties;
  if (!coords || coords.length < 2 || !p?.label) {
    throw new ProviderInvalidResponseError(PROVIDER, 'Feature BAN/Géoplateforme invalide.');
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
  const res = await fetchWithTimeout(url, {
    provider: PROVIDER,
    signal: opts.signal ?? null,
    timeoutMs: opts.timeoutMs ?? 8000,
  });
  if (!res.ok) throw new ProviderInvalidResponseError(PROVIDER, `HTTP ${res.status}`);
  const json = (await res.json()) as { features?: BanFeature[] };
  const f = json.features?.[0];
  if (!f) throw new ProviderInvalidResponseError(PROVIDER, 'Aucun résultat.');
  return f;
}

export function buildGeocodeUrl(address: string): string {
  return `${BASE}/search?q=${encodeURIComponent(address)}&limit=1`;
}

export function buildReverseGeocodeUrl(lat: number, lon: number): string {
  return `${BASE}/reverse?lon=${encodeURIComponent(String(lon))}&lat=${encodeURIComponent(String(lat))}&limit=1`;
}

export async function geocodeAddress(address: string, opts: FetchOpts = {}): Promise<ContextSignal<GeoResult>> {
  const f = await firstFeature(buildGeocodeUrl(address), opts);
  return geoSignal(normalizeFeature(f), 'exact');
}

export async function reverseGeocode(lat: number, lon: number, opts: FetchOpts = {}): Promise<ContextSignal<GeoResult>> {
  const f = await firstFeature(buildReverseGeocodeUrl(lat, lon), opts);
  return geoSignal(normalizeFeature(f), 'city');
}

export async function healthCheck(signal?: AbortSignal): Promise<ProviderHealthResult> {
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(buildGeocodeUrl('Lorient'), {
      provider: PROVIDER,
      signal: signal ?? null,
      timeoutMs: 6000,
    });
    return {
      provider: PROVIDER,
      ok: res.ok,
      status: descriptor.status,
      latencyMs: Date.now() - start,
      checkedAt: nowIso(),
    };
  } catch (e) {
    return {
      provider: PROVIDER,
      ok: false,
      status: descriptor.status,
      latencyMs: Date.now() - start,
      checkedAt: nowIso(),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function mockResponse(): ContextSignal[] {
  const f: BanFeature = {
    geometry: { coordinates: [-3.3702, 47.748] },
    properties: { label: 'Lorient', city: 'Lorient', postcode: '56100', citycode: '56121', score: 0.97 },
  };
  return [geoSignal(normalizeFeature(f), 'city')];
}
