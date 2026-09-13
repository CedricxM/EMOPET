import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  isOverpassRuntimeAllowed,
  overpassElementsToOsmSpots,
  type OverpassElement,
} from '../osm-spots';

const mapboxMapUrl = new URL('../../components/bretagne-map/MapboxMap.tsx', import.meta.url);

function restoreGate(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE;
  else process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE = value;
}

test('DATA-LIC-G4: Overpass rights gate is exact and default-off', () => {
  const original = process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE;
  try {
    delete process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE;
    assert.equal(isOverpassRuntimeAllowed(), false);

    process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE = '1';
    assert.equal(isOverpassRuntimeAllowed(), false);

    process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE = 'go';
    assert.equal(isOverpassRuntimeAllowed(), false);

    process.env.NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE = 'GO';
    assert.equal(isOverpassRuntimeAllowed(), true);
  } finally {
    restoreGate(original);
  }
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

test('DATA-LIC-G4: rendered OSM popup keeps source and licence links', async () => {
  const source = await readFile(mapboxMapUrl, 'utf8');

  assert.match(source, /sourceLink\.href\s*=\s*spot\.sourceElementUrl/);
  assert.match(source, /sourceLink\.textContent\s*=\s*spot\.attributionText/);
  assert.match(source, /licenceLink\.href\s*=\s*spot\.licenseUrl/);
  assert.match(source, /licenceLink\.textContent\s*=\s*['"]ODbL \/ attribution['"]/);
  assert.match(source, /source OpenStreetMap/);
});
