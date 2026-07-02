import { Hono } from 'hono';
import { and, eq, sql, gte, lte, ilike, or } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { localDirectory } from '../../db/schema/index.js';

export const directory = new Hono();

/**
 * GET /api/directory/search
 *
 * Query params:
 *   category: string (veterinaire, educateur, toiletteur, pension, parc_chien, animalerie, etc.)
 *   lat: number
 *   lng: number
 *   radius_km: number (default 10)
 *   q: string (text search on name)
 *   emergency: boolean (filter accepts_emergencies)
 *
 * Returns: entries sorted by distance from (lat, lng) with rating info
 */
directory.get('/search', async (c) => {
  const category = c.req.query('category');
  const lat = c.req.query('lat') ? parseFloat(c.req.query('lat')!) : null;
  const lng = c.req.query('lng') ? parseFloat(c.req.query('lng')!) : null;
  const requestedRadiusKm = c.req.query('radius_km') ? parseFloat(c.req.query('radius_km')!) : 10;
  const radiusKm = Number.isFinite(requestedRadiusKm) ? Math.min(Math.max(requestedRadiusKm, 1), 50) : 10;
  const q = c.req.query('q')?.trim().slice(0, 80);
  const emergency = c.req.query('emergency') === 'true';

  if ((lat != null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) || (lng != null && (!Number.isFinite(lng) || lng < -180 || lng > 180))) {
    return c.json({ error: 'Invalid coordinates' }, 400);
  }

  const conditions = [];

  if (category) {
    conditions.push(eq(localDirectory.category, category));
  }

  if (emergency) {
    conditions.push(eq(localDirectory.acceptsEmergencies, true));
  }

  if (q) {
    conditions.push(
      or(
        ilike(localDirectory.name, `%${q}%`),
        ilike(localDirectory.city, `%${q}%`),
      ),
    );
  }

  // Geo bounding box filter (rough filter before distance calc)
  if (lat != null && lng != null) {
    const latDelta = radiusKm / 111.0; // ~111 km per degree latitude
    const lngDelta = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180));

    conditions.push(gte(localDirectory.latitude, lat - latDelta));
    conditions.push(lte(localDirectory.latitude, lat + latDelta));
    conditions.push(gte(localDirectory.longitude, lng - lngDelta));
    conditions.push(lte(localDirectory.longitude, lng + lngDelta));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const entries = await db
    .select()
    .from(localDirectory)
    .where(where)
    .limit(50);

  // Calculate distance and sort
  let results = entries.map((entry) => {
    let distanceKm: number | null = null;
    if (lat != null && lng != null && entry.latitude != null && entry.longitude != null) {
      distanceKm = haversineKm(lat, lng, entry.latitude, entry.longitude);
    }
    return { ...entry, distanceKm };
  });

  // Sort by distance if geo search, otherwise by rating
  if (lat != null && lng != null) {
    results.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    // Filter by actual radius (bounding box was approximate)
    results = results.filter((r) => r.distanceKm == null || r.distanceKm <= radiusKm);
  } else {
    results.sort((a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0));
  }

  return c.json({ entries: results, count: results.length });
});

/**
 * GET /api/directory/categories
 * Returns available categories with counts.
 */
directory.get('/categories', async (c) => {
  const counts = await db
    .select({
      category: localDirectory.category,
      count: sql<number>`count(*)::int`,
    })
    .from(localDirectory)
    .groupBy(localDirectory.category);

  return c.json({ categories: counts });
});

/**
 * GET /api/directory/:id
 * Returns a single directory entry.
 */
directory.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const [entry] = await db
    .select()
    .from(localDirectory)
    .where(eq(localDirectory.id, id))
    .limit(1);

  if (!entry) return c.json({ error: 'Not found' }, 404);

  return c.json(entry);
});

// ─── Haversine distance ─────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
