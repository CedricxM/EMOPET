import {
  BRETAGNE_RNR_FIELD_REVIEW_PACKET_REVISION,
  buildBretagneRnrFieldReviewPacketFromFile,
} from './bretagne-rnr-field-review-packet.mjs';

export const BRETAGNE_RNR_FIELD_REVIEW_RESPONSE_REVISION =
  'bretagne-rnr-field-review-response-v1-2026-10-02';

const ALLOWED_DISPOSITIONS = new Set([
  'APPROVE',
  'REJECT',
  'APPROVE_WITH_CONDITIONS',
]);

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonFutureIso(value, nowMs) {
  if (!nonEmpty(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed <= nowMs;
}

export function validateBretagneRnrFieldReviewResponse(
  response,
  packet,
  nowMs = Date.now(),
) {
  const errors = [];

  if (
    response?.responseRevision !==
    BRETAGNE_RNR_FIELD_REVIEW_RESPONSE_REVISION
  ) {
    errors.push('responseRevision mismatch');
  }
  if (response?.packetRevision !== packet?.packetRevision) {
    errors.push('packetRevision mismatch');
  }
  if (response?.datasetId !== packet?.datasetId) {
    errors.push('datasetId mismatch');
  }
  if (response?.sourceVersion !== packet?.sourceVersion) {
    errors.push('sourceVersion mismatch');
  }
  if (response?.schemaFingerprint !== packet?.schemaFingerprint) {
    errors.push('schemaFingerprint mismatch');
  }
  if (!ALLOWED_DISPOSITIONS.has(response?.disposition)) {
    errors.push('invalid disposition');
  }
  if (!nonEmpty(response?.reviewerRole)) {
    errors.push('reviewerRole required');
  }
  if (!nonEmpty(response?.reviewerRef)) {
    errors.push('reviewerRef required');
  }
  if (!isNonFutureIso(response?.reviewedAt, nowMs)) {
    errors.push('reviewedAt must be valid and non-future');
  }
  if (!nonEmpty(response?.evidenceReference)) {
    errors.push('evidenceReference required');
  }
  if (response?.purposeBoundaryConfirmed !== true) {
    errors.push('purposeBoundaryConfirmed must be true');
  }

  const candidateNames = Array.isArray(packet?.candidateFields)
    ? packet.candidateFields.map((field) => field.name)
    : [];
  const approvedFields = Array.isArray(response?.approvedFields)
    ? response.approvedFields
    : [];

  if (new Set(approvedFields).size !== approvedFields.length) {
    errors.push('approvedFields must be unique');
  }
  if (approvedFields.some((field) => !candidateNames.includes(field))) {
    errors.push('approvedFields must be a subset of packet candidate fields');
  }

  if (
    (response?.disposition === 'APPROVE' ||
      response?.disposition === 'APPROVE_WITH_CONDITIONS') &&
    approvedFields.length === 0
  ) {
    errors.push('approval requires at least one approved field');
  }

  if (
    response?.disposition === 'APPROVE_WITH_CONDITIONS' &&
    !nonEmpty(response?.conditionsOrRestrictions)
  ) {
    errors.push('conditional approval requires conditionsOrRestrictions');
  }

  if (
    response?.disposition === 'REJECT' &&
    approvedFields.length > 0
  ) {
    errors.push('rejection must not carry approved fields');
  }

  if (response?.automaticApplyAllowed === true) {
    errors.push('automaticApplyAllowed must never be true');
  }

  return errors;
}

export function buildBretagneRnrFieldApprovalProposal(response, packet) {
  if (
    response.disposition !== 'APPROVE' &&
    response.disposition !== 'APPROVE_WITH_CONDITIONS'
  ) {
    return null;
  }

  return {
    proposalRevision: 'bretagne-rnr-field-approval-proposal-v1-2026-10-02',
    proposalStatus: 'HUMAN_CODE_REVIEW_REQUIRED',
    canApplyAutomatically: false,
    datasetId: packet.datasetId,
    packetRevision: packet.packetRevision,
    responseRevision: response.responseRevision,
    sourceVersion: packet.sourceVersion,
    schemaFingerprint: packet.schemaFingerprint,
    approvedFields: [...response.approvedFields],
    reviewerRole: response.reviewerRole.trim(),
    reviewerRef: response.reviewerRef.trim(),
    reviewedAt: response.reviewedAt,
    reviewReceipt: response.evidenceReference.trim(),
    purposeBoundary: packet.purposeBoundary,
    disposition: response.disposition,
    conditionsOrRestrictions:
      response.conditionsOrRestrictions?.trim() ?? '',
    attributionOrNotes:
      response.attributionOrNotes?.trim() ?? '',
  };
}

export function evaluateBretagneRnrFieldReviewResponse(
  response,
  packet,
  nowMs = Date.now(),
) {
  const errors = validateBretagneRnrFieldReviewResponse(
    response,
    packet,
    nowMs,
  );

  return {
    valid: errors.length === 0,
    errors,
    proposal:
      errors.length === 0
        ? buildBretagneRnrFieldApprovalProposal(response, packet)
        : null,
  };
}

export async function evaluateBretagneRnrFieldReviewResponseAgainstCurrentPacket(
  response,
  nowMs = Date.now(),
) {
  const packet = await buildBretagneRnrFieldReviewPacketFromFile();
  return evaluateBretagneRnrFieldReviewResponse(response, packet, nowMs);
}
