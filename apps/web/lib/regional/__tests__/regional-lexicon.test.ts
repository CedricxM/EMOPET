import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildAssistantSystemPrompt } from '../build-system-prompt';
import { BRETAGNE_KNOWLEDGE, BRETAGNE_PROFILE } from '../profiles/bretagne';
import {
  REGIONAL_LEXICON,
  buildRegionalLexiconPromptBlock,
  getVerifiedRegionalLexicon,
} from '../regional-lexicon';

test('Breiz regional lexicon fails closed until named review exists', () => {
  assert.equal(getVerifiedRegionalLexicon('bretagne').length, 0);
  assert.ok(REGIONAL_LEXICON.some((entry) => entry.regionId === 'bretagne'));
  assert.ok(
    REGIONAL_LEXICON
      .filter((entry) => entry.regionId === 'bretagne')
      .every((entry) => entry.status === 'PENDING_REVIEW'),
  );
});

test('unreviewed Breton-flavoured terms are not injected into prompt guidance', () => {
  const block = buildRegionalLexiconPromptBlock('bretagne');

  assert.match(block, /Aucun terme régional n’est actuellement VERIFIED/);
  assert.doesNotMatch(block, /Demat/);
  assert.doesNotMatch(block, /Ar Veute/);
});

test('Breiz prompt carries MotsPet contract and regional fail-closed rule', () => {
  const built = buildAssistantSystemPrompt(BRETAGNE_PROFILE, BRETAGNE_KNOWLEDGE, {
    userMessage: 'bonjour',
    touchesEliData: false,
  });

  assert.match(built.prompt, /Contrat de langage MotsPet/);
  assert.match(built.prompt, /Lexique régional contrôlé/);
  assert.match(built.prompt, /N’invente pas de dialecte/);
});
