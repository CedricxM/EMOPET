/**
 * OpenStreetMap / Overpass rights + truth-state regression coverage.
 */

import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  fetchOsmSpots,
  getControlledOverpassEndpoint,
  getOsmSpotCacheSizeForTests,
  normalizeOverpassEndpoint,
  overpassElementsToOsmSpots,
  resetOsmSpotCacheForTests,
  type Bounds,
  type OverpassElement,
} from '../osm-spots';
import {
  isOverpassProductionUseAuthorized,
  OVERPASS_PRODUCTION_AUTHORITY,
  type OverpassReleaseAuthority,
} from '../overpass-rights';

const originalFetch = globalThis.fetch;
const originalGate = process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE;
const originalEndpoint = process.env.NEXT_PUBLIC_EMOPET_OVERPASS_ENDPOINT;
const mapboxMapUrl = new URL('../../components/bretagne-map/MapboxMap.tsx', import.meta.url);

const REVIEWED_AUTHORITY: OverpassReleaseAuthority = {
  disposition: 'GO',
  evidenceRevision: 'DATA-LIC-G4-TEST-001',
  reviewedAt: '2026-09-22T10:00:00.000Z',
  reviewerRole: 'TEST_REVIEWER',
  providerPolicyReceipt: 'controlled://overpass/provider-policy',
  renderedAttributionEvidence: 'controlled://overpass/rendered-attribution',
  liveQueryFlow: 'REVIEWED',
  cacheFlow: 'EPHEMERAL_MEMORY_ONLY',
  exportFlow: 'PROHIBITED',
  derivedDatabaseFlow: 'PROHIBITED',
  reason: 'Synthetic test authority only.',
};

function bounds(seed = 0): Bounds {
  return {
    south: 47.5 + seed * 0.02,
    west: -3.6,
    north: 47.8 + seed * 0.02,
    east: -3.2,
  };
}

function respondJson(value: unknown, status = 200): void {
  globalThis.fetch = (async () => new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch;
}

function enableSyntheticOverpass(): void {
  process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE = 'GO';
  process.env.NEXT_PUBLIC_EMOPET_OVERPASS_ENDPOINT = 'https://overpass.example.test/api/interpreter';
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetOsmSpotCacheForTests();

  if (originalGate === undefined) delete process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE;
  else process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE = originalGate;

  if (originalEndpoint === undefined) delete process.env.NEXT_PUBLIC_EMOPET_OVERPASS_ENDPOINT;
  else process.env.NEXT_PUBLIC_EMOPET_OVERPASS_ENDPOINT = originalEndpoint;
});

test('DATA-LIC-G4: checked-in Overpass authority is HOLD and env configuration cannot bypass it', () => {
  assert.equal(OVERPASS_PRODUCTION_AUTHORITY.disposition, 'HOLD');
  assert.equal(isOverpassProductionUseAuthorized(), false);

  assert.equal(
    getControlledOverpassEndpoint(
      'GO',
      'https://overpass-api.de/api/interpreter',
    ),
    null,
  );
});

test('DATA-LIC-G4: synthetic reviewed authority requires the complete bounded flow', () => {
  assert.equal(isOverpassProductionUseAuthorized(REVIEWED_AUTHORITY), true);

  for (const mutation of [
    { disposition: 'HOLD' as const },
    { evidenceRevision: null },
    { reviewerRole: null },
    { providerPolicyReceipt: null },
    { renderedAttributionEvidence: null },
    { liveQueryFlow: 'OPEN' as const },
    { cacheFlow: 'OPEN' as const },
    { exportFlow: 'OPEN' as const },
    { derivedDatabaseFlow: 'REVIEWED' as const },
  ]) {
    assert.equal(isOverpassProductionUseAuthorized({ ...REVIEWED_AUTHORITY, ...mutation }), false);
  }
});

test('DATA-LIC-G4: only a clean explicit HTTPS endpoint can pass', () => {
  assert.equal(normalizeOverpassEndpoint(undefined), null);
  assert.equal(normalizeOverpassEndpoint(''), null);
  assert.equal(normalizeOverpassEndpoint('http://example.test/overpass'), null);
  assert.equal(normalizeOverpassEndpoint('https://user:pass@example.test/overpass'), null);
  assert.equal(normalizeOverpassEndpoint('https://example.test/overpass?x=1'), null);
  assert.equal(normalizeOverpassEndpoint('https://example.test/overpass#fragment'), null);
  assert.equal(normalizeOverpassEndpoint('https://example.test/overpass'), 'https://example.test/overpass');

  assert.equal(
    getControlledOverpassEndpoint('GO', 'https://example.test/overpass', REVIEWED_AUTHORITY),
    'https://example.test/overpass',
  );
});

test('un résultat Overpass réellement vide reste un succès vide under reviewed synthetic authority', async () => {
  enableSyntheticOverpass();
  respondJson({ elements: [] });

  const result = await fetchOsmSpots(bounds(), undefined, REVIEWED_AUTHORITY);
  assert.deepEqual(result, { status: 'ok', spots: [] });
});

