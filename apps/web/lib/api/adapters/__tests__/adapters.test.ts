/**
 * Tests des adaptateurs cœur (purs : normalisation + mocks + classements).
 * Aucun appel réseau — on valide les fonctions `normalize*`/bandes et `mockResponse()`.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as openMeteo from '../openMeteo';
import * as openAQ from '../openAQ';
import * as ban from '../adresseDataGouv';
import * as geoapi from '../geoApiGouv';
import { freshnessFromAgeMs, clamp01 } from '../_shared';
import { ProviderInvalidResponseError } from '../../errors';

// ── _shared ──────────────────────────────────────────────────────────────────
test('shared: fraîcheur par âge + bornage de confiance', () => {
  assert.equal(freshnessFromAgeMs(0), 'fresh');
  assert.equal(freshnessFromAgeMs(2 * 60 * 60_000), 'acceptable');
  assert.equal(freshnessFromAgeMs(10 * 60 * 60_000), 'stale');
  assert.equal(freshnessFromAgeMs(-1), 'unknown');
  assert.equal(clamp01(1.5), 1);
  assert.equal(clamp01(-2), 0);
  assert.equal(clamp01(Number.NaN), 0);
});

// ── Open-Meteo ───────────────────────────────────────────────────────────────
test('open-meteo: currentToSignal normalise en signal météo mesuré', () => {
  const s = openMeteo.currentToSignal({ tempC: 18, code: 2, label: 'x', windKph: 12, time: new Date().toISOString() }, 47.7, -3.4);
  assert.equal(s.category, 'weather');
  assert.equal(s.provider, 'open-meteo');
  assert.equal(s.value.tempC, 18);
  assert.equal(s.sourceType, 'measured');
  assert.equal(s.location?.precision, 'exact');
  assert.ok(s.confidence > 0 && s.confidence <= 1);
});

test('open-meteo: bandes chaleur/UV et présence de pluie (pur)', () => {
  assert.equal(openMeteo.heatBand(-3).band, 'froid');
  assert.equal(openMeteo.heatBand(8).band, 'frais');
  assert.equal(openMeteo.heatBand(18).band, 'doux');
  assert.equal(openMeteo.heatBand(25).band, 'chaud');
  assert.equal(openMeteo.heatBand(33).band, 'tres_chaud');
  assert.equal(openMeteo.rainFromCode(61).rain, true);
  assert.equal(openMeteo.rainFromCode(0).rain, false);
  assert.equal(openMeteo.uvBand(1), 'faible');
  assert.equal(openMeteo.uvBand(7), 'eleve');
  assert.equal(openMeteo.uvBand(12), 'extreme');
});

test('open-meteo: mockResponse déterministe', () => {
  const m = openMeteo.mockResponse();
  assert.equal(m.length, 1);
  assert.equal(m[0]?.category, 'weather');
});

// ── OpenAQ ───────────────────────────────────────────────────────────────────
test('openaq: normalizeMeasurements mappe les polluants connus', () => {
  const s = openAQ.normalizeMeasurements(
    [
      { parameter: 'PM2.5', value: 9 },
      { parameter: 'pm10', value: 15 },
      { parameter: 'no2', value: 22 },
      { parameter: 'inconnu', value: 999 },
    ],
    { lat: 47.7, lon: -3.4, precision: 'city' },
  );
  assert.equal(s.category, 'air_quality');
  assert.equal(s.value.pm25, 9);
  assert.equal(s.value.pm10, 15);
  assert.equal(s.value.no2, 22);
  assert.equal('aqi' in s.value, false);
});

test('openaq: aucune mesure exploitable → erreur typée', () => {
  assert.throws(() => openAQ.normalizeMeasurements([{ parameter: 'xyz', value: 1 }], { precision: 'city' }), ProviderInvalidResponseError);
  assert.equal(openAQ.mockResponse()[0]?.category, 'air_quality');
});

// ── BAN (adresse.data.gouv) ──────────────────────────────────────────────────
test('ban: normalizeFeature inverse [lon,lat] et exige label', () => {
  const g = ban.normalizeFeature({
    geometry: { coordinates: [-3.37, 47.748] },
    properties: { label: 'Lorient', city: 'Lorient', postcode: '56100', score: 0.9 },
  });
  assert.equal(g.lat, 47.748);
  assert.equal(g.lon, -3.37);
  assert.equal(g.city, 'Lorient');
  assert.throws(() => ban.normalizeFeature({ geometry: { coordinates: [1, 2] }, properties: {} }), ProviderInvalidResponseError);
  const m = ban.mockResponse()[0];
  assert.equal(m?.location?.country, 'France');
  assert.equal(m?.location?.precision, 'city');
});

// ── geo.api.gouv ─────────────────────────────────────────────────────────────
test('geoapi: normalizeCommune extrait dept/région/centre', () => {
  const m = geoapi.normalizeCommune({ nom: 'Lorient', code: '56121', codeDepartement: '56', codeRegion: '53', population: 57084, centre: { coordinates: [-3.37, 47.748] } });
  assert.equal(m.nom, 'Lorient');
  assert.equal(m.codeDepartement, '56');
  assert.equal(m.lat, 47.748);
  assert.equal(m.lon, -3.37);
  assert.throws(() => geoapi.normalizeCommune({ code: '1' }), ProviderInvalidResponseError);
  assert.equal(geoapi.mockResponse()[0]?.category, 'geocoding');
});
