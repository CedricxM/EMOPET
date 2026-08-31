import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BREIZ_CONTROLLED_DISCOVERY_SCENES,
  officialDiscoveryToScene,
  selectBreizControlledDiscoveries,
} from '..';

test('Lorient en août privilégie la scène Festival Interceltique', () => {
  const scenes = selectBreizControlledDiscoveries({
    regionId: 'bretagne',
    department: '56',
    city: 'Lorient',
    month: 8,
    limit: 4,
  });

  assert.equal(scenes[0]?.id, 'demo-festival-interceltique');
  assert.ok(scenes.some((scene) => scene.id === 'demo-lorient-port'));
});

test('une ville spécifique ne fuit pas sans contexte de ville', () => {
  const scenes = selectBreizControlledDiscoveries({ regionId: 'bretagne', limit: 8 });
  assert.ok(scenes.every((scene) => !scene.trigger.cities?.length));
});

test('la sélection normalise les accents et la casse de la ville', () => {
  const scenes = selectBreizControlledDiscoveries({
    regionId: 'BRETAGNE',
    department: '56',
    city: 'lorient',
    month: 8,
  });
  assert.ok(scenes.some((scene) => scene.id === 'demo-lorient-port'));
});

test('toutes les fixtures de scène conservent une provenance explicite', () => {
  for (const scene of BREIZ_CONTROLLED_DISCOVERY_SCENES) {
    assert.equal(scene.provenance, 'CONTROLLED_FIXTURE');
    assert.ok(scene.sourceName.trim().length > 0);
    assert.ok(scene.license?.trim().length);
  }
});

test('un résultat officiel reste metadata-grounded sans inventer de résumé', () => {
  const scene = officialDiscoveryToScene({
    sourceId: 'pop-culture',
    sourceName: 'Ministère de la Culture',
    title: 'Notice de démonstration',
    summary: null,
    canonicalUrl: 'https://example.invalid/notice',
    territory: 'Lorient',
    license: 'metadata',
    attribution: 'Ministère de la Culture',
    sourceUpdatedAt: null,
    retrievedAt: '2026-08-31T00:00:00.000Z',
  });

  assert.equal(scene.provenance, 'OFFICIAL_METADATA');
  assert.match(scene.story, /pas assez de texte/i);
  assert.equal(scene.sourceUrl, 'https://example.invalid/notice');
});
