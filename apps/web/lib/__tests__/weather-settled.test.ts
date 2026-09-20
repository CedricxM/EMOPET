/**
 * Météo — « indisponible » n'est pas « en cours de chargement ».
 *
 * `fetchCurrentWeather` renvoie `null` et `fetchForecast` `[]` quand la source
 * n'a pas répondu. `WeatherStrip` n'avait que deux états de rendu (données ou
 * « Chargement… ») : un échec restait donc affiché comme un chargement, pour
 * toujours. Ces helpers rendent l'état terminé explicite, et sont ici pour
 * qu'il soit testable — le runner ne collecte que `lib/**\/*.test.ts`.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { settleCurrentWeather, settleForecast } from '../weather';
import type { CurrentWeather, DailyWeather } from '../weather';

const CURRENT: CurrentWeather = { tempC: 14, code: 3, label: 'Couvert', windKph: 18, time: '2026-09-19T19:00' };
const DAY: DailyWeather = { date: '2026-09-20', code: 3, label: 'Couvert', maxC: 17, minC: 11 };

test('absence de météo actuelle = indisponible, pas un état neutre', () => {
  assert.deepEqual(settleCurrentWeather(null), { status: 'unavailable' });
});

test('météo actuelle présente = ok, données intactes', () => {
  assert.deepEqual(settleCurrentWeather(CURRENT), { status: 'ok', data: CURRENT });
});

test('prévision vide = indisponible : une prévision à zéro jour n’existe pas', () => {
  assert.deepEqual(settleForecast([]), { status: 'unavailable' });
});

test('prévision non vide = ok, données intactes', () => {
  assert.deepEqual(settleForecast([DAY]), { status: 'ok', data: [DAY] });
});

test('les deux états sont discriminables sans inspecter les données', () => {
  // C'est le point : un appelant doit pouvoir trancher sur `status` seul,
  // sans reproduire la convention « null/[] signifie échec ».
  for (const settled of [settleCurrentWeather(null), settleForecast([])]) {
    assert.equal(settled.status, 'unavailable');
    assert.ok(!('data' in settled), 'aucune donnée ne doit accompagner un état indisponible');
  }
});
