import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const REGISTER_PATH =
  'data/registry/receipts/bretagne-rnr-licence-clarification-v1.json';

export const BRETAGNE_RNR_LICENCE_RESPONSE_REVISION =
  'bretagne-rnr-licence-response-v1-2026-10-02';

export const BRETAGNE_RNR_LICENCE_DECISION_REVISION =
  'bretagne-rnr-licence-decision-v1-2026-10-02';

const DATASET_ID = 'reserves-naturelles-regionales-de-bretagne';

const ALLOWED_EVIDENCE_KINDS = new Set([
  'PRIMARY_PUBLISHER_REPLY',
  'CORRECTED_PRIMARY_METADATA',
]);

const ALLOWED_LEGACY_POINTER_STATES = new Set([
  'STALE_METADATA',
  'INTENDED_LEGAL_CODE_POINTER',
]);

const ALLOWED_DECISIONS = new Set([
  'ACCEPT',
  'REJECT',
  'REQUEST_CHANGES',
]);

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validNonFutureIso(value, nowMs) {
  if (!nonEmpty(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed <= nowMs;
}

function stableProposalPayload(proposal) {
  return {
    proposalRevision: proposal?.proposalRevision ?? null,
    proposalStatus: proposal?.proposalStatus ?? null,
    canApplyAutomatically: proposal?.canApplyAutomatically ?? null,
    datasetId: proposal?.datasetId ?? null,
    sourceVersion: proposal?.sourceVersion ?? null,
    evidenceKind: proposal?.evidenceKind ?? null,
    authorityType: proposal?.authorityType ?? null,
    authorityEvidenceRef: proposal?.authorityEvidenceRef ?? null,
    authorityRole: proposal?.authorityRole ?? null,
    authorityRef: proposal?.authorityRef ?? null,
    confirmedAt: proposal?.confirmedAt ?? null,
    applicableLicenceVersion: proposal?.applicableLicenceVersion ?? null,
    legacyPdfStatus: proposal?.legacyPdfStatus ?? null,
    attributionRequirement: proposal?.attributionRequirement ?? null,
    lastUpdateDisplayRequirement:
      proposal?.lastUpdateDisplayRequirement ?? null,
    additionalPortalOrServiceConditions:
      proposal?.additionalPortalOrServiceConditions ?? null,
  };
}

export function fingerprintBretagneRnrLicenceProposal(proposal) {
  return (
    'sha256:' +
    createHash('sha256')
      .update(JSON.stringify(stableProposalPayload(proposal)), 'utf8')
      .digest('hex')
  );
}

export function validateBretagneRnrLicenceClarificationResponse(
  response,
  register,
  nowMs = Date.now(),
) {
  const errors = [];

  if (response?.responseRevision !== BRETAGNE_RNR_LICENCE_RESPONSE_REVISION) {
    errors.push('responseRevision mismatch');
  }
  if (response?.datasetId !== DATASET_ID || response?.datasetId !== register?.datasetId) {
    errors.push('datasetId mismatch');
  }
  if (response?.sourceVersion !== register?.sourceVersion) {
    errors.push('sourceVersion mismatch');
  }
  if (!ALLOWED_EVIDENCE_KINDS.has(response?.evidenceKind)) {
    errors.push('invalid evidenceKind');
  }
  if (response?.authorityType !== 'PRIMARY_PUBLISHER_CONFIRMATION') {
    errors.push('authorityType must be PRIMARY_PUBLISHER_CONFIRMATION');
  }
  if (!nonEmpty(response?.authorityEvidenceRef)) {
    errors.push('authorityEvidenceRef required');
  }
  if (!nonEmpty(response?.authorityRole)) {
    errors.push('authorityRole required');
  }
  if (!nonEmpty(response?.authorityRef)) {
    errors.push('authorityRef required');
  }
  if (!validNonFutureIso(response?.confirmedAt, nowMs)) {
    errors.push('confirmedAt must be valid and non-future');
  }
  if (!['1.0', '2.0'].includes(response?.applicableLicenceVersion)) {
    errors.push('applicableLicenceVersion must be 1.0 or 2.0');
  }
  if (!ALLOWED_LEGACY_POINTER_STATES.has(response?.legacyPdfStatus)) {
    errors.push('legacyPdfStatus must resolve the legacy pointer');
  }
  if (!nonEmpty(response?.attributionRequirement)) {
    errors.push('attributionRequirement required');
  }
  if (!nonEmpty(response?.lastUpdateDisplayRequirement)) {
    errors.push('lastUpdateDisplayRequirement required');
  }
  if (!nonEmpty(response?.additionalPortalOrServiceConditions)) {
    errors.push('additionalPortalOrServiceConditions required');
  }
  if (response?.automaticApplyAllowed === true) {
    errors.push('automaticApplyAllowed must never be true');
  }

  if (
    register?.reconciliationState !==
    'HOLD_AUTHORITATIVE_CLARIFICATION_REQUIRED'
  ) {
    errors.push('current register must still be HOLD clarification state');
  }
  if (register?.runtimeRightsDisposition !== 'HOLD') {
    errors.push('current register runtimeRightsDisposition must be HOLD');
  }
  if (register?.releaseAllowed !== false) {
    errors.push('current register releaseAllowed must be false');
  }
  if (register?.authoritativeConfirmation !== null) {
    errors.push('current register must not already have authoritativeConfirmation');
  }

  return errors;
}

export function buildBretagneRnrLicenceClarificationProposal(
  response,
  register,
) {
  return {
    proposalRevision:
      'bretagne-rnr-licence-clarification-proposal-v1-2026-10-02',
    proposalStatus: 'HUMAN_CODE_REVIEW_REQUIRED',
    canApplyAutomatically: false,
    datasetId: register.datasetId,
    sourceVersion: register.sourceVersion,
    evidenceKind: response.evidenceKind,
    authorityType: response.authorityType,
    authorityEvidenceRef: response.authorityEvidenceRef.trim(),
    authorityRole: response.authorityRole.trim(),
    authorityRef: response.authorityRef.trim(),
    confirmedAt: response.confirmedAt,
    applicableLicenceVersion: response.applicableLicenceVersion,
    legacyPdfStatus: response.legacyPdfStatus,
    attributionRequirement: response.attributionRequirement.trim(),
    lastUpdateDisplayRequirement:
      response.lastUpdateDisplayRequirement.trim(),
    additionalPortalOrServiceConditions:
      response.additionalPortalOrServiceConditions.trim(),
    sourceRightsOnly: true,
    fieldApprovalUnchanged: true,
    schemaEvidenceUnchanged: true,
    runtimeIngestionUnchanged: true,
    partnershipStatusUnchanged: true,
  };
}

export function evaluateBretagneRnrLicenceClarificationResponse(
  response,
  register,
  nowMs = Date.now(),
) {
  const errors = validateBretagneRnrLicenceClarificationResponse(
    response,
    register,
    nowMs,
  );

  return {
    valid: errors.length === 0,
    errors,
    proposal:
      errors.length === 0
        ? buildBretagneRnrLicenceClarificationProposal(response, register)
        : null,
  };
}

export function validateBretagneRnrLicenceDecision(
  decision,
  proposal,
  register,
  nowMs = Date.now(),
) {
  const errors = [];

  if (!proposal) return ['proposal required'];

  if (
    proposal.proposalStatus !== 'HUMAN_CODE_REVIEW_REQUIRED' ||
    proposal.canApplyAutomatically !== false
  ) {
    errors.push('proposal must require human code review');
  }
  if (
    decision?.decisionRevision !== BRETAGNE_RNR_LICENCE_DECISION_REVISION
  ) {
    errors.push('decisionRevision mismatch');
  }
  if (decision?.proposalRevision !== proposal.proposalRevision) {
    errors.push('proposalRevision mismatch');
  }

  const expectedFingerprint = fingerprintBretagneRnrLicenceProposal(proposal);
  if (decision?.proposalFingerprint !== expectedFingerprint) {
    errors.push('proposalFingerprint mismatch');
  }

  if (decision?.datasetId !== proposal.datasetId) {
    errors.push('datasetId mismatch');
  }
  if (
    decision?.sourceVersion !== proposal.sourceVersion ||
    proposal.sourceVersion !== register?.sourceVersion
  ) {
    errors.push('sourceVersion mismatch');
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
  if (!validNonFutureIso(decision?.decidedAt, nowMs)) {
    errors.push('decidedAt must be valid and non-future');
  }
  if (!nonEmpty(decision?.decisionEvidenceReference)) {
    errors.push('decisionEvidenceReference required');
  }
  if (decision?.automaticApplyAllowed === true) {
    errors.push('automaticApplyAllowed must never be true');
  }

  if (decision?.decision === 'ACCEPT') {
    if (decision?.fieldApprovalUnchangedConfirmed !== true) {
      errors.push('fieldApprovalUnchangedConfirmed must be true for ACCEPT');
    }
    if (decision?.schemaEvidenceUnchangedConfirmed !== true) {
      errors.push('schemaEvidenceUnchangedConfirmed must be true for ACCEPT');
    }
    if (decision?.runtimeIngestionStillBlockedConfirmed !== true) {
      errors.push(
        'runtimeIngestionStillBlockedConfirmed must be true for ACCEPT',
      );
    }
    if (decision?.partnershipStatusUnchangedConfirmed !== true) {
      errors.push(
        'partnershipStatusUnchangedConfirmed must be true for ACCEPT',
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

export function buildBretagneRnrLicenceRegisterPatchCandidate(
  decision,
  proposal,
) {
  if (decision.decision !== 'ACCEPT') return null;

  return {
    candidateRevision:
      'bretagne-rnr-licence-register-patch-candidate-v1-2026-10-02',
    candidateStatus: 'MANUAL_RUNTIME_PATCH_REQUIRED',
    canApplyAutomatically: false,
    runtimeIngestionAllowed: false,
    fieldApprovalChangeAllowed: false,
    schemaEvidenceChangeAllowed: false,
    partnershipClaimAllowed: false,
    datasetId: proposal.datasetId,
    sourceVersion: proposal.sourceVersion,
    registerPatch: {
      reconciliationState: 'CONFIRMED',
      runtimeRightsDisposition: 'GO',
      releaseAllowed: true,
      authoritativeConfirmation: {
        authorityType: 'PRIMARY_PUBLISHER_CONFIRMATION',
        evidenceRef: proposal.authorityEvidenceRef,
        confirmedAt: proposal.confirmedAt,
        confirmedByRole: proposal.authorityRole,
        confirmedByRef: proposal.authorityRef,
        applicableLicenceVersion: proposal.applicableLicenceVersion,
        attributionRequirement: proposal.attributionRequirement,
        lastUpdateDisplayRequirement:
          proposal.lastUpdateDisplayRequirement,
        additionalPortalOrServiceConditions:
          proposal.additionalPortalOrServiceConditions,
        legacyPdfStatus: proposal.legacyPdfStatus,
        appliesToSourceVersion: proposal.sourceVersion,
      },
    },
    codeReview: {
      reviewerRole: decision.codeReviewerRole.trim(),
      reviewerRef: decision.codeReviewerRef.trim(),
      decidedAt: decision.decidedAt,
      decisionReceipt: decision.decisionEvidenceReference.trim(),
    },
  };
}

export function evaluateBretagneRnrLicenceDecision(
  decision,
  proposal,
  register,
  nowMs = Date.now(),
) {
  const errors = validateBretagneRnrLicenceDecision(
    decision,
    proposal,
    register,
    nowMs,
  );

  return {
    valid: errors.length === 0,
    errors,
    registerPatchCandidate:
      errors.length === 0
        ? buildBretagneRnrLicenceRegisterPatchCandidate(decision, proposal)
        : null,
  };
}

export async function readBretagneRnrLicenceClarificationRegister(
  path = REGISTER_PATH,
) {
  return JSON.parse(await readFile(path, 'utf8'));
}
