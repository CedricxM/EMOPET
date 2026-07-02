/**
 * Tests de l'adaptateur met.no (pur : normalisation + libellés + mock). Sans réseau.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as metNo from '../metNo';
import { ProviderInvalidResponseError } from '../../errors';

test('met-no: normalizeForecast (temp arrondie, vent m/s→kph, libellé)', () => {
  const s = metNo.normalizeForecast(
    { properties: { timeseries: [{ time: '2026-06-28T10:00:00Z', data: { instant: { details: { air_temperature: 17.6, wind_speed: 3 } }, next_1_hours: { summary: { symbol_code: 'lightrain' } } } }] } },
    47.7,
    -3.4,
  );
  assert.equal(s.category, 'weather');
  assert.equal(s.provider, 'met-no');
  assert.equal(s.value.tempC, 18);
  assert.equal(s.value.windKph, 11); // 3 m/s × 3.6 = 10.8 → 11
  assert.equal(s.value.label, 'Pluie');
  assert.equal(s.sourceType, 'measured');
});

test('met-no: symbolLabel (partlycloudy avant cloudy)', () => {
  assert.equal(metNo.symbolLabel('clearsky_day'), 'Ciel dégagé');
  assert.equal(metNo.symbolLabel('partlycloudy_night'), 'Partiellement nuageux');
  assert.equal(metNo.symbolLabel('cloudy'), 'Nuageux');
  assert.equal(metNo.symbolLabel('heavysnow'), 'Neige');
  assert.equal(metNo.symbolLabel(undefined), 'Variable');
});

test('met-no: température manquante → erreur typée ; mock déterministe', () => {
  assert.throws(() => metNo.normalizeForecast({ properties: { timeseries: [{ data: {} }] } }, 0, 0), ProviderInvalidResponseError);
  assert.equal(metNo.mockResponse()[0]?.category, 'weather');
});
