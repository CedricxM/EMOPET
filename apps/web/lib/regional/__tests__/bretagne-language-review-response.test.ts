import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  evaluateBretagneLanguageReviewResponse,
  evaluateBretagneLanguageReviewResponses,
  type BretagneLanguageReviewAuthorityContext,
  type BretagneLanguageReviewResponse,
} from '../bretagne-language-review-response';
import {
  BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION,
  buildBretagneLanguageReviewPacket,
} from '../bretagne-language-review-packet';

const NOW = Date.parse('2026-10-02T00:00:00Z');

function authority(
  reviewItemIds: readonly string[] = [
    'bretagne_companion_identity',
    'bretagne_demat',
    'bretagne_ar_veute',
  ],
  overrides: Partial<BretagneLanguageReviewAuthorityContext> = {},
): BretagneLanguageReviewAuthorityContext {
  return {
    candidateId: 'oplb-termbret',
    organisationName: 'Office public de la langue bretonne / TermBret',
    relationshipStatus: 'REVIEW_SCOPE_AGREED',
    packetRevision: BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION,
    reviewItemIds,
    scopeAgreementEvidenceRef: 'CONTROLLED_SCOPE_AGREEMENT_REF',
    scopeAgreedAt: '2026-10-01T17:00:00Z',
    ...overrides,
  };
}

function identityResponse(
  overrides: Partial<BretagneLanguageReviewResponse> = {},
): BretagneLanguageReviewResponse {
  const packet = buildBretagneLanguageReviewPacket();
  const exactClaim = [
    packet.identity.assistantName,
    packet.identity.assistantNameOrigin,
    packet.identity.namingRule,
  ].join(' | ');

  return {
    packetRevision: BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION,
    itemId: packet.identity.itemId,
    kind: 'IDENTITY',
    disposition: 'APPROVED',
    reviewerRole: 'qualified language reviewer',
    reviewerRef: 'CONTROLLED_REVIEWER_REF_IDENTITY',
    reviewedAt: '2026-10-01T18:00:00Z',
    evidenceReference: 'CONTROLLED_REVIEW_REF_IDENTITY_001',
    approvedMeaningOrClaim: exactClaim,
    permittedUsage: 'regional companion identity',
    conditionsOrRestrictions: '',
    attributionOrReuseRequirements: 'No special attribution beyond receipt reference.',
    ...overrides,
  };
}

function lexiconResponse(
  itemId: 'bretagne_demat' | 'bretagne_ar_veute' = 'bretagne_demat',
  overrides: Partial<BretagneLanguageReviewResponse> = {},
): BretagneLanguageReviewResponse {
  const packet = buildBretagneLanguageReviewPacket();
  const item = packet.lexicon.find((entry) => entry.itemId === itemId)!;

  return {
    packetRevision: BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION,
    itemId,
    kind: 'LEXICON',
    disposition: 'APPROVED',
    reviewerRole: 'qualified language reviewer',
    reviewerRef: 'CONTROLLED_REVIEWER_REF_LEXICON',
    reviewedAt: '2026-10-01T18:00:00Z',
    evidenceReference: 'CONTROLLED_REVIEW_REF_' + itemId.toUpperCase(),
    approvedMeaningOrClaim: item.meaningFr,
    permittedUsage: item.usage,
    conditionsOrRestrictions: '',
    attributionOrReuseRequirements: 'No special attribution beyond receipt reference.',
    ...overrides,
  };
}

