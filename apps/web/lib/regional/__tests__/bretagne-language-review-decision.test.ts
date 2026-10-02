import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BRETAGNE_LANGUAGE_REVIEW_DECISION_REVISION,
  evaluateBretagneLanguageReviewDecision,
  type BretagneLanguageReviewDecision,
} from '../bretagne-language-review-decision';
import {
  evaluateBretagneLanguageReviewResponse,
  type BretagneLanguageReviewResponse,
} from '../bretagne-language-review-response';
import {
  BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION,
  buildBretagneLanguageReviewPacket,
} from '../bretagne-language-review-packet';

const NOW = Date.parse('2026-10-02T09:00:00Z');

function identityProposal() {
  const packet = buildBretagneLanguageReviewPacket();
  const exactClaim = [
    packet.identity.assistantName,
    packet.identity.assistantNameOrigin,
    packet.identity.namingRule,
  ].join(' | ');

  const response: BretagneLanguageReviewResponse = {
    packetRevision: BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION,
    itemId: packet.identity.itemId,
    kind: 'IDENTITY',
    disposition: 'APPROVED',
    reviewerRole: 'qualified language reviewer',
    reviewedAt: '2026-10-02T07:30:00Z',
    evidenceReference: 'CONTROLLED_LANGUAGE_REVIEW_RECEIPT',
    approvedMeaningOrClaim: exactClaim,
    permittedUsage: 'regional companion identity',
    conditionsOrRestrictions: '',
    attributionOrReuseRequirements: 'Retain the review receipt reference.',
  };

  const result = evaluateBretagneLanguageReviewResponse(
    response,
    packet,
    NOW,
  );
  assert.ok(result.proposal);
  return { packet, proposal: result.proposal };
}

function lexiconProposal(
  itemId: 'bretagne_demat' | 'bretagne_ar_veute' = 'bretagne_demat',
  disposition: 'APPROVED' | 'APPROVED_WITH_CONDITIONS' = 'APPROVED',
) {
  const packet = buildBretagneLanguageReviewPacket();
  const item = packet.lexicon.find((entry) => entry.itemId === itemId)!;

  const response: BretagneLanguageReviewResponse = {
    packetRevision: BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION,
    itemId,
    kind: 'LEXICON',
    disposition,
    reviewerRole: 'qualified language reviewer',
    reviewedAt: '2026-10-02T07:30:00Z',
    evidenceReference: 'CONTROLLED_' + itemId.toUpperCase() + '_RECEIPT',
    approvedMeaningOrClaim: item.meaningFr,
    permittedUsage: item.usage,
    conditionsOrRestrictions:
      disposition === 'APPROVED_WITH_CONDITIONS'
        ? 'Use only in the reviewed context.'
        : '',
    attributionOrReuseRequirements: 'Keep review receipt reference.',
  };

  const result = evaluateBretagneLanguageReviewResponse(
    response,
    packet,
    NOW,
  );
  assert.ok(result.proposal);
  return { packet, proposal: result.proposal };
}

function decision(
  proposal: ReturnType<typeof identityProposal>['proposal'],
  overrides: Partial<BretagneLanguageReviewDecision> = {},
): BretagneLanguageReviewDecision {
  return {
    decisionRevision: BRETAGNE_LANGUAGE_REVIEW_DECISION_REVISION,
    packetRevision: proposal.packetRevision,
    itemId: proposal.itemId,
    kind: proposal.kind,
    decision: 'ACCEPT',
    codeReviewerRole: 'maintainer / language-control reviewer',
    codeReviewerRef: 'CONTROLLED_CODE_REVIEWER_REF',
    decidedAt: '2026-10-02T08:30:00Z',
    decisionEvidenceReference: 'CONTROLLED_CODE_REVIEW_RECEIPT',
    conditionsAcknowledged: true,
    attributionOrReuseAcknowledged: true,
    semanticAuthorityUnchangedConfirmed: true,
    automaticApplyAllowed: false,
    notes: 'Checked against current runtime-derived packet.',
    ...overrides,
  };
}

