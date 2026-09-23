/**
 * OpenStreetMap POIs via Overpass.
 *
 * RIGHTS CONTROL:
 * - public Overpass use is disabled by default;
 * - activation requires BOTH a reviewed repository release authority and
 *   NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE=GO;
 * - an explicit clean HTTPS endpoint must be configured through
 *   NEXT_PUBLIC_EMOPET_OVERPASS_ENDPOINT;
 * - environment configuration is not service-use clearance;
 * - persistent caching, export and derived-database use remain outside the
 *   current authority under #116.
 *
 * Truth invariant: "source unavailable" is not "zero POIs".
 */

import type { SpotCategory } from '../components/bretagne-map/spots';
import {
  isOverpassProductionUseAuthorized,
  OVERPASS_PRODUCTION_AUTHORITY,
  type OverpassReleaseAuthority,
} from './overpass-rights';

export interface OsmSpot {
  id: string;
  category: SpotCategory;
  name: string;
  lon: number;
  lat: number;
  fromOsm: true;
  sourceName: 'OpenStreetMap';
  sourceElementUrl: string;
  attributionText: '© OpenStreetMap contributors';
  licenseUrl: 'https://www.openstreetmap.org/copyright';
}

export interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export type OsmSpotLoadResult =
  | { status: 'ok'; spots: OsmSpot[] }
  | { status: 'unavailable' };

const OSM_LICENSE_URL = 'https://www.openstreetmap.org/copyright' as const;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 40;

export function normalizeOverpassEndpoint(endpoint: string | undefined): string | null {
  const normalizedEndpoint = endpoint?.trim();
  if (!normalizedEndpoint) return null;

  try {
    const url = new URL(normalizedEndpoint);
    if (
      url.protocol !== 'https:' ||
      url.username !== '' ||
      url.password !== '' ||
      url.search !== '' ||
      url.hash !== ''
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function getControlledOverpassEndpoint(
  rightsGate: string | undefined = process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE,
  endpoint: string | undefined = process.env.NEXT_PUBLIC_EMOPET_OVERPASS_ENDPOINT,
  authority: OverpassReleaseAuthority = OVERPASS_PRODUCTION_AUTHORITY,
): string | null {
  if (rightsGate !== 'GO') return null;
  if (!isOverpassProductionUseAuthorized(authority)) return null;
  return normalizeOverpassEndpoint(endpoint);
}

export function isOverpassRuntimeAllowed(): boolean {
  return getControlledOverpassEndpoint() !== null;
}

function categoryFor(tags: Record<string, string>): SpotCategory | null {
  if (tags.amenity === 'veterinary') return 'veterinaire';
  if (tags.shop === 'pet') return 'magasin';
  if (tags.leisure === 'dog_park') return 'parc';
  if (tags.leisure === 'park') return 'parc';
  if (tags.natural === 'beach') return 'plage';
  if (tags.amenity === 'cafe' && (tags.dog === 'yes' || tags.dog === 'leashed')) return 'cafe';
  return null;
}

const FALLBACK_NAMES: Record<SpotCategory, string> = {
  plage: 'Plage',
  parc: 'Parc',
  foret: 'Sentier',
  veterinaire: 'Vétérinaire',
  comportementaliste: 'Éducateur',
  pension: 'Pension',
  magasin: 'Magasin animalier',
  cafe: 'Café',
};

export interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface CacheEntry {
  spots: OsmSpot[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function bboxKey(b: Bounds): string {
  return [b.south, b.west, b.north, b.east].map((n) => n.toFixed(2)).join(',');
}

function getCachedSpots(key: string, now = Date.now()): OsmSpot[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    cache.delete(key);
    return null;
  }

  cache.delete(key);
  cache.set(key, entry);
  return entry.spots;
}

function setCachedSpots(key: string, spots: OsmSpot[], now = Date.now()): void {
  cache.delete(key);
  cache.set(key, { spots, expiresAt: now + CACHE_TTL_MS });

  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}

function isSupportedElementType(type: string): type is 'node' | 'way' | 'relation' {
  return type === 'node' || type === 'way' || type === 'relation';
}

function isValidCoordinate(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function sourceElementUrl(type: 'node' | 'way' | 'relation', id: number): string {
  return 'https://www.openstreetmap.org/' + type + '/' + id;
}

export function overpassElementsToOsmSpots(elements: readonly OverpassElement[]): OsmSpot[] {
  const spots: OsmSpot[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    if (!isSupportedElementType(el.type) || !Number.isSafeInteger(el.id) || el.id <= 0) continue;

    const tags = el.tags ?? {};
    const category = categoryFor(tags);
    if (!category) continue;

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null || !isValidCoordinate(lat, lon)) continue;

    const id = 'osm-' + el.type + '-' + el.id;
    if (seen.has(id)) continue;
    seen.add(id);

    spots.push({
      id,
      category,
      name: tags.name ?? FALLBACK_NAMES[category],
      lon,
      lat,
      fromOsm: true,
      sourceName: 'OpenStreetMap',
      sourceElementUrl: sourceElementUrl(el.type, el.id),
      attributionText: '© OpenStreetMap contributors',
      licenseUrl: OSM_LICENSE_URL,
    });
  }

  return spots;
}

/**
 * Fetch POIs inside a bbox.
 *
 * The optional authority parameter exists to make the fail-closed predicate
 * deterministically testable. Product callers use the checked-in HOLD authority.
 */
export async function fetchOsmSpots(
  b: Bounds,
  signal?: AbortSignal,
  authority: OverpassReleaseAuthority = OVERPASS_PRODUCTION_AUTHORITY,
): Promise<OsmSpotLoadResult> {
  const endpoint = getControlledOverpassEndpoint(
    process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE,
    process.env.NEXT_PUBLIC_EMOPET_OVERPASS_ENDPOINT,
    authority,
  );
  if (!endpoint) return { status: 'unavailable' };

  const key = bboxKey(b);
  const cached = getCachedSpots(key);
  if (cached) return { status: 'ok', spots: cached };

  const bbox = '(' + b.south + ',' + b.west + ',' + b.north + ',' + b.east + ')';
  const query =
    '[out:json][timeout:20];(' +
    'nwr["amenity"="veterinary"]' + bbox + ';' +
    'nwr["shop"="pet"]' + bbox + ';' +
    'nwr["leisure"="dog_park"]' + bbox + ';' +
    'nwr["natural"="beach"]' + bbox + ';' +
    'nwr["amenity"="cafe"]["dog"]' + bbox + ';' +
    ');out center 120;';

  try {
    const requestUrl = new URL(endpoint);
    requestUrl.searchParams.set('data', query);

    const res = await fetch(requestUrl.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!res.ok) return { status: 'unavailable' };

    const json = (await res.json()) as unknown;
    if (
      !json ||
      typeof json !== 'object' ||
      !Array.isArray((json as { elements?: unknown }).elements)
    ) {
      return { status: 'unavailable' };
    }

    const spots = overpassElementsToOsmSpots((json as { elements: OverpassElement[] }).elements);
    setCachedSpots(key, spots);
    return { status: 'ok', spots };
  } catch {
    return { status: 'unavailable' };
  }
}

export function resetOsmSpotCacheForTests(): void {
  cache.clear();
}

export function getOsmSpotCacheSizeForTests(): number {
  return cache.size;
}
