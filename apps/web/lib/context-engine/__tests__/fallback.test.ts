/**
 * Tests de `resolveWithFallback` (orchestration) : providers actifs d'abord, repli si
 * échec (statut `fallback_used`), indisponibilité si tout échoue. Fetchers injectés,
 * sans réseau ; providers de test synthétiques (noms uniques → santé isolée).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ContextSignal, ProviderDescriptor } from '../../api/types';
import { resolveWithFallback } from '../orchestrator';

function desc(providerName: string, status: ProviderDescriptor['status']): ProviderDescriptor {
  return {
    providerName,
    category: 'weather',
    requiresAuth: false,
    envKeys: [],
    baseUrl: 'x',
    freeTierNotes: '',
    commercialUseRisk: 'low',
    privacyRisk: 'low',
    rateLimitRisk: 'low',
    implementationComplexity: 'low',
    productValueForEMOPET: 'medium',
    status,
    recommended: status === 'active' ? 'active_now' : 'fallback',
    flagKey: `API_${providerName.toUpperCase().replace(/-/g, '_')}_ENABLED`,
  };
}

function wsig(provider: string, tempC: number): ContextSignal<{ tempC: number }> {
  const t = new Date().toISOString();
  return { id: `id-${provider}`, category: 'weather', provider, value: { tempC }, timestamp: t, receivedAt: t, freshness: 'fresh', confidence: 0.9, sourceType: 'measured' };
}

const input = { lat: 47.7, lon: -3.4 };

test('resolveWithFallback: actif OK → pas de repli', async () => {
  const r = await resolveWithFallback<{ tempC?: number }>({
    category: 'weather',
    unit: '°C',
    numericPath: (v) => v.tempC,
    active: [desc('rwf-act-ok', 'active')],
    fallback: [desc('rwf-fb-1', 'fallback')],
    fetchers: { 'rwf-act-ok': async () => wsig('rwf-act-ok', 20), 'rwf-fb-1': async () => wsig('rwf-fb-1', 99) },
    cacheCategory: 'weather_current',
    input,
  });
  assert.equal(r.status, 'confirmed');
  assert.equal(r.value, 20);
  assert.ok(!r.warnings.includes('fallback_used'));
});

test('resolveWithFallback: actif échoue → repli utilisé (fallback_used)', async () => {
  const r = await resolveWithFallback<{ tempC?: number }>({
    category: 'weather',
    unit: '°C',
    numericPath: (v) => v.tempC,
    active: [desc('rwf-act-fail', 'active')],
    fallback: [desc('rwf-fb-2', 'fallback')],
    fetchers: {
      'rwf-act-fail': async () => {
        throw new Error('down');
      },
      'rwf-fb-2': async () => wsig('rwf-fb-2', 18),
    },
    cacheCategory: 'weather_current',
    input,
  });
  assert.equal(r.status, 'fallback_used');
  assert.equal(r.value, 18);
  assert.ok(r.warnings.includes('fallback_used'));
});

test('resolveWithFallback: actif + repli vides → not_available (jamais forcé)', async () => {
  const r = await resolveWithFallback<{ tempC?: number }>({
    category: 'weather',
    numericPath: (v) => v.tempC,
    active: [desc('rwf-act-empty', 'active')],
    fallback: [],
    fetchers: {
      'rwf-act-empty': async () => {
        throw new Error('down');
      },
    },
    cacheCategory: 'weather_current',
    input,
  });
  assert.equal(r.status, 'not_available');
  assert.equal(r.value, null);
});
