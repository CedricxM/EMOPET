import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  getControlledOverpassEndpoint,
  isOverpassRuntimeAllowed,
  normalizeOverpassEndpoint,
  overpassElementsToOsmSpots,
  type OverpassElement,
} from '../osm-spots';
import {
  isOverpassProductionUseAuthorized,
  OVERPASS_PRODUCTION_AUTHORITY,
  type OverpassReleaseAuthority,
} from '../overpass-rights';

const mapboxMapUrl = new URL('../../components/bretagne-map/MapboxMap.tsx', import.meta.url);

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

test('DATA-LIC-G4: repository release authority is fail-closed and environment variables cannot bypass it', () => {
  const originalGate = process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE;
  const originalEndpoint = process.env.NEXT_PUBLIC_EMOPET_OVERPASS_ENDPOINT;

  try {
    assert.equal(OVERPASS_PRODUCTION_AUTHORITY.disposition, 'HOLD');
    assert.equal(isOverpassProductionUseAuthorized(), false);

    delete process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE;
    delete process.env.NEXT_PUBLIC_EMOPET_OVERPASS_ENDPOINT;
    assert.equal(isOverpassRuntimeAllowed(), false);
    assert.equal(getControlledOverpassEndpoint(), null);

    process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE = 'GO';
    process.env.NEXT_PUBLIC_EMOPET_OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

    // A runtime switch and endpoint do not create service-use authority.
    assert.equal(getControlledOverpassEndpoint(), null);
    assert.equal(isOverpassRuntimeAllowed(), false);
  } finally {
    restoreEnv('NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE', originalGate);
    restoreEnv('NEXT_PUBLIC_EMOPET_OVERPASS_ENDPOINT', originalEndpoint);
  }
});

test('DATA-LIC-G4: reviewed authority requires complete evidence and the bounded current data flow', () => {
  const reviewed: OverpassReleaseAuthority = {
    disposition: 'GO',
    evidenceRevision: 'DATA-LIC-G4-REVIEW-001',
    reviewedAt: '2026-09-14T12:00:00.000Z',
    reviewerRole: 'qualified-reviewer',
    providerPolicyReceipt: 'docs/evidence/overpass-provider-policy-receipt.json',
    renderedAttributionEvidence: 'docs/evidence/osm-attribution-render-check.json',
    liveQueryFlow: 'REVIEWED',
    cacheFlow: 'EPHEMERAL_MEMORY_ONLY',
    exportFlow: 'PROHIBITED',
    derivedDatabaseFlow: 'PROHIBITED',
    reason: 'Synthetic test authority only.',
  };

  assert.equal(isOverpassProductionUseAuthorized(reviewed), true);

  for (const mutation of [
    { evidenceRevision: null },
    { reviewerRole: null },
    { providerPolicyReceipt: null },
    { renderedAttributionEvidence: null },
    { liveQueryFlow: 'OPEN' as const },
    { cacheFlow: 'OPEN' as const },
    { exportFlow: 'OPEN' as const },
    { derivedDatabaseFlow: 'REVIEWED' as const },
    { disposition: 'HOLD' as const },
  ]) {
    assert.equal(isOverpassProductionUseAuthorized({ ...reviewed, ...mutation }), false);
  }
});

test('DATA-LIC-G4: endpoint validation accepts only a clean explicit HTTPS endpoint', () => {
  assert.equal(normalizeOverpassEndpoint(undefined), null);
  assert.equal(normalizeOverpassEndpoint(''), null);
  assert.equal(normalizeOverpassEndpoint('http://overpass-api.de/api/interpreter'), null);
  assert.equal(normalizeOverpassEndpoint('https://user:pass@example.com/api/interpreter'), null);
  assert.equal(normalizeOverpassEndpoint('https://overpass-api.de/api/interpreter?foo=bar'), null);
  assert.equal(normalizeOverpassEndpoint('https://overpass-api.de/api/interpreter#fragment'), null);
  assert.equal(
    normalizeOverpassEndpoint('https://overpass-api.de/api/interpreter'),
    'https://overpass-api.de/api/interpreter',
  );
});

test('DATA-LIC-G4: Overpass projection carries source and licence provenance', () => {
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
    {
      type: 'node',
      id: 42,
      lat: 47.75,
      lon: -3.36,
      tags: { amenity: 'veterinary', name: 'Duplicate must be ignored' },
    },
    {
      type: 'node',
      id: 90,
      lat: 47.77,
      lon: -3.34,
      tags: { amenity: 'cafe', dog: 'no', name: 'Not dog friendly' },
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

test('DATA-LIC-G4: malformed upstream elements are dropped instead of receiving fabricated provenance', () => {
  const elements: OverpassElement[] = [
    {
      type: 'area',
      id: 12,
      lat: 47.75,
      lon: -3.36,
      tags: { amenity: 'veterinary' },
    },
    {
      type: 'node',
      id: -1,
      lat: 47.75,
      lon: -3.36,
      tags: { amenity: 'veterinary' },
    },
    {
      type: 'node',
      id: 13,
      lat: 95,
      lon: -3.36,
      tags: { amenity: 'veterinary' },
    },
    {
      type: 'way',
      id: 14,
      center: { lat: 47.75, lon: 181 },
      tags: { shop: 'pet' },
    },
  ];

  assert.deepEqual(overpassElementsToOsmSpots(elements), []);
});

test('DATA-LIC-G4: rendered OSM popup keeps source and licence links', async () => {
  const source = await readFile(mapboxMapUrl, 'utf8');

  assert.match(source, /sourceLink\.href\s*=\s*spot\.sourceElementUrl/);
  assert.match(source, /sourceLink\.textContent\s*=\s*spot\.attributionText/);
  assert.match(source, /licenceLink\.href\s*=\s*spot\.licenseUrl/);
  assert.match(source, /licenceLink\.textContent\s*=\s*['"]ODbL \/ attribution['"]/);
  assert.match(source, /source OpenStreetMap/);
});