test('approved identity response produces a human-review-only proposal', () => {
  const result = evaluateBretagneLanguageReviewResponse(
    identityResponse(),
    [authority()],
    undefined,
    NOW,
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.ok(result.proposal);
  assert.equal(result.proposal.kind, 'IDENTITY');
  assert.equal(result.proposal.proposalStatus, 'HUMAN_REVIEW_REQUIRED');
  assert.equal(result.proposal.canApplyAutomatically, false);
});

test('approved lexicon response binds the exact packet term, meaning, usage and revision', () => {
  const packet = buildBretagneLanguageReviewPacket();
  const item = packet.lexicon.find(
    (entry) => entry.itemId === 'bretagne_demat',
  )!;

  const result = evaluateBretagneLanguageReviewResponse(
    lexiconResponse('bretagne_demat'),
    [authority()],
    packet,
    NOW,
  );

  assert.equal(result.valid, true);
  assert.ok(result.proposal);
  assert.equal(result.proposal.kind, 'LEXICON');

  if (result.proposal.kind === 'LEXICON') {
    assert.equal(result.proposal.reviewedTerm, item.term);
    assert.equal(result.proposal.reviewedMeaningFr, item.meaningFr);
    assert.equal(result.proposal.reviewedUsage, item.usage);
    assert.equal(result.proposal.reviewedRevision, item.lexiconRevision);
  }
});

test('response fails closed on packet revision, kind, date and evidence drift', () => {
  const invalid = identityResponse({
    packetRevision:
      'bretagne-language-review-packet-v1-2026-10-01' as typeof BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION,
    kind: 'LEXICON',
    reviewedAt: '2027-01-01T00:00:00Z',
    evidenceReference: '   ',
  });

  // Force a mismatching runtime packet revision without changing production
  // authority by evaluating against a synthetic packet clone.
  const packet = {
    ...buildBretagneLanguageReviewPacket(),
    packetRevision:
      'synthetic-new-packet-revision' as typeof BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION,
  };

  const result = evaluateBretagneLanguageReviewResponse(
    invalid,
    [authority()],
    packet,
    NOW,
  );
  const codes = result.errors.map((error) => error.code);

  assert.equal(result.valid, false);
  assert.equal(result.proposal, null);
  assert.ok(codes.includes('PACKET_REVISION_MISMATCH'));
  assert.ok(codes.includes('KIND_MISMATCH'));
  assert.ok(codes.includes('FUTURE_REVIEW_DATE'));
  assert.ok(codes.includes('MISSING_EVIDENCE_REFERENCE'));
});

test('review response requires a bounded reviewer reference distinct from the evidence receipt', () => {
  const result = evaluateBretagneLanguageReviewResponse(
    identityResponse({ reviewerRef: '   ' }),
    [authority()],
    undefined,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) => error.code === 'MISSING_REVIEWER_REF',
    ),
  );
});

test('approved response cannot silently approve edited meaning or usage', () => {
  const result = evaluateBretagneLanguageReviewResponse(
    lexiconResponse('bretagne_demat', {
      approvedMeaningOrClaim: 'Edited meaning after review packet generation.',
      permittedUsage: 'culture',
    }),
    [authority()],
    undefined,
    NOW,
  );

  const codes = result.errors.map((error) => error.code);
  assert.equal(result.valid, false);
  assert.ok(codes.includes('APPROVED_LEXICON_MEANING_MISMATCH'));
  assert.ok(codes.includes('APPROVED_LEXICON_USAGE_MISMATCH'));
});

test('conditional approval requires explicit conditions', () => {
  const result = evaluateBretagneLanguageReviewResponse(
    lexiconResponse('bretagne_demat', {
      disposition: 'APPROVED_WITH_CONDITIONS',
      conditionsOrRestrictions: '   ',
    }),
    [authority()],
    undefined,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.code === 'MISSING_CONDITIONS_FOR_CONDITIONAL_APPROVAL',
    ),
  );
});

test('rejected review can be recorded but never creates an apply proposal', () => {
  const result = evaluateBretagneLanguageReviewResponse(
    lexiconResponse('bretagne_ar_veute', {
      disposition: 'REJECTED',
      approvedMeaningOrClaim:
        'Reviewer rejects the proposed term/meaning for this product usage.',
      permittedUsage: 'do not use in current product context',
      conditionsOrRestrictions: 'Do not publish this term as currently framed.',
    }),
    [authority()],
    undefined,
    NOW,
  );

  assert.equal(result.valid, true);
  assert.equal(result.proposal, null);
});

test('batch evaluation supports partial review but reports missing coverage', () => {
  const batch = evaluateBretagneLanguageReviewResponses(
    [identityResponse(), lexiconResponse('bretagne_demat')],
    [authority()],
    undefined,
    NOW,
  );

  assert.equal(batch.allReceivedResponsesValid, true);
  assert.equal(batch.completeCoverage, false);
  assert.deepEqual(batch.missingItemIds, ['bretagne_ar_veute']);
  assert.deepEqual(batch.duplicateItemIds, []);
});

