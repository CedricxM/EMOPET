import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BRETAGNE_RNR_FIELD_REVIEW_DECISION_REVISION,
  buildBretagneRnrFieldReviewDecisionTemplate,
  evaluateBretagneRnrFieldReviewDecision,
  fingerprintBretagneRnrFieldApprovalProposal,
} from './bretagne-rnr-field-review-decision.mjs';

const NOW = Date.parse('2026-10-02T08:30:00Z');

function proposal(overrides = {}) {
  return {
    proposalRevision:
      'bretagne-rnr-field-approval-proposal-v1-2026-10-02',
    proposalStatus: 'HUMAN_CODE_REVIEW_REQUIRED',
    canApplyAutomatically: false,
    datasetId: 'reserves-naturelles-regionales-de-bretagne',
    packetRevision: 'bretagne-rnr-field-review-packet-v1-2026-10-02',
    responseRevision:
      'bretagne-rnr-field-review-response-v1-2026-10-02',
    sourceVersion: 'dataset-source-version-v1',
    schemaFingerprint: 'sha256:fixture-schema',
    approvedFields: ['id', 'nom', 'geo_point_2d'],
    reviewerRole: 'product/data reviewer',
    reviewerRef: 'CONTROLLED_REVIEWER_REF',
    reviewedAt: '2026-10-02T07:30:00Z',
    reviewReceipt: 'CONTROLLED_FIELD_REVIEW_RECEIPT',
    purposeBoundary:
      'Territorial context only; no dog access, leash, opening-hour, safety or dog-friendliness claims.',
    disposition: 'APPROVE',
    conditionsOrRestrictions: '',
    attributionOrNotes: '',
    ...overrides,
  };
}

function acceptedDecision(p = proposal(), overrides = {}) {
  return {
    decisionRevision: BRETAGNE_RNR_FIELD_REVIEW_DECISION_REVISION,
    proposalRevision: p.proposalRevision,
    proposalFingerprint:
      fingerprintBretagneRnrFieldApprovalProposal(p),
    datasetId: p.datasetId,
    sourceVersion: p.sourceVersion,
    schemaFingerprint: p.schemaFingerprint,
    approvedFields: [...p.approvedFields],
    decision: 'ACCEPT',
    codeReviewerRole: 'maintainer / data-control reviewer',
    codeReviewerRef: 'CONTROLLED_CODE_REVIEWER_REF',
    decidedAt: '2026-10-02T08:00:00Z',
    decisionEvidenceReference: 'CONTROLLED_CODE_REVIEW_RECEIPT',
    purposeBoundaryConfirmed: true,
    proposalConditionsAcknowledged: true,
    rightsDispositionUnchangedConfirmed: true,
    automaticRuntimeMutationAllowed: false,
    notes: 'Reviewed against current packet and proposal.',
    ...overrides,
  };
}

test('decision template is non-applying and defaults to request changes', () => {
  const p = proposal();
  const template = buildBretagneRnrFieldReviewDecisionTemplate(p);

  assert.equal(template.decision, 'REQUEST_CHANGES');
  assert.equal(template.automaticRuntimeMutationAllowed, false);
  assert.equal(template.purposeBoundaryConfirmed, false);
  assert.equal(template.rightsDispositionUnchangedConfirmed, false);
  assert.equal(
    template.proposalFingerprint,
    fingerprintBretagneRnrFieldApprovalProposal(p),
  );
});

