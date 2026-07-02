/**
 * Tests de `resilientFetch` : cache, enregistrement de santé, cooldown.
 * Utilise les singletons réels (apiCache, providerHealth) avec des providers/clés
 * uniques pour l'isolation. Fetchers injectés → aucun réseau.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resilientFetch } from '../runProvider';
import type { ContextSignal } from '../types';

function sig(provider: string): ContextSignal<{ tempC: number }> {
  const t = new Date().toISOString();
  return { id: `id-${provider}`, category: 'weather', provider, value: { tempC: 18 }, timestamp: t, receivedAt: t, freshness: 'fresh', confidence: 0.9, sourceType: 'measured' };
}

test('resilientFetch: succès met en cache (2ᵉ appel sans refetch)', async () => {
  let calls = 0;
  const params = {
    provider: 'rf-success',
    cacheKey: 'rf:success',
    cacheCategory: 'weather_current' as const,
    fetcher: async () => {
      calls += 1;
      return sig('rf-success');
    },
  };
  const a = await resilientFetch(params);
  assert.ok(a);
  assert.equal(calls, 1);
  const b = await resilientFetch(params);
  assert.ok(b);
  assert.equal(calls, 1); // servi par le cache
});

test('resilientFetch: échec → null (catégorie non cachée)', async () => {
  let calls = 0;
  const r = await resilientFetch({
    provider: 'rf-fail',
    cacheKey: 'rf:fail',
    cacheCategory: 'moderation',
    fetcher: async () => {
      calls += 1;
      throw new Error('boom');
    },
  });
  assert.equal(r, null);
  assert.equal(calls, 1);
});

test('resilientFetch: cooldown après échecs répétés → provider sauté', async () => {
  let calls = 0;
  const make = (k: string) => ({
    provider: 'rf-cooldown',
    cacheKey: `rf:cooldown:${k}`,
    cacheCategory: 'moderation' as const,
    fetcher: async () => {
      calls += 1;
      throw new Error('boom');
    },
  });
  await resilientFetch(make('a'));
  await resilientFetch(make('b'));
  await resilientFetch(make('c')); // 3ᵉ échec → cooldown (seuil 3)
  const before = calls;
  const r = await resilientFetch(make('d'));
  assert.equal(r, null);
  assert.equal(calls, before); // fetcher NON appelé : provider en cooldown
});