test('batch evaluation rejects duplicate responses for the same review item', () => {
  const duplicate = evaluateBretagneLanguageReviewResponses(
    [
      identityResponse(),
      lexiconResponse('bretagne_demat'),
      lexiconResponse('bretagne_demat'),
      lexiconResponse('bretagne_ar_veute'),
    ],
    [authority()],
    undefined,
    NOW,
  );

  assert.equal(duplicate.allReceivedResponsesValid, false);
  assert.equal(duplicate.completeCoverage, false);
  assert.deepEqual(duplicate.duplicateItemIds, ['bretagne_demat']);
});

test('complete valid review response set is complete but still not auto-applied', () => {
  const batch = evaluateBretagneLanguageReviewResponses(
    [
      identityResponse(),
      lexiconResponse('bretagne_demat'),
      lexiconResponse('bretagne_ar_veute'),
    ],
    [authority()],
    undefined,
    NOW,
  );

  assert.equal(batch.allReceivedResponsesValid, true);
  assert.equal(batch.completeCoverage, true);

  for (const result of batch.results) {
    if (result.proposal) {
      assert.equal(result.proposal.canApplyAutomatically, false);
      assert.equal(result.proposal.proposalStatus, 'HUMAN_REVIEW_REQUIRED');
    }
  }
});


test('review response fails closed when no agreed review authority exists', () => {
  const result = evaluateBretagneLanguageReviewResponse(
    identityResponse(),
    [],
    undefined,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.equal(result.proposal, null);
  assert.ok(
    result.errors.some(
      (error) => error.code === 'NO_AGREED_REVIEW_AUTHORITY',
    ),
  );
});

test('review authority must cover the exact item and current packet', () => {
  const outOfScope = evaluateBretagneLanguageReviewResponse(
    lexiconResponse('bretagne_demat'),
    [authority(['bretagne_companion_identity'])],
    undefined,
    NOW,
  );
  assert.ok(
    outOfScope.errors.some(
      (error) => error.code === 'NO_AGREED_REVIEW_AUTHORITY',
    ),
  );

  const wrongPacket = evaluateBretagneLanguageReviewResponse(
    identityResponse(),
    [
      authority(undefined, {
        packetRevision:
          'synthetic-old-packet' as typeof BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION,
      }),
    ],
    undefined,
    NOW,
  );
  assert.ok(
    wrongPacket.errors.some(
      (error) => error.code === 'REVIEW_SCOPE_PACKET_MISMATCH',
    ),
  );
});

test('review evidence cannot predate the agreed review scope', () => {
  const result = evaluateBretagneLanguageReviewResponse(
    identityResponse({ reviewedAt: '2026-10-01T16:00:00Z' }),
    [authority()],
    undefined,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) => error.code === 'REVIEW_PRECEDES_SCOPE_AGREEMENT',
    ),
  );
});

test('approved proposal preserves the exact outreach authority binding', () => {
  const result = evaluateBretagneLanguageReviewResponse(
    identityResponse(),
    [authority()],
    undefined,
    NOW,
  );

  assert.ok(result.proposal);
  assert.equal(result.proposal.authorityCandidateId, 'oplb-termbret');
  assert.equal(
    result.proposal.scopeAgreementEvidenceRef,
    'CONTROLLED_SCOPE_AGREEMENT_REF',
  );
});


test('review authority must be unique and carry scope-agreement evidence', () => {
  const ambiguous = evaluateBretagneLanguageReviewResponse(
    identityResponse(),
    [
      authority(),
      authority(undefined, {
        candidateId: 'second-authority',
        organisationName: 'Second synthetic authority',
        scopeAgreementEvidenceRef: 'SECOND_SCOPE_REF',
      }),
    ],
    undefined,
    NOW,
  );
  assert.ok(
    ambiguous.errors.some(
      (error) => error.code === 'AMBIGUOUS_REVIEW_AUTHORITY',
    ),
  );

  const missingEvidence = evaluateBretagneLanguageReviewResponse(
    identityResponse(),
    [authority(undefined, { scopeAgreementEvidenceRef: '   ' })],
    undefined,
    NOW,
  );
  assert.ok(
    missingEvidence.errors.some(
      (error) => error.code === 'REVIEW_SCOPE_EVIDENCE_MISSING',
    ),
  );
});
