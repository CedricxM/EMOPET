/**
 * Tests de l'arbitrage de contexte (purs, sans réseau).
 * Inclut les deux scénarios de conflit imposés par la spec :
 *   - 29/30/42 °C → outlier retiré, status consensus, confiance abaissée mais acceptable ;
 *   - 25/38/12 °C → conflicting_sources, aucune conclusion forcée.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ContextSignal } from '../../api/types';
import { toNumericReadings, median, weightedMean, freshnessFactor, type NumericReading } from '../arbitration/evidenceResolver';
import { arbitrateNumeric } from '../arbitration/contextArbitrator';
import { assembleContext, arbitrateWeatherTemperature } from '../contextAggregator';

function wsig(provider: string, tempC: number): ContextSignal<{ tempC: number }> {
  const t = new Date().toISOString();
  return { id: `id-${provider}`, category: 'weather', provider, value: { tempC }, timestamp: t, receivedAt: t, freshness: 'fresh', confidence: 0.9, sourceType: 'measured' };
}
function reading(provider: string, value: number, weight = 0.8, freshness: NumericReading['freshness'] = 'fresh'): NumericReading {
  return { provider, value, weight, freshness, unit: '°C', timestamp: new Date().toISOString() };
}

// ── evidenceResolver ─────────────────────────────────────────────────────────
test('evidence: extraction pondérée, médiane, moyenne pondérée', () => {
  const readings = toNumericReadings(
    [wsig('open-meteo', 20), wsig('weatherapi', 22), { ...wsig('x', Number.NaN) }],
    'weather',
    (v) => v.tempC,
  );
  assert.equal(readings.length, 2); // NaN ignoré
  assert.ok(readings[0]!.weight > readings[1]!.weight); // open-meteo > weatherapi (trust)
  assert.equal(median([1, 3, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(weightedMean([reading('a', 10, 1), reading('b', 20, 3)]), 17.5);
  assert.equal(freshnessFactor('fresh'), 1);
  assert.ok(freshnessFactor('stale') < freshnessFactor('acceptable'));
});

// ── Conflit imposé #1 : outlier léger ────────────────────────────────────────
test('conflit #1 : 29/30/42 → consensus, 42 retiré comme outlier', () => {
  const r = arbitrateWeatherTemperature([wsig('open-meteo', 29), wsig('openweathermap', 30), wsig('weatherapi', 42)]);
  assert.equal(r.status, 'consensus');
  assert.ok(r.value !== null && r.value > 28 && r.value < 31, `value=${r.value}`);
  const wa = r.provenance.find((p) => p.provider === 'weatherapi');
  assert.equal(wa?.outlier, true);
  assert.equal(wa?.usedInConsensus, false);
  assert.ok(r.warnings.some((w) => w.includes('outlier_removed')));
  assert.ok(r.confidence > 0.4 && r.confidence < 0.85, `confidence=${r.confidence}`); // abaissée mais acceptable
});

// ── Conflit imposé #2 : désaccord fort ───────────────────────────────────────
test('conflit #2 : 25/38/12 → conflicting_sources, aucune conclusion', () => {
  const r = arbitrateWeatherTemperature([wsig('open-meteo', 25), wsig('openweathermap', 38), wsig('weatherapi', 12)]);
  assert.equal(r.status, 'conflicting_sources');
  assert.equal(r.value, null);
  assert.ok(r.confidence < 0.5);
  assert.ok(r.provenance.length === 3); // provenance conservée
});

// ── Cas de base ──────────────────────────────────────────────────────────────
test('arbitrage: 0 source → insufficient_data ; 1 source → confirmed', () => {
  assert.equal(arbitrateNumeric([], { category: 'weather' }).status, 'insufficient_data');
  assert.equal(arbitrateNumeric([], { category: 'weather' }).value, null);
  const one = arbitrateNumeric([reading('open-meteo', 20, 0.9)], { category: 'weather' });
  assert.equal(one.status, 'confirmed');
  assert.equal(one.value, 20);
});

test('arbitrage: toutes les sources périmées → stale', () => {
  const r = arbitrateNumeric([reading('a', 20, 0.8, 'stale'), reading('b', 20.1, 0.8, 'stale')], { category: 'weather' });
  assert.equal(r.status, 'stale');
});

test('arbitrage: contexte sensible durcit le seuil de conflit', () => {
  const readings = [reading('a', 20), reading('b', 21)];
  assert.equal(arbitrateNumeric(readings, { category: 'weather' }).status, 'consensus');
  assert.equal(arbitrateNumeric(readings, { category: 'weather', sensitive: true }).status, 'conflicting_sources');
});

// ── Agrégateur ───────────────────────────────────────────────────────────────
test('agrégateur: tampon politique, confiance moyenne, warnings propagés', () => {
  const weather = arbitrateWeatherTemperature([wsig('open-meteo', 18), wsig('openweathermap', 18.5)]);
  const air = arbitrateWeatherTemperature([wsig('open-meteo', 5), wsig('openweathermap', 40)]); // conflit
  const ctx = assembleContext({ weatherContext: weather, airQualityContext: { ...air, category: 'air_quality' } });
  assert.equal(ctx.policy.nonMedical, true);
  assert.equal(ctx.policy.noEmotionInference, true);
  assert.ok(ctx.warnings.some((w) => w.includes('incertain')));
  assert.ok(ctx.confidence >= 0 && ctx.confidence <= 1);
});
