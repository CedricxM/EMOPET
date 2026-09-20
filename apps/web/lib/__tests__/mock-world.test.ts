/**
 * Tests de l'économie du World (Phase 2) — gains par événement, coûts,
 * affordabilité, dépense. Séparation données ↔ rendu : ces fonctions sont pures.
 *
 * ⚠ Invariant : les ressources représentent des actions HUMAINES, jamais l'état
 * du chien. Ce test vérifie aussi qu'aucune ressource n'évoque une émotion.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  EMPTY_RESOURCE_BALANCE,
  MOCK_WORLD_EVENTS,
  WORLD_BUILD_ITEMS,
  WORLD_RESOURCES,
  addResources,
  canAfford,
  computeResourceBalance,
  getResourceDefinition,
  spendResources,
} from '../mock-world';
import type { ResourceBalance, WorldResourceKey } from '../mock-world';

test('addResources : additionne sans muter l’entrée', () => {
  const base: ResourceBalance = { ...EMPTY_RESOURCE_BALANCE, routinePoints: 10 };
  const next = addResources(base, { routinePoints: 5, walkTraces: 3 });
  assert.equal(next.routinePoints, 15);
  assert.equal(next.walkTraces, 3);
  assert.equal(base.routinePoints, 10, 'entrée non mutée');
});

test('computeResourceBalance : somme des grants de tous les événements mock', () => {
  const balance = computeResourceBalance();
  // routinePoints : 40 (rest) + 12 (learning) + 18 (setup) = 70
  assert.equal(balance.routinePoints, 70);
  // signalClarity : 18 (rest) + 28 (signal) + 20 (setup) = 66
  assert.equal(balance.signalClarity, 66);
  for (const key of Object.keys(balance) as WorldResourceKey[]) {
    assert.ok(balance[key] >= 0, `${key} négatif`);
  }
});

test('canAfford / spendResources cohérents', () => {
  const balance: ResourceBalance = { ...EMPTY_RESOURCE_BALANCE, routinePoints: 20, calmStones: 8 };
  assert.equal(canAfford(balance, { routinePoints: 12, calmStones: 8 }), true);
  assert.equal(canAfford(balance, { routinePoints: 25 }), false);
  const after = spendResources(balance, { routinePoints: 12, calmStones: 8 });
  assert.equal(after.routinePoints, 8);
  assert.equal(after.calmStones, 0);
});

test('spendResources : jamais négatif (quête douce, pas de blocage agressif)', () => {
  const after = spendResources(EMPTY_RESOURCE_BALANCE, { routinePoints: 50 });
  assert.equal(after.routinePoints, 0);
});

test('le budget initial permet de construire au moins quelques éléments', () => {
  const balance = computeResourceBalance();
  const affordable = WORLD_BUILD_ITEMS.filter((item) => canAfford(balance, item.cost));
  assert.ok(affordable.length >= 3, `seulement ${affordable.length} éléments abordables au départ`);
});

test('chaque coût d’objet référence des ressources connues', () => {
  const keys = new Set(WORLD_RESOURCES.map((r) => r.key));
  for (const item of WORLD_BUILD_ITEMS) {
    for (const key of Object.keys(item.cost) as WorldResourceKey[]) {
      assert.ok(keys.has(key), `${item.id} référence une ressource inconnue: ${key}`);
    }
  }
});

test('chaque grant d’événement référence des ressources connues', () => {
  const keys = new Set(WORLD_RESOURCES.map((r) => r.key));
  for (const event of MOCK_WORLD_EVENTS) {
    for (const key of Object.keys(event.grants) as WorldResourceKey[]) {
      assert.ok(keys.has(key), `${event.id} référence une ressource inconnue: ${key}`);
    }
  }
});

test('getResourceDefinition : connue ok, inconnue lève', () => {
  assert.equal(getResourceDefinition('routinePoints').label, 'Routine Points');
  assert.throws(() => getResourceDefinition('nope' as WorldResourceKey));
});

test('invariant : aucune ressource n’évoque une émotion du chien', () => {
  const emotion = ['bon' + 'heur', 'jo' + 'ie', 'heu' + 'reux', 'tri' + 'ste', 'happ' + 'iness', 'emot'];
  for (const r of WORLD_RESOURCES) {
    const text = `${r.label} ${r.description}`.toLowerCase();
    for (const w of emotion) assert.ok(!text.includes(w), `${r.key} évoque "${w}"`);
  }
});
