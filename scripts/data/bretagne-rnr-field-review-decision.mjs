import { createHash } from 'node:crypto';

export const BRETAGNE_RNR_FIELD_REVIEW_DECISION_REVISION =
  'bretagne-rnr-field-review-decision-v1-2026-10-02';

const ALLOWED_DECISIONS = new Set([
  'ACCEPT',
  'REJECT',
  'REQUEST_CHANGES',
]);

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonFutureIso(value, nowMs) {
  if (!nonEmpty(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed <= nowMs;
}

function normalizedProposalPayload(proposal) {
  return {
    proposalRevision: proposal?.proposalRevision ?? null,
    proposalStatus: proposal?.proposalStatus ?? null,
    canApplyAutomatically: proposal?.canApplyAutomatically ?? null,
    datasetId: proposal?.datasetId ?? null,
    packetRevision: proposal?.packetRevision ?? null,
    responseRevision: proposal?.responseRevision ?? null,
    sourceVersion: proposal?.sourceVersion ?? null,
    schemaFingerprint: proposal?.schemaFingerprint ?? null,
    approvedFields: Array.isArray(proposal?.approvedFields)
      ? [...proposal.approvedFields]
      : [],
    reviewerRole: proposal?.reviewerRole ?? null,
    reviewerRef: proposal?.reviewerRef ?? null,
    reviewedAt: proposal?.reviewedAt ?? null,
    reviewReceipt: proposal?.reviewReceipt ?? null,
    purposeBoundary: proposal?.purposeBoundary ?? null,
    disposition: proposal?.disposition ?? null,
    conditionsOrRestrictions: proposal?.conditionsOrRestrictions ?? '',
    attributionOrNotes: proposal?.attributionOrNotes ?? '',
  };
}

export function fingerprintBretagneRnrFieldApprovalProposal(proposal) {
  const payload = JSON.stringify(normalizedProposalPayload(proposal));
  return (
    'sha256:' +
    createHash('sha256').update(payload, 'utf8').digest('hex')
  );
}

export function buildBretagneRnrFieldReviewDecisionTemplate(proposal) {
  return {
    decisionRevision: BRETAGNE_RNR_FIELD_REVIEW_DECISION_REVISION,
    proposalRevision: proposal?.proposalRevision ?? null,
    proposalFingerprint:
      fingerprintBretagneRnrFieldApprovalProposal(proposal),
    datasetId: proposal?.datasetId ?? null,
    sourceVersion: proposal?.sourceVersion ?? null,
    schemaFingerprint: proposal?.schemaFingerprint ?? null,
    approvedFields: Array.isArray(proposal?.approvedFields)
      ? [...proposal.approvedFields]
      : [],
    decision: 'REQUEST_CHANGES',
    codeReviewerRole: '',
    codeReviewerRef: '',
    decidedAt: '',
    decisionEvidenceReference: '',
    purposeBoundaryConfirmed: false,
    proposalConditionsAcknowledged: false,
    rightsDispositionUnchangedConfirmed: false,
    automaticRuntimeMutationAllowed: false,
    notes: '',
  };
}

export function validateBretagneRnrFieldReviewDecision(
  decision,
  proposal,
  nowMs = Date.now(),
) {
  const errors = [];

  if (!proposal) {
    return ['proposal required'];
  }
  if (proposal.proposalStatus !== 'HUMAN_CODE_REVIEW_REQUIRED') {
    errors.push('proposal must require human code review');
  }
  if (proposal.canApplyAutomatically !== false) {
    errors.push('proposal canApplyAutomatically must be false');
  }

  if (
    decision?.decisionRevision !==
    BRETAGNE_RNR_FIELD_REVIEW_DECISION_REVISION
  ) {
    errors.push('decisionRevision mismatch');
  }
  if (decision?.proposalRevision !== proposal.proposalRevision) {
    errors.push('proposalRevision mismatch');
  }

  const expectedFingerprint =
    fingerprintBretagneRnrFieldApprovalProposal(proposal);
  if (decision?.proposalFingerprint !== expectedFingerprint) {
    errors.push('proposalFingerprint mismatch');
  }

  if (decision?.datasetId !== proposal.datasetId) {
    errors.push('datasetId mismatch');
  }
  if (decision?.sourceVersion !== proposal.sourceVersion) {
    errors.push('sourceVersion mismatch');
  }
  if (decision?.schemaFingerprint !== proposal.schemaFingerprint) {
    errors.push('schemaFingerprint mismatch');
  }

  const decisionFields = Array.isArray(decision?.approvedFields)
    ? decision.approvedFields
    : [];
  const proposalFields = Array.isArray(proposal?.approvedFields)
    ? proposal.approvedFields
    : [];

  if (
    decisionFields.length !== proposalFields.length ||
    !decisionFields.every(
      (field, index) => field === proposalFields[index],
    )
  ) {
    errors.push('approvedFields mismatch');
  }

  if (!ALLOWED_DECISIONS.has(decision?.decision)) {
    errors.push('invalid decision');
  }
  if (!nonEmpty(decision?.codeReviewerRole)) {
    errors.push('codeReviewerRole required');
  }
  if (!nonEmpty(decision?.codeReviewerRef)) {
    errors.push('codeReviewerRef required');
  }
  if (!isNonFutureIso(decision?.decidedAt, nowMs)) {
    errors.push('decidedAt must be valid and non-future');
  }
  if (!nonEmpty(decision?.decisionEvidenceReference)) {
    errors.push('decisionEvidenceReference required');
  }
  if (decision?.automaticRuntimeMutationAllowed === true) {
    errors.push('automaticRuntimeMutationAllowed must never be true');
  }

  if (decision?.decision === 'ACCEPT') {
    if (decision?.purposeBoundaryConfirmed !== true) {
      errors.push('purposeBoundaryConfirmed must be true for ACCEPT');
    }
    if (decision?.rightsDispositionUnchangedConfirmed !== true) {
      errors.push(
        'rightsDispositionUnchangedConfirmed must be true for ACCEPT',
      );
    }
    if (
      proposal.disposition === 'APPROVE_WITH_CONDITIONS' &&
      decision?.proposalConditionsAcknowledged !== true
    ) {
      errors.push(
        'proposalConditionsAcknowledged must be true for conditional approval',
      );
    }
  }

  if (
    decision?.decision === 'REQUEST_CHANGES' &&
    !nonEmpty(decision?.notes)
  ) {
    errors.push('REQUEST_CHANGES requires notes');
  }

  return errors;
}

export function buildBretagneRnrFieldApprovalEvidenceCandidate(
  decision,
  proposal,
) {
  if (decision.decision !== 'ACCEPT') return null;

  return {
    candidateRevision:
      'bretagne-rnr-field-approval-evidence-candidate-v1-2026-10-02',
    candidateStatus: 'MANUAL_RUNTIME_PATCH_REQUIRED',
    canApplyAutomatically: false,
    runtimeMutationAllowed: false,
    datasetStatusTransitionAllowed: false,
    rightsDispositionChangeAllowed: false,
    datasetId: proposal.datasetId,
    approvedFields: [...proposal.approvedFields],
    sourceVersion: proposal.sourceVersion,
    schemaFingerprint: proposal.schemaFingerprint,
    reviewerRole: proposal.reviewerRole,
    reviewerRef: proposal.reviewerRef,
    reviewedAt: proposal.reviewedAt,
    reviewReceipt: proposal.reviewReceipt,
    purposeBoundary: proposal.purposeBoundary,
    proposalDisposition: proposal.disposition,
    proposalConditions: proposal.conditionsOrRestrictions ?? '',
    codeReviewerRole: decision.codeReviewerRole.trim(),
    codeReviewerRef: decision.codeReviewerRef.trim(),
    codeReviewedAt: decision.decidedAt,
    codeReviewReceipt: decision.decisionEvidenceReference.trim(),
    proposalFingerprint:
      fingerprintBretagneRnrFieldApprovalProposal(proposal),
    notes: decision.notes?.trim() ?? '',
  };
}

export function evaluateBretagneRnrFieldReviewDecision(
  decision,
  proposal,
  nowMs = Date.now(),
) {
  const errors = validateBretagneRnrFieldReviewDecision(
    decision,
    proposal,
    nowMs,
  );

  return {
    valid: errors.length === 0,
    errors,
    evidenceCandidate:
      errors.length === 0
        ? buildBretagneRnrFieldApprovalEvidenceCandidate(
            decision,
            proposal,
          )
        : null,
  };
}
