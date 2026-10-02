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

const NOW = Date.parse('2026-10-01T12:00:00Z');

test('Breiz regional lexicon fails closed until named review receipt exists', () => {
  assert.equal(getVerifiedRegionalLexicon('bretagne').length, 0);
  assert.ok(REGIONAL_LEXICON.some((entry) => entry.regionId === 'bretagne'));

  for (const entry of REGIONAL_LEXICON.filter((item) => item.regionId === 'bretagne')) {
    assert.equal(entry.revision, REGIONAL_LEXICON_REVISION);
    assert.equal(entry.status, 'PENDING_REVIEW');
    assert.equal(entry.reviewer, null);
    assert.equal(entry.reviewedAt, null);
    assert.equal(entry.reviewReceipt, null);
    assert.equal(entry.reviewedTerm, null);
    assert.equal(entry.reviewedMeaningFr, null);
    assert.equal(entry.reviewedUsage, null);
    assert.equal(entry.reviewedRevision, null);
    assert.equal(hasCompleteRegionalReviewReceipt(entry, NOW), false);
  }
});

test('a VERIFIED status without named receipt still fails closed', () => {
  const fakeStatusFlip = {
    ...REGIONAL_LEXICON[0]!,
    status: 'VERIFIED' as const,
  };

  assert.equal(hasCompleteRegionalReviewReceipt(fakeStatusFlip, NOW), false);
});

test('regional review receipt must bind the exact term, meaning, usage and revision', () => {
  const base = REGIONAL_LEXICON[0]!;
  const reviewed = {
    ...base,
    status: 'VERIFIED' as const,
    reviewer: 'qualified language reviewer',
    reviewedAt: '2026-09-30T10:00:00Z',
    reviewReceipt: 'CONTROLLED_REVIEW_RECEIPT_001',
    reviewedTerm: base.term,
    reviewedMeaningFr: base.meaningFr,
    reviewedUsage: base.usage,
    reviewedRevision: base.revision,
  };

  assert.equal(hasCompleteRegionalReviewReceipt(reviewed, NOW), true);

  assert.equal(
    hasCompleteRegionalReviewReceipt(
      { ...reviewed, term: 'Edited after review' },
      NOW,
    ),
    false,
  );
  assert.equal(
    hasCompleteRegionalReviewReceipt(
      { ...reviewed, meaningFr: 'Meaning edited after review.' },
      NOW,
    ),
    false,
  );
  assert.equal(
    hasCompleteRegionalReviewReceipt(
      { ...reviewed, usage: 'culture' as const },
      NOW,
    ),
    false,
  );
});

test('regional review receipt rejects invalid or future review dates', () => {
  const base = REGIONAL_LEXICON[0]!;
  const reviewed = {
    ...base,
    status: 'VERIFIED' as const,
    reviewer: 'qualified language reviewer',
    reviewedAt: '2026-09-30T10:00:00Z',
    reviewReceipt: 'CONTROLLED_REVIEW_RECEIPT_001',
    reviewedTerm: base.term,
    reviewedMeaningFr: base.meaningFr,
    reviewedUsage: base.usage,
    reviewedRevision: base.revision,
  };

  assert.equal(
    hasCompleteRegionalReviewReceipt(
      { ...reviewed, reviewedAt: 'not-a-date' },
      NOW,
    ),
    false,
  );
  assert.equal(
    hasCompleteRegionalReviewReceipt(
      { ...reviewed, reviewedAt: '2027-01-01T00:00:00Z' },
      NOW,
    ),
    false,
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
