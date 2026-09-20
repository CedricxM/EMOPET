/**
 * Surface carte — « pas configuré », « indisponible » et « vide » sont trois
 * états distincts.
 *
 * Le défaut couvert ici n'était pas une erreur de calcul mais une absence de
 * message : `MapboxMap` n'écoutait aucune erreur Mapbox. Un jeton invalide,
 * révoqué ou hors quota, et un fond de carte injoignable, ne produisaient
 * jamais l'événement `load` — donc jamais de rendu, jamais d'explication, et un
 * rectangle bordé de 480 px pour seule réponse. Le gate DATA-LIC-G5 de #116
 * laisse la garde et la rotation du jeton ouvertes, donc le cas n'est pas
 * théorique.
 *
 * Les branches de rendu vivent dans un `.tsx` que le harnais ne collecte pas
 * (`lib/**\/*.test.ts` uniquement). Ce qui est testable — la résolution du
 * jeton et la séparation des messages — a donc été déplacé dans `lib/`.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { describeMapSurface, resolveMapboxToken } from '../mapSurface';

test('jeton absent → unconfigured/missing', () => {
  for (const raw of [undefined, null, '']) {
    const resolution = resolveMapboxToken(raw);
    assert.equal(resolution.status, 'unconfigured', `raw=${JSON.stringify(raw)}`);
    assert.equal(resolution.status === 'unconfigured' && resolution.reason, 'missing');
  }
});

test('jeton fait uniquement d’espaces → unconfigured/blank', () => {
  // C'est le cas que `!!token` laissait passer : le repli SVG était abandonné
  // au profit d'une carte qui ne pouvait pas se charger.
  for (const raw of [' ', '   ', '\t', '\n', ' \t\n ']) {
    const resolution = resolveMapboxToken(raw);
    assert.equal(resolution.status, 'unconfigured', `raw=${JSON.stringify(raw)}`);
    assert.equal(resolution.status === 'unconfigured' && resolution.reason, 'blank');
    assert.notEqual(Boolean(raw), false, 'le prédicat historique !!token acceptait pourtant cette valeur');
  }
});

test('jeton non vide → configured, et rogné', () => {
  // La valeur est volontairement SANS forme de jeton Mapbox. Une première
  // version imitait le préfixe d'un vrai jeton public Mapbox et le `Secret scan` du
  // dépôt l'a signalée comme fuite — à raison : un scanner ne peut pas
  // distinguer un faux crédible d'un vrai. La fonction ne teste de toute façon
  // que le rognage et la non-vacuité ; le réalisme n'apportait rien.
  const resolution = resolveMapboxToken('  jeton-de-test-non-secret  ');
  assert.equal(resolution.status, 'configured');
  assert.equal(resolution.status === 'configured' && resolution.token, 'jeton-de-test-non-secret');
});

test('« non configuré » et « indisponible » ne partagent jamais le même message', () => {
  const unconfigured = describeMapSurface('unconfigured');
  const unavailable = describeMapSurface('unavailable');
  assert.notEqual(unconfigured, unavailable);
  assert.ok(unconfigured.trim().length > 0);
  assert.ok(unavailable.trim().length > 0);
});

test('aucun message n’affirme une absence de lieux', () => {
  // La carte peut être en panne sans que le territoire soit vide. Confondre les
  // deux reviendrait à publier une conclusion que rien n'étaye — c'est la même
  // frontière que `osm-spots.ts` tient entre « source indisponible » et
  // « aucun POI ».
  for (const state of ['unconfigured', 'unavailable'] as const) {
    const message = describeMapSurface(state).toLowerCase();
    assert.ok(!message.includes('aucun lieu'), state);
    assert.ok(!message.includes('aucun spot'), state);
    assert.ok(!message.includes('rien à afficher'), state);
  }
});

test('le message d’indisponibilité dit explicitement que ce n’est pas une absence de données', () => {
  assert.ok(describeMapSurface('unavailable').includes("n'est pas une absence de lieux"));
});
