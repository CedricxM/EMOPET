import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const homeSource = readFileSync(
  new URL('../../apps/mobile/app/(tabs)/index.tsx', import.meta.url),
  'utf8',
);
const profileSource = readFileSync(
  new URL('../../apps/mobile/app/(tabs)/me.tsx', import.meta.url),
  'utf8',
);

test('INT-09G1 home cannot expose synthetic sensor or behavioral observations', () => {
  assert.match(homeSource, /V6_INSIGHTS_RUNTIME_SOURCE/);
  assert.match(homeSource, /Aucune projection ELI de référence n est câblée/);
  assert.match(
    homeSource,
    /V6_INSIGHTS_RUNTIME_SOURCE\.authoritative[\s\S]*showAnticipation/,
  );

  for (const forbidden of [
    "'Gwen'",
    "'0,42'",
    "'6 h 12'",
    "'62 %'",
    "'2 nuits observées'",
    "'Repos fragmenté'",
    'anticipe vos départs le matin',
    'Détecté 3 fois ce mois-ci',
    'hardwareLinked',
  ]) {
    assert.equal(
      homeSource.includes(forbidden),
      false,
      `synthetic home sentinel returned: ${forbidden}`,
    );
  }
});

test('INT-09G1 profile cannot claim device linkage from local preference', () => {
  assert.doesNotMatch(profileSource, /hardwareLinked/);
  assert.doesNotMatch(profileSource, /usePreferencesStore/);
  assert.match(profileSource, /Statut de liaison indisponible/);
  assert.match(profileSource, /Aucun runtime device de référence n est câblé/);

  for (const forbidden of [
    "'Gwen'",
    'Épagneul breton · 4 ans · 18 kg',
    'Connecté · 98 % présence',
    'Contact partiel · batterie 42 %',
    'Moins de 30 min de signal valide',
    "hint: 'Rapport 14 j'",
  ]) {
    assert.equal(
      profileSource.includes(forbidden),
      false,
      `synthetic profile sentinel returned: ${forbidden}`,
    );
  }
});
