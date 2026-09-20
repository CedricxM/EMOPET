/**
 * OpenStreetMap / Overpass — « indisponible » n'est pas « aucun POI ».
 *
 * Le contrat historique renvoyait [] pour un vrai résultat vide ET pour un
 * timeout, un HTTP 429/5xx ou une réponse invalide. La carte ne pouvait donc pas
 * distinguer « il n'y a rien ici » de « on ne sait pas ».
 */

import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import { fetchOsmSpots, resetOsmSpotCacheForTests } from '../osm-spots';
import type { Bounds } from '../osm-spots';

const originalFetch = globalThis.fetch;

function bounds(seed = 0): Bounds {
  return {
    south: 47.5 + seed,
    west: -3.6,
    north: 47.8 + seed,
    east: -3.2,
  };
}

function respondJson(value: unknown, status = 200): void {
  globalThis.fetch = (async () => new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetOsmSpotCacheForTests();
});

test('un résultat Overpass réellement vide reste un succès vide', async () => {
  respondJson({ elements: [] });

  const result = await fetchOsmSpots(bounds());
  assert.deepEqual(result, { status: 'ok', spots: [] });
});

test('un HTTP non-OK est indisponible, jamais un faux résultat vide', async () => {
  respondJson({ remark: 'rate_limited' }, 429);

  const result = await fetchOsmSpots(bounds());
  assert.deepEqual(result, { status: 'unavailable' });
});

test('une réponse sans tableau elements est indisponible', async () => {
  respondJson({ version: 0.6 });

  const result = await fetchOsmSpots(bounds());
  assert.deepEqual(result, { status: 'unavailable' });
});

test('une erreur réseau est indisponible', async () => {
  globalThis.fetch = (async () => {
    throw new TypeError('network down');
  }) as typeof fetch;

  const result = await fetchOsmSpots(bounds());
  assert.deepEqual(result, { status: 'unavailable' });
});

test('un chargement réussi normalise les POI et conserve un vrai vide distinct', async () => {
  respondJson({
    elements: [
      {
        type: 'node',
        id: 10,
        lat: 47.7,
        lon: -3.4,
        tags: { amenity: 'veterinary', name: 'Clinique test' },
      },
      {
        type: 'way',
        id: 11,
        center: { lat: 47.71, lon: -3.41 },
        tags: { leisure: 'dog_park' },
      },
      {
        type: 'node',
        id: 12,
        lat: 47.72,
        lon: -3.42,
        tags: { amenity: 'bank' },
      },
    ],
  });

  const result = await fetchOsmSpots(bounds());
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.spots.length, 2);
  assert.deepEqual(result.spots[0], {
    id: 'osm-node-10',
    category: 'veterinaire',
    name: 'Clinique test',
    lon: -3.4,
    lat: 47.7,
    fromOsm: true,
  });
  assert.equal(result.spots[1]?.name, 'Parc');
});

test('un échec n’est jamais mis en cache et reste réessayable', async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    if (calls === 1) throw new TypeError('temporary failure');
    return new Response(JSON.stringify({ elements: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  assert.deepEqual(await fetchOsmSpots(bounds()), { status: 'unavailable' });
  assert.deepEqual(await fetchOsmSpots(bounds()), { status: 'ok', spots: [] });
  assert.equal(calls, 2);
});

test('un succès vide est mis en cache comme un vrai résultat observé', async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response(JSON.stringify({ elements: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  assert.deepEqual(await fetchOsmSpots(bounds(1)), { status: 'ok', spots: [] });
  assert.deepEqual(await fetchOsmSpots(bounds(1)), { status: 'ok', spots: [] });
  assert.equal(calls, 1);
});
