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

test('every Bretagne source binding references a controlled source-registry entry', () => {
  for (const binding of BRETAGNE_REGIONAL_PACK.sourceBindings) {
    assert.ok(getBreizSource(binding.sourceId), binding.sourceId);
  }
});

test('Bretagne pack stays fail-closed with current evidence', () => {
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
  assert.ok(verdict.missingDomains.includes('territorial_context'));
  assert.ok(verdict.missingDomains.includes('culture'));
  assert.ok(verdict.missingDomains.includes('events'));
  assert.ok(verdict.missingDomains.includes('canine_network'));
  assert.deepEqual(verdict.unknownSourceIds, []);
});

test('canine network is an explicit blocker rather than an invented source relationship', () => {
  const canineBindings = BRETAGNE_REGIONAL_PACK.sourceBindings.filter(
    (binding) => binding.domains.includes('canine_network'),
  );

  assert.deepEqual(canineBindings, []);
  assert.ok(
    BRETAGNE_REGIONAL_PACK.requiredDataDomains.includes('canine_network'),
  );
});

test('Bretagne pack does not overclaim Breton or Gallo locale support', () => {
  assert.deepEqual(BRETAGNE_REGIONAL_PACK.supportedLocales, ['fr-FR']);
});
