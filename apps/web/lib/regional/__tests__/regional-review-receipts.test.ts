import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { RegionalLexiconEntry } from '../regional-lexicon';
import { isRegionalLexiconEntryReleaseReady } from '../regional-lexicon';
import {
  hasApprovedRegionalReviewReceipt,
  isRegionalReviewReceiptStructurallyValid,
  type RegionalReviewReceipt,
} from '../regional-review-receipts';

const NOW = Date.parse('2026-10-01T12:00:00Z');

const approvedReceipt: RegionalReviewReceipt = {
  receiptId: 'review-bretagne-example-001',
  regionId: 'bretagne',
  lexiconEntryId: 'bretagne_example',
  reviewerRole: 'qualified language reviewer',
  reviewerRef: 'CONTROLLED_REVIEWER_REF_001',
  reviewedAt: '2026-09-30T10:00:00Z',
  exactTerm: 'Example',
  approvedMeaningFr: 'Terme de test uniquement.',
  permittedUsage: ['greeting'],
  sourceReference: 'CONTROLLED_EVIDENCE_REF_001',
  disposition: 'APPROVED',
};

test('regional review receipt requires complete non-future evidence metadata', () => {
  assert.equal(isRegionalReviewReceiptStructurallyValid(approvedReceipt, NOW), true);
  assert.equal(
    isRegionalReviewReceiptStructurallyValid({ ...approvedReceipt, reviewerRef: '' }, NOW),
    false,
  );
  assert.equal(
    isRegionalReviewReceiptStructurallyValid({ ...approvedReceipt, reviewedAt: '2027-01-01T00:00:00Z' }, NOW),
    false,
  );
});

test('approved receipt lookup binds region, exact lexicon entry and exact term', () => {
  assert.equal(
    hasApprovedRegionalReviewReceipt(
      'bretagne',
      'bretagne_example',
      'Example',
      [approvedReceipt],
      NOW,
    ),
    true,
  );
  assert.equal(
    hasApprovedRegionalReviewReceipt(
      'bretagne',
      'bretagne_example',
      'Different term',
      [approvedReceipt],
      NOW,
    ),
    false,
  );
});

test('VERIFIED label alone cannot release regional vocabulary without repository receipt', () => {
  const synthetic: RegionalLexiconEntry = {
    id: 'bretagne_example',
    regionId: 'bretagne',
    term: 'Example',
    meaningFr: 'Terme de test uniquement.',
    usage: 'greeting',
    sourceNote: 'Synthetic test entry.',
    status: 'VERIFIED',
  };

  assert.equal(isRegionalLexiconEntryReleaseReady(synthetic), false);
});
