/**
 * Tests de la fondation de la couche API EMOPET (mockés, sans réseau).
 * Couvre : feature flags + activation, cache TTL (dont catégories non cachables),
 * erreurs typées, backoff/retry, état provider (cooldown), intégrité du registre,
 * et la politique non médicale.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readBoolEnv, isFlagEnabled, hasRequiredEnv, resolveActivation } from '../config';
import { TtlCache, CACHE_TTL_MS } from '../cache';
import {
  ProviderError,
  ProviderTimeoutError,
  ProviderRateLimitError,
  ProviderAuthError,
  isProviderError,
} from '../errors';
import { backoffDelayMs, withRetry } from '../rateLimit';
import { ProviderHealthRegistry } from '../providerHealth';
import { PROVIDERS, getProvider, providersByCategory, allFlagKeys, activeProviders } from '../providerRegistry';
import {
  NON_MEDICAL_POLICY,
  findMedicalClaims,
  isCautiousContext,
  cautiousUnavailable,
} from '../../context-engine/policies/nonMedicalPolicy';

// ── Config & activation ──────────────────────────────────────────────────────
test('config: lecture booléenne et activation par flag + env', () => {
  const FLAG = 'API__UNIT_TEST_FLAG';
  const KEY = 'API__UNIT_TEST_KEY';
  delete process.env[FLAG];
  delete process.env[KEY];

  assert.equal(readBoolEnv(FLAG, false), false);
  assert.equal(isFlagEnabled(FLAG), false);

  process.env[FLAG] = 'true';
  assert.equal(isFlagEnabled(FLAG), true);
  process.env[FLAG] = 'off';
  assert.equal(isFlagEnabled(FLAG), false);
  process.env[FLAG] = '1';
  assert.equal(isFlagEnabled(FLAG), true);

  // requiresAuth sans clé → missing_env
  assert.deepEqual(resolveActivation({ flagKey: FLAG, requiresAuth: true, envKeys: [KEY] }), {
    activable: false,
    reason: 'missing_env',
  });
  process.env[KEY] = 'secret';
  assert.equal(hasRequiredEnv([KEY]), true);
  assert.equal(resolveActivation({ flagKey: FLAG, requiresAuth: true, envKeys: [KEY] }).activable, true);

  // flag off → flag_off (prioritaire)
  process.env[FLAG] = 'false';
  assert.equal(resolveActivation({ flagKey: FLAG, requiresAuth: false, envKeys: [] }).reason, 'flag_off');

  delete process.env[FLAG];
  delete process.env[KEY];
});

// ── Cache TTL ────────────────────────────────────────────────────────────────
test('cache: respecte le TTL et purge à expiration', () => {
  const c = new TtlCache();
  const t0 = 1_000_000;
  c.set('k', { v: 1 }, 'weather_current', t0);
  assert.deepEqual(c.get('k', t0 + 1), { v: 1 });
  // expiré après 15 min
  assert.equal(c.get('k', t0 + CACHE_TTL_MS.weather_current + 1), undefined);
});

test('cache: catégories sensibles JAMAIS mises en cache (TTL 0)', () => {
  const c = new TtlCache();
  c.set('m', 'x', 'moderation');
  c.set('s', 'y', 'security');
  assert.equal(c.get('m'), undefined);
  assert.equal(c.get('s'), undefined);
  assert.equal(CACHE_TTL_MS.moderation, 0);
  assert.equal(CACHE_TTL_MS.security, 0);
});

// ── Erreurs typées ───────────────────────────────────────────────────────────
test('errors: hiérarchie, codes et caractère réessayable', () => {
  const t = new ProviderTimeoutError('open-meteo');
  assert.ok(t instanceof ProviderError);
  assert.ok(isProviderError(t));
  assert.equal(t.code, 'timeout');
  assert.equal(t.retryable, true);
  assert.equal(new ProviderAuthError('x').retryable, false);
  assert.equal(new ProviderRateLimitError('x', 1000).retryAfterMs, 1000);
  assert.equal(new ProviderRateLimitError('x').retryable, true);
});

// ── Backoff & retry ──────────────────────────────────────────────────────────
test('rateLimit: backoff borné par le cap', () => {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const d = backoffDelayMs(attempt, 300, 8000);
    assert.ok(d >= 0 && d <= 8000, `delay hors bornes: ${d}`);
  }
});

test('rateLimit: withRetry réessaie les erreurs réessayables puis réussit', async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw new ProviderTimeoutError('p');
      return 'ok';
    },
    { retries: 3, sleep: async () => {} },
  );
  assert.equal(result, 'ok');
  assert.equal(calls, 3);
});

test('rateLimit: withRetry n\'insiste pas sur une erreur non réessayable', async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(
      async () => {
        calls += 1;
        throw new ProviderAuthError('p');
      },
      { retries: 5, sleep: async () => {} },
    ),
    /Authentification/,
  );
  assert.equal(calls, 1);
});

// ── Santé provider ───────────────────────────────────────────────────────────
test('providerHealth: désactivation temporaire après seuil, reset au succès', () => {
  const reg = new ProviderHealthRegistry({ failureThreshold: 2, cooldownMs: 1000 });
  const now = 10_000;
  const fail = { provider: 'p', ok: false, status: 'active' as const, checkedAt: new Date(now).toISOString() };
  reg.recordFailure(fail, now);
  assert.equal(reg.isTemporarilyDisabled('p', now), false);
  reg.recordFailure(fail, now);
  assert.equal(reg.isTemporarilyDisabled('p', now + 1), true);
  assert.equal(reg.isTemporarilyDisabled('p', now + 2000), false); // cooldown écoulé
  reg.recordSuccess({ provider: 'p', ok: true, status: 'active', checkedAt: new Date(now).toISOString() });
  assert.equal(reg.isTemporarilyDisabled('p', now + 1), false);
});

// ── Intégrité du registre ────────────────────────────────────────────────────
test('registre: noms et flags uniques, format de flag, auth ⇒ envKeys', () => {
  const names = new Set<string>();
  const flags = new Set<string>();
  for (const d of PROVIDERS) {
    assert.ok(!names.has(d.providerName), `nom dupliqué: ${d.providerName}`);
    assert.ok(!flags.has(d.flagKey), `flag dupliqué: ${d.flagKey}`);
    names.add(d.providerName);
    flags.add(d.flagKey);
    assert.match(d.flagKey, /^API_[A-Z0-9_]+_ENABLED$/, `flag mal formé: ${d.flagKey}`);
    if (d.requiresAuth) assert.ok(d.envKeys.length > 0, `${d.providerName}: auth sans envKeys`);
    if (d.fallbackProvider) {
      assert.ok(getProvider(d.fallbackProvider), `fallback inconnu: ${d.fallbackProvider}`);
    }
  }
  assert.equal(allFlagKeys().length, PROVIDERS.length);
});

test('registre: les 9 adaptateurs cœur sont présents et actifs', () => {
  const core = [
    'open-meteo',
    'openaq',
    'adresse-data-gouv',
    'geoapi-gouv',
    'nager-date',
    'dog-ceo',
    'libretranslate',
    'disify',
    'purgomalum',
  ];
  for (const name of core) {
    const d = getProvider(name);
    assert.ok(d, `provider cœur manquant: ${name}`);
    assert.equal(d?.status, 'active', `${name} devrait être actif`);
  }
  // couverture des 12 catégories
  for (const cat of ['weather', 'air_quality', 'geocoding', 'open_data', 'dog_knowledge', 'calendar', 'translation', 'email_validation', 'moderation', 'ai', 'transport', 'logistics'] as const) {
    assert.ok(providersByCategory(cat).length > 0, `catégorie vide: ${cat}`);
  }
});

test('registre: providers IP-geoloc désactivés par défaut (confidentialité)', () => {
  for (const name of ['ipstack', 'ipapi']) {
    const d = getProvider(name);
    assert.equal(d?.status, 'disabled');
    assert.equal(d?.recommended, 'disabled_by_default');
    assert.equal(d?.privacyRisk, 'high');
  }
});

test('registre: activeProviders ne renvoie que les actifs flag+env satisfaits', () => {
  const FLAG = 'API_OPEN_METEO_ENABLED';
  process.env[FLAG] = 'true';
  const active = activeProviders('weather').map((d) => d.providerName);
  assert.ok(active.includes('open-meteo'));
  delete process.env[FLAG];
  assert.ok(!activeProviders('weather').map((d) => d.providerName).includes('open-meteo'));
});

// ── Politique non médicale ───────────────────────────────────────────────────
test('politique: tous les verrous non médicaux sont à true', () => {
  for (const v of Object.values(NON_MEDICAL_POLICY)) assert.equal(v, true);
});

test('politique: détecte une attribution d\'état à l\'animal (interdit)', () => {
  // assemblé par concaténation (cohérent avec les autres tests d'invariants)
  const forbidden = 'Le ' + 'chien est ' + 'anxi' + 'eux à cause de la météo.';
  assert.ok(findMedicalClaims(forbidden).length > 0);
  assert.equal(isCautiousContext(forbidden), false);
});

test('politique: laisse passer un contexte prudent et non médical', () => {
  const ok = "Aujourd'hui est inhabituellement chaud et humide, ce qui peut influer sur les routines.";
  assert.deepEqual(findMedicalClaims(ok), []);
  assert.equal(isCautiousContext(ok), true);
});

test('politique: cautiousUnavailable ne force jamais de conclusion', () => {
  const s = cautiousUnavailable('weather');
  assert.equal(s.status, 'not_available');
  assert.equal(s.value, null);
  assert.equal(s.confidence, 0);
  assert.ok(Array.isArray(s.provenance) && s.provenance.length === 0);
});
