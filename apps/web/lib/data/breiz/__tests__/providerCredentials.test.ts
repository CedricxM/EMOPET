import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  BREIZ_PROVIDER_AUTH_CONTRACTS,
  resolveBreizProviderAuth,
} from '../providerCredentials';

const keys = [
  'API_INSEE_SIRENE_ENABLED',
  'INSEE_API_KEY',
  'API_DATATOURISME_ENABLED',
  'DATATOURISME_API_KEY',
] as const;

const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('les contrats utilisent les headers fournisseurs actuels', () => {
  assert.equal(
    BREIZ_PROVIDER_AUTH_CONTRACTS.sirene.headerName,
    'X-INSEE-Api-Key-Integration',
  );
  assert.equal(BREIZ_PROVIDER_AUTH_CONTRACTS.sirene.envKey, 'INSEE_API_KEY');
  assert.equal(BREIZ_PROVIDER_AUTH_CONTRACTS.datatourisme.headerName, 'X-API-Key');
  assert.equal(
    BREIZ_PROVIDER_AUTH_CONTRACTS.datatourisme.envKey,
    'DATATOURISME_API_KEY',
  );
});

test('la présence d’une clé seule ne suffit jamais à activer SIRENE', () => {
  process.env.INSEE_API_KEY = 'test-only-public-api-key';
  delete process.env.API_INSEE_SIRENE_ENABLED;

  const resolved = resolveBreizProviderAuth('sirene');
  assert.equal(resolved.ready, false);
  assert.equal(resolved.reason, 'flag_off');
  assert.deepEqual(resolved.headers, {});
});

test('un flag sans credential reste fail-closed', () => {
  process.env.API_DATATOURISME_ENABLED = 'true';
  delete process.env.DATATOURISME_API_KEY;

  const resolved = resolveBreizProviderAuth('datatourisme');
  assert.equal(resolved.ready, false);
  assert.equal(resolved.reason, 'missing_env');
  assert.deepEqual(resolved.headers, {});
});

test('SIRENE construit uniquement son header attendu quand le gate est complet', () => {
  process.env.API_INSEE_SIRENE_ENABLED = 'true';
  process.env.INSEE_API_KEY = 'test-only-public-api-key';

  const resolved = resolveBreizProviderAuth('sirene');
  assert.equal(resolved.ready, true);
  assert.equal(resolved.reason, 'ok');
  assert.deepEqual(resolved.headers, {
    'X-INSEE-Api-Key-Integration': 'test-only-public-api-key',
  });
});

test('DATAtourisme construit uniquement X-API-Key quand le gate est complet', () => {
  process.env.API_DATATOURISME_ENABLED = '1';
  process.env.DATATOURISME_API_KEY = 'test-only-datatourisme-key';

  const resolved = resolveBreizProviderAuth('datatourisme');
  assert.equal(resolved.ready, true);
  assert.equal(resolved.reason, 'ok');
  assert.deepEqual(resolved.headers, {
    'X-API-Key': 'test-only-datatourisme-key',
  });
});