test('un HTTP non-OK est indisponible, jamais un faux résultat vide', async () => {
  enableSyntheticOverpass();
  respondJson({ remark: 'rate_limited' }, 429);

  assert.deepEqual(
    await fetchOsmSpots(bounds(), undefined, REVIEWED_AUTHORITY),
    { status: 'unavailable' },
  );
});

test('une réponse sans tableau elements est indisponible', async () => {
  enableSyntheticOverpass();
  respondJson({ version: 0.6 });

  assert.deepEqual(
    await fetchOsmSpots(bounds(), undefined, REVIEWED_AUTHORITY),
    { status: 'unavailable' },
  );
});

test('une erreur réseau est indisponible', async () => {
  enableSyntheticOverpass();
  globalThis.fetch = (async () => {
    throw new TypeError('network down');
  }) as typeof fetch;

  assert.deepEqual(
    await fetchOsmSpots(bounds(), undefined, REVIEWED_AUTHORITY),
    { status: 'unavailable' },
  );
});

test('OSM projection carries item-level source and licence provenance', () => {
  const elements: OverpassElement[] = [
    {
      type: 'node',
      id: 42,
      lat: 47.75,
      lon: -3.36,
      tags: { amenity: 'veterinary', name: 'Clinique du Port' },
    },
    {
      type: 'way',
      id: 77,
      center: { lat: 47.76, lon: -3.35 },
      tags: { shop: 'pet' },
    },
  ];

  assert.deepEqual(overpassElementsToOsmSpots(elements), [
    {
      id: 'osm-node-42',
      category: 'veterinaire',
      name: 'Clinique du Port',
      lon: -3.36,
      lat: 47.75,
      fromOsm: true,
      sourceName: 'OpenStreetMap',
      sourceElementUrl: 'https://www.openstreetmap.org/node/42',
      attributionText: '© OpenStreetMap contributors',
      licenseUrl: 'https://www.openstreetmap.org/copyright',
    },
    {
      id: 'osm-way-77',
      category: 'magasin',
      name: 'Magasin animalier',
      lon: -3.35,
      lat: 47.76,
      fromOsm: true,
      sourceName: 'OpenStreetMap',
      sourceElementUrl: 'https://www.openstreetmap.org/way/77',
      attributionText: '© OpenStreetMap contributors',
      licenseUrl: 'https://www.openstreetmap.org/copyright',
    },
  ]);
});

test('malformed upstream elements are dropped rather than receiving fabricated provenance', () => {
  const elements: OverpassElement[] = [
    { type: 'area', id: 12, lat: 47.75, lon: -3.36, tags: { amenity: 'veterinary' } },
    { type: 'node', id: -1, lat: 47.75, lon: -3.36, tags: { amenity: 'veterinary' } },
    { type: 'node', id: 13, lat: 95, lon: -3.36, tags: { amenity: 'veterinary' } },
    { type: 'way', id: 14, center: { lat: 47.75, lon: 181 }, tags: { shop: 'pet' } },
  ];

  assert.deepEqual(overpassElementsToOsmSpots(elements), []);
});

test('failed loads are not cached, successful empty loads are cached', async () => {
  enableSyntheticOverpass();
  let calls = 0;

  globalThis.fetch = (async () => {
    calls += 1;
    if (calls === 1) throw new TypeError('temporary failure');
    return new Response(JSON.stringify({ elements: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  assert.deepEqual(
    await fetchOsmSpots(bounds(), undefined, REVIEWED_AUTHORITY),
    { status: 'unavailable' },
  );
  assert.deepEqual(
    await fetchOsmSpots(bounds(), undefined, REVIEWED_AUTHORITY),
    { status: 'ok', spots: [] },
  );
  assert.deepEqual(
    await fetchOsmSpots(bounds(), undefined, REVIEWED_AUTHORITY),
    { status: 'ok', spots: [] },
  );
  assert.equal(calls, 2);
});

test('ephemeral OSM cache is bounded to 40 bbox entries', async () => {
  enableSyntheticOverpass();
  respondJson({ elements: [] });

  for (let index = 0; index < 41; index += 1) {
    const result = await fetchOsmSpots(bounds(index), undefined, REVIEWED_AUTHORITY);
    assert.equal(result.status, 'ok');
  }

  assert.equal(getOsmSpotCacheSizeForTests(), 40);
});

test('rendered OSM popup carries source and licence links', async () => {
  const source = await readFile(mapboxMapUrl, 'utf8');

  assert.match(source, /sourceLink\.href\s*=\s*spot\.sourceElementUrl/);
  assert.match(source, /sourceLink\.textContent\s*=\s*spot\.attributionText/);
  assert.match(source, /licenceLink\.href\s*=\s*spot\.licenseUrl/);
  assert.match(source, /ODbL \/ attribution/);
  assert.match(source, /© OpenStreetMap contributors/);
});
