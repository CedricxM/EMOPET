/**
 * Test de la fabrique d'adaptateur scaffold : conforme à l'interface, non implémenté.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createScaffoldAdapter } from '../scaffold';
import { ProviderUnavailableError } from '../../errors';

test('scaffold: descripteur réel, santé non-OK, mock vide, appel non implémenté', async () => {
  const a = createScaffoldAdapter('weatherapi'); // provider catalogué en scaffold
  assert.equal(a.descriptor.providerName, 'weatherapi');
  assert.equal(a.descriptor.status, 'scaffold');
  const h = await a.healthCheck();
  assert.equal(h.ok, false);
  assert.equal(h.status, 'scaffold');
  assert.deepEqual(a.mockResponse(), []);
  assert.throws(() => a.notImplemented('getCurrentWeatherByCoords'), ProviderUnavailableError);
});

test('scaffold: provider inconnu → erreur de configuration', () => {
  assert.throws(() => createScaffoldAdapter('provider-inexistant'), /non enregistré/);
});