test('exact ACCEPT yields only a manual runtime evidence candidate', () => {
  const p = proposal();
  const result = evaluateBretagneRnrFieldReviewDecision(
    acceptedDecision(p),
    p,
    NOW,
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.ok(result.evidenceCandidate);
  assert.equal(
    result.evidenceCandidate.candidateStatus,
    'MANUAL_RUNTIME_PATCH_REQUIRED',
  );
  assert.equal(result.evidenceCandidate.canApplyAutomatically, false);
  assert.equal(result.evidenceCandidate.runtimeMutationAllowed, false);
  assert.equal(result.evidenceCandidate.datasetStatusTransitionAllowed, false);
  assert.equal(result.evidenceCandidate.rightsDispositionChangeAllowed, false);
  assert.deepEqual(result.evidenceCandidate.approvedFields, p.approvedFields);
  assert.equal(result.evidenceCandidate.sourceVersion, p.sourceVersion);
  assert.equal(
    result.evidenceCandidate.schemaFingerprint,
    p.schemaFingerprint,
  );
});

test('proposal drift after human response invalidates the decision fingerprint', () => {
  const p = proposal();
  const decision = acceptedDecision(p);
  const changed = proposal({ approvedFields: ['id', 'nom'] });

  const result = evaluateBretagneRnrFieldReviewDecision(
    decision,
    changed,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.equal(result.evidenceCandidate, null);
  assert.ok(result.errors.includes('proposalFingerprint mismatch'));
  assert.ok(result.errors.includes('approvedFields mismatch'));
});

test('decision cannot alter dataset/source/schema or approved field order', () => {
  const p = proposal();
  const result = evaluateBretagneRnrFieldReviewDecision(
    acceptedDecision(p, {
      datasetId: 'different-dataset',
      sourceVersion: 'different-source',
      schemaFingerprint: 'sha256:different-schema',
      approvedFields: ['nom', 'id', 'geo_point_2d'],
    }),
    p,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('datasetId mismatch'));
  assert.ok(result.errors.includes('sourceVersion mismatch'));
  assert.ok(result.errors.includes('schemaFingerprint mismatch'));
  assert.ok(result.errors.includes('approvedFields mismatch'));
});

test('ACCEPT requires purpose boundary and unchanged-rights confirmation', () => {
  const p = proposal();
  const result = evaluateBretagneRnrFieldReviewDecision(
    acceptedDecision(p, {
      purposeBoundaryConfirmed: false,
      rightsDispositionUnchangedConfirmed: false,
    }),
    p,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes(
      'purposeBoundaryConfirmed must be true for ACCEPT',
    ),
  );
  assert.ok(
    result.errors.includes(
      'rightsDispositionUnchangedConfirmed must be true for ACCEPT',
    ),
  );
});

test('conditional approval must be explicitly acknowledged by code reviewer', () => {
  const p = proposal({
    disposition: 'APPROVE_WITH_CONDITIONS',
    conditionsOrRestrictions: 'Use only for map context.',
  });

  const result = evaluateBretagneRnrFieldReviewDecision(
    acceptedDecision(p, {
      proposalConditionsAcknowledged: false,
    }),
    p,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes(
      'proposalConditionsAcknowledged must be true for conditional approval',
    ),
  );
});

test('REJECT and REQUEST_CHANGES never create field-approval evidence candidates', () => {
  const p = proposal();

  const rejected = evaluateBretagneRnrFieldReviewDecision(
    acceptedDecision(p, { decision: 'REJECT' }),
    p,
    NOW,
  );
  assert.equal(rejected.valid, true);
  assert.equal(rejected.evidenceCandidate, null);

  const changes = evaluateBretagneRnrFieldReviewDecision(
    acceptedDecision(p, {
      decision: 'REQUEST_CHANGES',
      notes: 'Narrow the field set to id + nom.',
      purposeBoundaryConfirmed: false,
      rightsDispositionUnchangedConfirmed: false,
    }),
    p,
    NOW,
  );
  assert.equal(changes.valid, true);
  assert.equal(changes.evidenceCandidate, null);
});

test('REQUEST_CHANGES requires a reason', () => {
  const p = proposal();
  const result = evaluateBretagneRnrFieldReviewDecision(
    acceptedDecision(p, {
      decision: 'REQUEST_CHANGES',
      notes: '   ',
      purposeBoundaryConfirmed: false,
      rightsDispositionUnchangedConfirmed: false,
    }),
    p,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('REQUEST_CHANGES requires notes'));
});

test('future or incomplete code-review evidence fails closed', () => {
  const p = proposal();
  const result = evaluateBretagneRnrFieldReviewDecision(
    acceptedDecision(p, {
      codeReviewerRole: '',
      codeReviewerRef: '',
      decidedAt: '2027-01-01T00:00:00Z',
      decisionEvidenceReference: '',
    }),
    p,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('codeReviewerRole required'));
  assert.ok(result.errors.includes('codeReviewerRef required'));
  assert.ok(
    result.errors.includes('decidedAt must be valid and non-future'),
  );
  assert.ok(result.errors.includes('decisionEvidenceReference required'));
});

test('automatic runtime mutation can never be enabled by a human decision record', () => {
  const p = proposal();
  const result = evaluateBretagneRnrFieldReviewDecision(
    acceptedDecision(p, {
      automaticRuntimeMutationAllowed: true,
    }),
    p,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes(
      'automaticRuntimeMutationAllowed must never be true',
    ),
  );
});
