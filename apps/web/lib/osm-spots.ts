/**
 * OpenStreetMap POIs via Overpass.
 *
 * RIGHTS CONTROL:
 * - public Overpass use is disabled by default;
 * - enabling it requires NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE=GO;
 * - the flag is an operator gate only, not legal clearance;
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

const ENDPOINT = 'https://overpass-api.de/api/interpreter';
const OSM_LICENSE_URL = 'https://www.openstreetmap.org/copyright' as const;
const OVERPASS_RUNTIME_ALLOWED =
  process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE === 'GO';

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

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const cache = new Map<string, OsmSpot[]>();

function bboxKey(b: Bounds): string {
  return [b.south, b.west, b.north, b.east].map((n) => n.toFixed(2)).join(',');
}

function sourceElementUrl(el: OverpassElement): string {
  const type = el.type === 'node' || el.type === 'way' || el.type === 'relation'
    ? el.type
    : 'node';
  return `https://www.openstreetmap.org/${type}/${el.id}`;
}

/**
 * Fetch POIs within the current bbox.
 *
 * The cache is process-memory only. No persistent OSM database or export is
 * created here. If the rights/service gate is not explicitly GO, fail closed.
 */
export async function fetchOsmSpots(b: Bounds, signal?: AbortSignal): Promise<OsmSpot[]> {
  if (!OVERPASS_RUNTIME_ALLOWED) return [];

  const key = bboxKey(b);
  const cached = cache.get(key);
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
    const res = await fetch(`${ENDPOINT}?data=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { elements?: OverpassElement[] };
    const spots: OsmSpot[] = [];
    const seen = new Set<string>();
    for (const el of json.elements ?? []) {
      const tags = el.tags ?? {};
      const category = categoryFor(tags);
      if (!category) continue;
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (lat == null || lon == null) continue;
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
        sourceElementUrl: sourceElementUrl(el),
        attributionText: '© OpenStreetMap contributors',
        licenseUrl: OSM_LICENSE_URL,
      });
    }
    cache.set(key, spots);
    return spots;
  } catch {
    return [];
  }
}
