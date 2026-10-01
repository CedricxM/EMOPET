import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getBreizSource } from '../../data/breiz/sourceRegistry';
import { evaluateRegionalPackReleaseReadiness } from '../regional-pack';
import { BRETAGNE_REGIONAL_PACK } from '../profiles/bretagne-pack';

const NOW = Date.parse('2026-10-01T12:00:00Z');

test('Bretagne pack composes matching regional authorities', () => {
  assert.equal(BRETAGNE_REGIONAL_PACK.regionId, 'bretagne');
  assert.equal(BRETAGNE_REGIONAL_PACK.profile.regionId, 'bretagne');
  assert.equal(BRETAGNE_REGIONAL_PACK.knowledgeBase.regionId, 'bretagne');
});

test('every Bretagne pack source binding exists in the controlled source registry', () => {
  for (const binding of BRETAGNE_REGIONAL_PACK.sourceBindings) {
    assert.ok(getBreizSource(binding.sourceId), binding.sourceId);
  }
});

test('Bretagne pack stays fail-closed until profile, language and source evidence are ready', () => {
  const verdict = evaluateRegionalPackReleaseReadiness(
    BRETAGNE_REGIONAL_PACK,
    NOW,
  );

  assert.equal(verdict.releaseReady, false);
  assert.ok(verdict.blockers.includes('PROFILE_NOT_PRODUCTION_READY'));
  assert.ok(verdict.blockers.includes('NO_VERIFIED_REGIONAL_LEXICON'));
  assert.ok(
    verdict.blockers.includes(
      'REQUIRED_DATA_DOMAIN_WITHOUT_RELEASE_READY_SOURCE',
    ),
  );
  assert.deepEqual(
    [...verdict.missingDomains].sort(),
    ['canine_network', 'culture', 'events', 'territorial_context'].sort(),
  );
  assert.deepEqual(verdict.unknownSourceIds, []);
});

test('Bretagne pack does not claim unreviewed Breton or Gallo locale coverage', () => {
  assert.deepEqual(BRETAGNE_REGIONAL_PACK.supportedLocales, ['fr-FR']);
});
