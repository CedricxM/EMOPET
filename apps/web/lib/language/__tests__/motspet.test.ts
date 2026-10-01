import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MOTSPET_ENTRIES,
  buildMotsPetPromptBlock,
  getControlledMotsPetEntries,
  getMotsPetEntry,
} from '../motspet';

test('MotsPet controlled seed excludes HOLD entries', () => {
  const controlled = getControlledMotsPetEntries();

  assert.ok(controlled.length > 0);
  assert.ok(controlled.every((entry) => entry.status === 'CONTROLLED_SEED'));
  assert.ok(!controlled.some((entry) => entry.id === 'activation_change'));
});

test('MotsPet controlled entries carry repository authority pointers', () => {
  for (const entry of getControlledMotsPetEntries()) {
    assert.ok(entry.authorityPaths.length > 0, `${entry.id} must carry at least one authority path`);
    assert.ok(entry.authorityPaths.every((path) => path.startsWith('docs/')));
  }
});

test('MotsPet prompt exposes controlled language but not HOLD wording', () => {
  const block = buildMotsPetPromptBlock();

  assert.match(block, /Contrat de langage MotsPet/);
  assert.match(block, /observation/);
  assert.match(block, /niveau de confiance/);
  assert.doesNotMatch(block, /variation d’activation observée/);
});

test('MotsPet keeps public language distinct from unsupported certainty', () => {
  const confidence = getMotsPetEntry('confidence');
  assert.ok(confidence);
  assert.ok(confidence.prohibitedPublicTerms.includes('certitude'));

  const held = MOTSPET_ENTRIES.find((entry) => entry.status === 'HOLD');
  assert.ok(held, 'foundation should demonstrate at least one explicit HOLD entry');
});
