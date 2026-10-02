import test from 'node:test';
import assert from 'node:assert/strict';
import { regionalizationMayRaiseSemanticAuthority, resolveTerritoryTransition } from '../territoryTransitionGrader';

test('temporary travel changes current territory, not home region', () => {
  assert.deepEqual(resolveTerritoryTransition(['Je pars une semaine à Lyon avec Rocky.']), {
    homeRegion: 'Bretagne', currentTerritory: 'Auvergne-Rhone-Alpes', transition: 'TEMPORARY_TRAVEL',
    regionalIdentity: 'AVAILABLE', fallback: 'REGIONAL_PACK',
  });
});

test('explicit permanent move updates home and current territory', () => {
  const r = resolveTerritoryTransition(["J'ai déménagé à Lyon avec Rocky, on y vit maintenant."]);
  assert.equal(r.homeRegion, 'Auvergne-Rhone-Alpes');
  assert.equal(r.currentTerritory, 'Auvergne-Rhone-Alpes');
  assert.equal(r.transition, 'PERMANENT_MOVE');
});

test('return home overrides temporary destination', () => {
  const r = resolveTerritoryTransition(['Je suis à Lyon ce week-end.', 'Finalement je rentre à Lorient demain.']);
  assert.equal(r.currentTerritory, 'Bretagne');
  assert.equal(r.transition, 'RETURN_HOME');
});

test('missing destination pack falls back globally without inventing identity', () => {
  const r = resolveTerritoryTransition(['Je suis à Lyon pour quelques jours.'], 'Bretagne', false);
  assert.equal(r.regionalIdentity, 'UNAVAILABLE');
  assert.equal(r.fallback, 'GLOBAL_CORE');
});

test('multi-turn correction preserves home while updating current territory', () => {
  const r = resolveTerritoryTransition(['On est à Lyon.', 'Non, juste en visite, on habite toujours à Lorient.']);
  assert.equal(r.homeRegion, 'Bretagne');
  assert.equal(r.currentTerritory, 'Auvergne-Rhone-Alpes');
  assert.equal(r.transition, 'TEMPORARY_TRAVEL');
});

test('regionalization can never raise semantic authority', () => {
  assert.equal(regionalizationMayRaiseSemanticAuthority(), false);
});

test('ambiguous presence never becomes a permanent move by inference', () => {
  const r = resolveTerritoryTransition(['On est à Lyon.']);
  assert.equal(r.homeRegion, 'Bretagne');
  assert.notEqual(r.transition, 'PERMANENT_MOVE');
});

test('a destination change cannot silently change the home region', () => {
  const r = resolveTerritoryTransition(["Aujourd'hui je suis à Strasbourg."]);
  assert.equal(r.homeRegion, 'Bretagne');
  assert.equal(r.currentTerritory, 'Grand-Est');
  assert.equal(r.transition, 'TEMPORARY_TRAVEL');
});
