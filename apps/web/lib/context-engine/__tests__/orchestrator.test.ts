/**
 * Tests de l'orchestration (résolveurs injectés, sans réseau) :
 * `confirmFromSignals` (contexte non numérique) et `buildContext` (composition,
 * tampon politique, propagation des warnings, panne d'une catégorie isolée).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ArbitratedSignal, ContextSignal } from '../../api/types';
import { buildContext, confirmFromSignals } from '../orchestrator';

function csig(provider: string, value: unknown, confidence = 0.8): ContextSignal {
  const t = new Date().toISOString();
  return { id: `id-${provider}`, category: 'geocoding', provider, value, timestamp: t, receivedAt: t, freshness: 'fresh', confidence, sourceType: 'measured' };
}
function arb(category: string, status: ArbitratedSignal['status'], value: unknown, confidence: number): ArbitratedSignal {
  return { category, status, value, confidence, provenance: [], warnings: [], arbitratedAt: new Date().toISOString() };
}

test('confirmFromSignals: vide → insufficient_data ; 1 → confirmed ; n → consensus (meilleure confiance)', () => {
  assert.equal(confirmFromSignals([], 'geocoding').status, 'insufficient_data');
  assert.equal(confirmFromSignals([], 'geocoding').value, null);

  const one = confirmFromSignals([csig('geoapi-gouv', { nom: 'Lorient' }, 0.9)], 'geocoding');
  assert.equal(one.status, 'confirmed');
  assert.deepEqual(one.value, { nom: 'Lorient' });

  const many = confirmFromSignals([csig('a', { x: 1 }, 0.5), csig('b', { x: 2 }, 0.9)], 'geocoding');
  assert.equal(many.status, 'consensus');
  assert.deepEqual(many.value, { x: 2 });
});

test('buildContext: assemble, tamponne la politique, propage warnings, isole les pannes', async () => {
  const ctx = await buildContext(
    { lat: 47.7, lon: -3.4 },
    {
      weather: async () => arb('weather', 'consensus', 18, 0.7),
      airQuality: async () => arb('air_quality', 'conflicting_sources', null, 0.3),
      location: async () => {
        throw new Error('provider down'); // panne → isolée, pas d'échec global
      },
      calendar: async () => undefined,
    },
  );

  assert.equal(ctx.weatherContext?.status, 'consensus');
  assert.equal(ctx.weatherContext?.value, 18);
  assert.equal(ctx.airQualityContext?.status, 'conflicting_sources');
  assert.equal(ctx.locationContext, undefined); // résolveur en panne → ignoré
  assert.equal(ctx.calendarContext, undefined);
  assert.equal(ctx.policy.nonMedical, true);
  assert.equal(ctx.policy.noEmotionInference, true);
  assert.ok(ctx.warnings.some((w) => w.includes('incertain')));
  assert.ok(ctx.confidence >= 0 && ctx.confidence <= 1);
});
