import { Hono } from 'hono';
import { and, eq, sql, gte, lte, ilike, or } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { localDirectory } from '../../db/schema/index.js';

export const directory = new Hono();

type DirectoryRuntimeMode = 'RELEASE_GO' | 'UNVERIFIED_DEMO' | 'HOLD';

function getDirectoryRuntimeMode(): DirectoryRuntimeMode {
  if (process.env['EMOPET_LOCAL_DIRECTORY_RELEASE_GATE'] === 'GO') {
    return 'RELEASE_GO';
  }

  if (
    process.env['NODE_ENV'] !== 'production' &&
    process.env['EMOPET_LOCAL_DIRECTORY_DEMO'] === '1'
  ) {
    return 'UNVERIFIED_DEMO';
  }

  return 'HOLD';
}

function unavailablePayload() {
  return {
    error: 'Local directory unavailable',
    code: 'DATA_RIGHTS_GATE_HOLD',
    dataStatus: 'HOLD',
    message: 'Directory publication is disabled until row-level provenance and rights review are complete.',
  } as const;
}

function sanitizeDemoEntry<T extends Record<string, unknown>>(entry: T) {
  return {
    ...entry,
    ratingAvg: null,
    ratingCount: 0,
    verified: false,
    source: 'demo_unverified',
    sourceId: null,
    dataStatus: 'UNVERIFIED_DEMO' as const,
  };
}

/**
 * GET /api/directory/search
 *
 * The historical Lorient directory is under #116 HOLD. Runtime access therefore
 * fails closed unless either:
 * - EMOPET_LOCAL_DIRECTORY_RELEASE_GATE=GO, after controlled review; or
 * - an explicit non-production demo gate is enabled.
 */
directory.get('/search', async (c) => {
  const runtimeMode = getDirectoryRuntimeMode();
  if (runtimeMode === 'HOLD') return c.json(unavailablePayload(), 503);

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

  if (category) conditions.push(eq(localDirectory.category, category));
  if (emergency) conditions.push(eq(localDirectory.acceptsEmergencies, true));

  if (q) {
    conditions.push(
      or(
        ilike(localDirectory.name, `%${q}%`),
        ilike(localDirectory.city, `%${q}%`),
      ),
    );
  }

  if (lat != null && lng != null) {
    const latDelta = radiusKm / 111.0;
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

  let results = entries.map((entry) => {
    let distanceKm: number | null = null;
    if (lat != null && lng != null && entry.latitude != null && entry.longitude != null) {
      distanceKm = haversineKm(lat, lng, entry.latitude, entry.longitude);
    }
    return { ...entry, distanceKm };
  });

  if (lat != null && lng != null) {
    results.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    results = results.filter((r) => r.distanceKm == null || r.distanceKm <= radiusKm);
  } else if (runtimeMode === 'RELEASE_GO') {
    results.sort((a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0));
  } else {
    results.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  const output = runtimeMode === 'UNVERIFIED_DEMO'
    ? results.map((entry) => sanitizeDemoEntry(entry))
    : results;

  return c.json({
    entries: output,
    count: output.length,
    dataStatus: runtimeMode,
  });
});

/** GET /api/directory/categories */
directory.get('/categories', async (c) => {
  const runtimeMode = getDirectoryRuntimeMode();
  if (runtimeMode === 'HOLD') return c.json(unavailablePayload(), 503);

  const counts = await db
    .select({
      category: localDirectory.category,
      count: sql<number>`count(*)::int`,
    })
    .from(localDirectory)
    .groupBy(localDirectory.category);

  return c.json({ categories: counts, dataStatus: runtimeMode });
});

/** GET /api/directory/:id */
directory.get('/:id', async (c) => {
  const runtimeMode = getDirectoryRuntimeMode();
  if (runtimeMode === 'HOLD') return c.json(unavailablePayload(), 503);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);

  const [entry] = await db
    .select()
    .from(localDirectory)
    .where(eq(localDirectory.id, id))
    .limit(1);

  if (!entry) return c.json({ error: 'Not found' }, 404);

  return c.json(runtimeMode === 'UNVERIFIED_DEMO'
    ? sanitizeDemoEntry(entry)
    : { ...entry, dataStatus: runtimeMode });
});

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
