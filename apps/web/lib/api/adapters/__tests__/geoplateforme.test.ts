import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  GEOPLATEFORME_GEOCODING_BASE,
  buildGeocodeUrl,
  buildReverseGeocodeUrl,
  normalizeFeature,
} from '../adresseDataGouv';

test('BAN geocoding uses the IGN Géoplateforme endpoint', () => {
  assert.equal(GEOPLATEFORME_GEOCODING_BASE, 'https://data.geopf.fr/geocodage');
  assert.match(buildGeocodeUrl('10 rue de la mairie Lorient'), /^https:\/\/data\.geopf\.fr\/geocodage\/search\?/);
  assert.equal(buildGeocodeUrl('Lorient').includes('api-adresse.data.gouv.fr'), false);
});

test('reverse geocoding uses lon/lat on Géoplateforme', () => {
  const url = new URL(buildReverseGeocodeUrl(47.748, -3.3702));
  assert.equal(url.origin + url.pathname, 'https://data.geopf.fr/geocodage/reverse');
  assert.equal(url.searchParams.get('lat'), '47.748');
  assert.equal(url.searchParams.get('lon'), '-3.3702');
});

test('BAN GeoJSON normalization remains backward compatible', () => {
  const value = normalizeFeature({
    geometry: { coordinates: [-3.3702, 47.748] },
    properties: { label: 'Lorient', city: 'Lorient', postcode: '56100', citycode: '56121', score: 0.97 },
  });
  assert.equal(value.city, 'Lorient');
  assert.equal(value.lat, 47.748);
  assert.equal(value.lon, -3.3702);
});
