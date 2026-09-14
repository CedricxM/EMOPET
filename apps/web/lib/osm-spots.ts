/**
 * OpenStreetMap POIs via Overpass.
 *
 * RIGHTS CONTROL:
 * - public Overpass use is disabled by default;
 * - enabling it requires NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE=GO;
 * - an explicit HTTPS endpoint must also be configured through
 *   NEXT_PUBLIC_EMOPET_OVERPASS_ENDPOINT;
 * - the flag and endpoint are engineering/operator controls only, not legal
 *   clearance or proof that a public service permits the intended traffic;
 * - persistent caching/export/derived-database use remains separately reviewable
 *   under #116.
 *
 * Invariants: no medical/emotional inference. These are public-place records.
 */

import type { SpotCategory } from '../components/bretagne-map/spots';

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

const OSM_LICENSE_URL = 'https://www.openstreetmap.org/copyright' as const;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 40;

export function getControlledOverpassEndpoint(
  rightsGate: string | undefined = process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE,
  endpoint: string | undefined = process.env.NEXT_PUBLIC_EMOPET_OVERPASS_ENDPOINT,
): string | null {
  if (rightsGate !== 'GO') return null;

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

export function isOverpassRuntimeAllowed(): boolean {
  return getControlledOverpassEndpoint() !== null;
}

/** Tag OSM → catégorie EMOPET. */
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
  plage: 'Plage', parc: 'Parc', foret: 'Sentier', veterinaire: 'Vétérinaire',
  comportementaliste: 'Éducateur', pension: 'Pension', magasin: 'Magasin animalier', cafe: 'Café',
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

// Ephemeral process/browser memory only. This cache is deliberately bounded and
// expiring so this module does not become a persistent or accumulating OSM store.
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

  // Refresh insertion order so eviction behaves as a small LRU cache.
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
  return `https://www.openstreetmap.org/${type}/${id}`;
}

/**
 * Convert raw Overpass elements into the bounded public POI projection used by
 * the map. Provenance is attached here so every returned OSM marker carries
 * its source element and attribution/licence pointers with it.
 *
 * Malformed or unsupported upstream elements are dropped rather than silently
 * fabricating a source URL or accepting impossible coordinates.
 */
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

    const id = `osm-${el.type}-${el.id}`;
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
 * Fetch POIs within the current bbox.
 *
 * The cache is process/browser-memory only, capped at 40 bboxes and expires
 * entries after five minutes. No persistent OSM database or export is created
 * here. If either the rights gate or an explicit controlled HTTPS endpoint is
 * missing, fail closed.
 */
export async function fetchOsmSpots(b: Bounds, signal?: AbortSignal): Promise<OsmSpot[]> {
  const endpoint = getControlledOverpassEndpoint();
  if (!endpoint) return [];

  const key = bboxKey(b);
  const cached = getCachedSpots(key);
  if (cached) return cached;

  const bbox = `(${b.south},${b.west},${b.north},${b.east})`;
  const query = `[out:json][timeout:20];(` +
    `nwr["amenity"="veterinary"]${bbox};` +
    `nwr["shop"="pet"]${bbox};` +
    `nwr["leisure"="dog_park"]${bbox};` +
    `nwr["natural"="beach"]${bbox};` +
    `nwr["amenity"="cafe"]["dog"]${bbox};` +
    `);out center 120;`;

  try {
    const requestUrl = new URL(endpoint);
    requestUrl.searchParams.set('data', query);
    const res = await fetch(requestUrl.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!res.ok) return [];

    const json = (await res.json()) as { elements?: OverpassElement[] };
    const spots = overpassElementsToOsmSpots(json.elements ?? []);
    setCachedSpots(key, spots);
    return spots;
  } catch {
    return [];
  }
}
