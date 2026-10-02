import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildAssistantSystemPrompt } from '../build-system-prompt';
import { BRETAGNE_KNOWLEDGE, BRETAGNE_PROFILE } from '../profiles/bretagne';
import {
  REGIONAL_LEXICON,
  REGIONAL_LEXICON_REVISION,
  buildRegionalLexiconPromptBlock,
  getVerifiedRegionalLexicon,
  hasCompleteRegionalReviewReceipt,
} from '../regional-lexicon';

test('Breiz regional lexicon fails closed until named review receipt exists', () => {
  assert.equal(getVerifiedRegionalLexicon('bretagne').length, 0);
  assert.ok(REGIONAL_LEXICON.some((entry) => entry.regionId === 'bretagne'));

  for (const entry of REGIONAL_LEXICON.filter((item) => item.regionId === 'bretagne')) {
    assert.equal(entry.revision, REGIONAL_LEXICON_REVISION);
    assert.equal(entry.status, 'PENDING_REVIEW');
    assert.equal(entry.reviewer, null);
    assert.equal(entry.reviewedAt, null);
    assert.equal(entry.reviewReceipt, null);
    assert.equal(hasCompleteRegionalReviewReceipt(entry), false);
  }
});

test('a VERIFIED status without named receipt still fails closed', () => {
  const fakeStatusFlip = {
    ...REGIONAL_LEXICON[0]!,
    status: 'VERIFIED' as const,
  };

  assert.equal(hasCompleteRegionalReviewReceipt(fakeStatusFlip), false);
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