test('accepted identity proposal yields only a manual runtime evidence candidate', () => {
  const { packet, proposal } = identityProposal();
  const result = evaluateBretagneLanguageReviewDecision(
    decision(proposal),
    proposal,
    packet,
    NOW,
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.ok(result.runtimeCandidate);
  assert.equal(result.runtimeCandidate.kind, 'IDENTITY');
  assert.equal(
    result.runtimeCandidate.candidateStatus,
    'MANUAL_RUNTIME_PATCH_REQUIRED',
  );
  assert.equal(result.runtimeCandidate.canApplyAutomatically, false);
  assert.equal(result.runtimeCandidate.semanticAuthorityChangeAllowed, false);

  if (result.runtimeCandidate.kind === 'IDENTITY') {
    assert.equal(
      result.runtimeCandidate.profileMutationAllowedAutomatically,
      false,
    );
    assert.equal(
      result.runtimeCandidate.identityEvidence.status,
      'VERIFIED',
    );
    assert.equal(
      result.runtimeCandidate.identityEvidence.exactAssistantName,
      packet.identity.assistantName,
    );
  }
});

test('accepted lexicon proposal yields an exact manual lexicon evidence candidate', () => {
  const { packet, proposal } = lexiconProposal('bretagne_demat');
  const result = evaluateBretagneLanguageReviewDecision(
    decision(proposal),
    proposal,
    packet,
    NOW,
  );

  assert.equal(result.valid, true);
  assert.ok(result.runtimeCandidate);
  assert.equal(result.runtimeCandidate.kind, 'LEXICON');

  if (result.runtimeCandidate.kind === 'LEXICON') {
    assert.equal(
      result.runtimeCandidate.lexiconMutationAllowedAutomatically,
      false,
    );
    assert.equal(result.runtimeCandidate.lexiconEvidence.status, 'VERIFIED');
    assert.equal(
      result.runtimeCandidate.lexiconEvidence.reviewedTerm,
      'Demat',
    );
  }
});

test('packet/runtime drift invalidates the decision before any candidate is produced', () => {
  const { packet, proposal } = lexiconProposal('bretagne_demat');
  const drifted = {
    ...packet,
    lexicon: packet.lexicon.map((item) =>
      item.itemId === 'bretagne_demat'
        ? { ...item, meaningFr: 'Edited after review.' }
        : item,
    ),
  };

  const result = evaluateBretagneLanguageReviewDecision(
    decision(proposal),
    proposal,
    drifted,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.equal(result.runtimeCandidate, null);
  assert.ok(
    result.errors.some((error) => error.code === 'RUNTIME_LEXICON_DRIFT'),
  );
});

test('decision must bind exact packet, item and kind', () => {
  const { packet, proposal } = identityProposal();
  const result = evaluateBretagneLanguageReviewDecision(
    decision(proposal, {
      packetRevision: 'old-packet',
      itemId: 'different-item',
      kind: 'LEXICON',
    }),
    proposal,
    packet,
    NOW,
  );

  const codes = result.errors.map((error) => error.code);
  assert.equal(result.valid, false);
  assert.ok(codes.includes('PACKET_REVISION_MISMATCH'));
  assert.ok(codes.includes('ITEM_ID_MISMATCH'));
  assert.ok(codes.includes('KIND_MISMATCH'));
});

test('conditional approval requires explicit conditions acknowledgement', () => {
  const { packet, proposal } = lexiconProposal(
    'bretagne_demat',
    'APPROVED_WITH_CONDITIONS',
  );

  const result = evaluateBretagneLanguageReviewDecision(
    decision(proposal, { conditionsAcknowledged: false }),
    proposal,
    packet,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.code === 'MISSING_CONDITIONS_ACKNOWLEDGEMENT',
    ),
  );
});

test('non-empty attribution/reuse requirements require acknowledgement', () => {
  const { packet, proposal } = identityProposal();

  const result = evaluateBretagneLanguageReviewDecision(
    decision(proposal, { attributionOrReuseAcknowledged: false }),
    proposal,
    packet,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.code === 'MISSING_ATTRIBUTION_ACKNOWLEDGEMENT',
    ),
  );
});

test('ACCEPT must confirm that MotsPet/ELI semantic authority is unchanged', () => {
  const { packet, proposal } = identityProposal();

  const result = evaluateBretagneLanguageReviewDecision(
    decision(proposal, { semanticAuthorityUnchangedConfirmed: false }),
    proposal,
    packet,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.code === 'SEMANTIC_AUTHORITY_CONFIRMATION_REQUIRED',
    ),
  );
});

test('REJECT and REQUEST_CHANGES never create runtime evidence candidates', () => {
  const { packet, proposal } = identityProposal();

  const rejected = evaluateBretagneLanguageReviewDecision(
    decision(proposal, { decision: 'REJECT' }),
    proposal,
    packet,
    NOW,
  );
  assert.equal(rejected.valid, true);
  assert.equal(rejected.runtimeCandidate, null);

  const changes = evaluateBretagneLanguageReviewDecision(
    decision(proposal, {
      decision: 'REQUEST_CHANGES',
      notes: 'Clarify the public origin claim before applying.',
      conditionsAcknowledged: false,
      attributionOrReuseAcknowledged: false,
      semanticAuthorityUnchangedConfirmed: false,
    }),
    proposal,
    packet,
    NOW,
  );
  assert.equal(changes.valid, true);
  assert.equal(changes.runtimeCandidate, null);
});

test('REQUEST_CHANGES requires an explicit reason', () => {
  const { packet, proposal } = identityProposal();

  const result = evaluateBretagneLanguageReviewDecision(
    decision(proposal, {
      decision: 'REQUEST_CHANGES',
      notes: '  ',
    }),
    proposal,
    packet,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) => error.code === 'REQUEST_CHANGES_REQUIRES_NOTES',
    ),
  );
});

test('future/incomplete code-review evidence and automatic apply fail closed', () => {
  const { packet, proposal } = identityProposal();

  const result = evaluateBretagneLanguageReviewDecision(
    decision(proposal, {
      codeReviewerRole: '',
      codeReviewerRef: '',
      decidedAt: '2027-01-01T00:00:00Z',
      decisionEvidenceReference: '',
      automaticApplyAllowed: true as false,
    }),
    proposal,
    packet,
    NOW,
  );

  const codes = result.errors.map((error) => error.code);
  assert.equal(result.valid, false);
  assert.ok(codes.includes('MISSING_CODE_REVIEWER_ROLE'));
  assert.ok(codes.includes('MISSING_CODE_REVIEWER_REF'));
  assert.ok(codes.includes('FUTURE_DECISION_DATE'));
  assert.ok(codes.includes('MISSING_DECISION_EVIDENCE'));
  assert.ok(codes.includes('AUTOMATIC_APPLY_FORBIDDEN'));
});
