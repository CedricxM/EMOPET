import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MOTSPET_REVISION,
  getControlledMotsPetEntries,
  getMotsPetEntry,
} from '../motspet';
import { auditMotsPetSemanticCoverage } from '../motspet-semantic-qa';

const CORE_OBSERVATION_CONCEPTS = [
  'observation',
  'context',
  'time_window',
  'individual_reference',
  'source',
  'confidence',
  'limits',
  'model_version',
  'publication_state',
  'device_state',
  'signal_quality',
  'owner_note',
  'insufficient_evidence',
] as const;

test('MotsPet v0.3 core Care observation contract remains controlled in later revisions', () => {
  assert.ok(MOTSPET_REVISION.startsWith('motspet-v0.'));

  for (const conceptId of CORE_OBSERVATION_CONCEPTS) {
    const entry = getMotsPetEntry(conceptId);
    assert.ok(entry, conceptId);
    assert.equal(entry.status, 'CONTROLLED_SEED', conceptId);
    assert.ok(entry.publicFr.trim(), conceptId + ' FR');
    assert.ok(entry.publicEn.trim(), conceptId + ' EN');
    assert.ok(entry.authorityPaths.length > 0, conceptId + ' authority');
  }
});

test('MotsPet semantic coverage remains complete after the v0.3 core inventory expansion', () => {
  assert.deepEqual(auditMotsPetSemanticCoverage(), []);
});

test('individual reference language rejects universal or competitive framing', () => {
  const entry = getMotsPetEntry('individual_reference');
  assert.ok(entry);

  assert.ok(entry.prohibitedPublicTerms.includes('norme universelle'));
  assert.ok(entry.prohibitedPublicTerms.includes('chien normal'));
  assert.ok(entry.prohibitedPublicTerms.includes('classement'));
  assert.ok(entry.prohibitedPublicTerms.includes('percentile de race'));
});

test('device state and signal quality remain distinct from dog-state claims', () => {
  const device = getMotsPetEntry('device_state');
  const quality = getMotsPetEntry('signal_quality');

  assert.ok(device);
  assert.ok(quality);
  assert.ok(device.prohibitedPublicTerms.includes('état de santé'));
  assert.ok(device.prohibitedPublicTerms.includes('diagnostic'));
  assert.ok(quality.prohibitedPublicTerms.includes('état émotionnel'));
});

test('controlled inventory is broader than the initial v0.2 seed without promoting HOLD concepts', () => {
  const controlledIds = getControlledMotsPetEntries().map((entry) => entry.id);

  assert.ok(controlledIds.length >= 14);
  assert.equal(controlledIds.includes('activation_change'), false);
});
