/**
 * Spots réels depuis OpenStreetMap via l'API Overpass (Réalité R1).
 *
 * Récupère de vrais lieux utiles pour les chiens dans le viewport courant :
 * vétérinaires, magasins spécialisés, parcs, parcs canins, plages.
 * Données ouvertes © contributeurs OpenStreetMap (ODbL).
 *
 * ⚠ Invariants : aucune donnée médicale/émotionnelle. Ce sont des POI publics.
 */

import type { SpotCategory } from '../components/bretagne-map/spots';

export interface OsmSpot {
  id: string;
  category: SpotCategory;
  name: string;
  lon: number;
  lat: number;
  /** Toujours vrai — distingue un POI OSM d'un spot communautaire. */
  fromOsm: true;
}

export interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

const ENDPOINT = 'https://overpass-api.de/api/interpreter';

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

/**
 * Récupère les POI réels dans une zone. Mis en cache par bbox arrondie.
 * Renvoie [] en cas d'échec réseau (la carte reste utilisable).
 */
export async function fetchOsmSpots(b: Bounds, signal?: AbortSignal): Promise<OsmSpot[]> {
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
      spots.push({ id, category, name: tags.name ?? FALLBACK_NAMES[category], lon, lat, fromOsm: true });
    }
    cache.set(key, spots);
    return spots;
  } catch {
    return [];
  }
}
