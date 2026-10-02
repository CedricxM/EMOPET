/**
 * Bretagne language review responses.
 *
 * External review evidence is converted into a bounded proposal that a human
 * must still inspect before touching runtime identity/lexicon authority.
 *
 * This module intentionally does not mutate RegionalProfile, RegionalPack or
 * REGIONAL_LEXICON and cannot mark anything VERIFIED automatically.
 */

import {
  BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION,
  buildBretagneLanguageReviewPacket,
  type BretagneLanguageReviewPacket,
  type BretagneReviewRequestedDisposition,
} from './bretagne-language-review-packet';
import type { RegionalLexiconEntry } from './regional-lexicon';

type RegionalLexiconUsage = RegionalLexiconEntry['usage'];

export type BretagneLanguageReviewResponseKind = 'IDENTITY' | 'LEXICON';

export interface BretagneLanguageReviewAuthorityContext {
  candidateId: string;
  organisationName: string;
  relationshipStatus: 'REVIEW_SCOPE_AGREED';
  packetRevision: typeof BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION;
  reviewItemIds: readonly string[];
  scopeAgreementEvidenceRef: string;
  scopeAgreedAt: string;
}

export interface BretagneLanguageReviewResponse {
  packetRevision: typeof BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION;
  itemId: string;
  kind: BretagneLanguageReviewResponseKind;
  disposition: BretagneReviewRequestedDisposition;
  reviewerRole: string;
  reviewerRef: string;
  reviewedAt: string;
  evidenceReference: string;
  approvedMeaningOrClaim: string;
  permittedUsage: string;
  conditionsOrRestrictions: string;
  attributionOrReuseRequirements: string;
}

export type BretagneLanguageReviewResponseErrorCode =
  | 'PACKET_REVISION_MISMATCH'
  | 'NO_AGREED_REVIEW_AUTHORITY'
  | 'AMBIGUOUS_REVIEW_AUTHORITY'
  | 'REVIEW_SCOPE_PACKET_MISMATCH'
  | 'REVIEW_SCOPE_EVIDENCE_MISSING'
  | 'INVALID_SCOPE_AGREEMENT_DATE'
  | 'FUTURE_SCOPE_AGREEMENT_DATE'
  | 'REVIEW_PRECEDES_SCOPE_AGREEMENT'
  | 'UNKNOWN_ITEM'
  | 'KIND_MISMATCH'
  | 'INVALID_REVIEW_DATE'
  | 'FUTURE_REVIEW_DATE'
  | 'MISSING_REVIEWER_ROLE'
  | 'MISSING_REVIEWER_REF'
  | 'MISSING_EVIDENCE_REFERENCE'
  | 'MISSING_APPROVED_MEANING_OR_CLAIM'
  | 'MISSING_PERMITTED_USAGE'
  | 'MISSING_CONDITIONS_FOR_CONDITIONAL_APPROVAL'
  | 'APPROVED_IDENTITY_CLAIM_MISMATCH'
  | 'APPROVED_LEXICON_MEANING_MISMATCH'
  | 'APPROVED_LEXICON_USAGE_MISMATCH';

export interface BretagneLanguageReviewResponseError {
  itemId: string;
  code: BretagneLanguageReviewResponseErrorCode;
  message: string;
}

export interface BretagneIdentityReviewProposal {
  kind: 'IDENTITY';
  itemId: 'bretagne_companion_identity';
  packetRevision: typeof BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION;
  proposalStatus: 'HUMAN_REVIEW_REQUIRED';
  canApplyAutomatically: false;
  disposition: BretagneReviewRequestedDisposition;
  reviewerRole: string;
  reviewerRef: string;
  reviewedAt: string;
  evidenceReference: string;
  authorityCandidateId: string;
  authorityOrganisationName: string;
  scopeAgreementEvidenceRef: string;
  scopeAgreedAt: string;
  exactAssistantName: string;
  exactAssistantNameOrigin: string;
  exactNamingRule: string;
  approvedMeaningOrClaim: string;
  permittedUsage: string;
  conditionsOrRestrictions: string;
  attributionOrReuseRequirements: string;
}

export interface BretagneLexiconReviewProposal {
  kind: 'LEXICON';
  itemId: string;
  packetRevision: typeof BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION;
  proposalStatus: 'HUMAN_REVIEW_REQUIRED';
  canApplyAutomatically: false;
  disposition: BretagneReviewRequestedDisposition;
  reviewerRole: string;
  reviewerRef: string;
  reviewedAt: string;
  evidenceReference: string;
  authorityCandidateId: string;
  authorityOrganisationName: string;
  scopeAgreementEvidenceRef: string;
  scopeAgreedAt: string;
  reviewedTerm: string;
  reviewedMeaningFr: string;
  reviewedUsage: RegionalLexiconUsage;
  reviewedRevision: string;
  approvedMeaningOrClaim: string;
  permittedUsage: string;
  conditionsOrRestrictions: string;
  attributionOrReuseRequirements: string;
}

export type BretagneLanguageReviewProposal =
  | BretagneIdentityReviewProposal
  | BretagneLexiconReviewProposal;

export interface BretagneLanguageReviewResponseResult {
  itemId: string;
  valid: boolean;
  errors: readonly BretagneLanguageReviewResponseError[];
  proposal: BretagneLanguageReviewProposal | null;
}

export interface BretagneLanguageReviewBatchResult {
  packetRevision: typeof BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION;
  expectedItemIds: readonly string[];
  receivedItemIds: readonly string[];
  missingItemIds: readonly string[];
  duplicateItemIds: readonly string[];
  results: readonly BretagneLanguageReviewResponseResult[];
  allReceivedResponsesValid: boolean;
  completeCoverage: boolean;
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function expectedKind(
  itemId: string,
  packet: BretagneLanguageReviewPacket,
): BretagneLanguageReviewResponseKind | null {
  if (itemId === packet.identity.itemId) return 'IDENTITY';
  if (packet.lexicon.some((item) => item.itemId === itemId)) return 'LEXICON';
  return null;
}

function resolveReviewAuthority(
  response: BretagneLanguageReviewResponse,
  authorities: readonly BretagneLanguageReviewAuthorityContext[],
  packet: BretagneLanguageReviewPacket,
  nowMs: number,
): {
  authority: BretagneLanguageReviewAuthorityContext | null;
  errors: BretagneLanguageReviewResponseError[];
} {
  const errors: BretagneLanguageReviewResponseError[] = [];
  const candidates = authorities.filter((authority) =>
    authority.reviewItemIds.includes(response.itemId),
  );

  if (candidates.length === 0) {
    errors.push({
      itemId: response.itemId,
      code: 'NO_AGREED_REVIEW_AUTHORITY',
      message:
        'No REVIEW_SCOPE_AGREED authority covers this exact review item.',
    });
    return { authority: null, errors };
  }

  if (candidates.length > 1) {
    errors.push({
      itemId: response.itemId,
      code: 'AMBIGUOUS_REVIEW_AUTHORITY',
      message:
        'More than one agreed review authority covers this item; explicit authority selection is required.',
    });
    return { authority: null, errors };
  }

  const authority = candidates[0]!;

  if (
    authority.relationshipStatus !== 'REVIEW_SCOPE_AGREED' ||
    authority.packetRevision !== packet.packetRevision ||
    authority.packetRevision !== response.packetRevision
  ) {
    errors.push({
      itemId: response.itemId,
      code: 'REVIEW_SCOPE_PACKET_MISMATCH',
      message:
        'Review authority must bind the same current review packet revision as the response.',
    });
  }

  if (!nonEmpty(authority.scopeAgreementEvidenceRef)) {
    errors.push({
      itemId: response.itemId,
      code: 'REVIEW_SCOPE_EVIDENCE_MISSING',
      message: 'Review-scope agreement evidence reference is required.',
    });
  }

  const scopeAgreedAt = Date.parse(authority.scopeAgreedAt);
  if (!Number.isFinite(scopeAgreedAt)) {
    errors.push({
      itemId: response.itemId,
      code: 'INVALID_SCOPE_AGREEMENT_DATE',
      message: 'Review-scope agreement timestamp must be valid.',
    });
  } else if (scopeAgreedAt > nowMs) {
    errors.push({
      itemId: response.itemId,
      code: 'FUTURE_SCOPE_AGREEMENT_DATE',
      message: 'Review-scope agreement timestamp cannot be in the future.',
    });
  }

  const reviewedAt = Date.parse(response.reviewedAt);
  if (
    Number.isFinite(scopeAgreedAt) &&
    Number.isFinite(reviewedAt) &&
    reviewedAt < scopeAgreedAt
  ) {
    errors.push({
      itemId: response.itemId,
      code: 'REVIEW_PRECEDES_SCOPE_AGREEMENT',
      message:
        'Review evidence cannot predate the agreed review scope for this item.',
    });
  }

  return {
    authority,
    errors,
  };
}

function validateResponse(
  response: BretagneLanguageReviewResponse,
  packet: BretagneLanguageReviewPacket,
  nowMs: number,
): BretagneLanguageReviewResponseError[] {
  const errors: BretagneLanguageReviewResponseError[] = [];
  const push = (
    code: BretagneLanguageReviewResponseErrorCode,
    message: string,
  ) => errors.push({ itemId: response.itemId, code, message });

  if (response.packetRevision !== packet.packetRevision) {
    push(
      'PACKET_REVISION_MISMATCH',
      'Response packet revision does not match the current review packet.',
    );
  }

  const kind = expectedKind(response.itemId, packet);
  if (!kind) {
    push('UNKNOWN_ITEM', 'Response item is not present in the current review packet.');
    return errors;
  }

  if (response.kind !== kind) {
    push('KIND_MISMATCH', 'Response kind does not match the reviewed packet item.');
  }

  if (!nonEmpty(response.reviewerRole)) {
    push('MISSING_REVIEWER_ROLE', 'Reviewer role is required.');
  }
  if (!nonEmpty(response.reviewerRef)) {
    push('MISSING_REVIEWER_REF', 'Reviewer reference is required.');
  }
  if (!nonEmpty(response.evidenceReference)) {
    push('MISSING_EVIDENCE_REFERENCE', 'Controlled evidence reference is required.');
  }
  if (!nonEmpty(response.approvedMeaningOrClaim)) {
    push(
      'MISSING_APPROVED_MEANING_OR_CLAIM',
      'Approved meaning/claim is required.',
    );
  }
  if (!nonEmpty(response.permittedUsage)) {
    push('MISSING_PERMITTED_USAGE', 'Permitted usage is required.');
  }

  const reviewedAt = Date.parse(response.reviewedAt);
  if (!Number.isFinite(reviewedAt)) {
    push('INVALID_REVIEW_DATE', 'Review date must be a valid timestamp.');
  } else if (reviewedAt > nowMs) {
    push('FUTURE_REVIEW_DATE', 'Review date cannot be in the future.');
  }

  if (
    response.disposition === 'APPROVED_WITH_CONDITIONS' &&
    !nonEmpty(response.conditionsOrRestrictions)
  ) {
    push(
      'MISSING_CONDITIONS_FOR_CONDITIONAL_APPROVAL',
      'Conditional approval requires explicit conditions/restrictions.',
    );
  }

  if (
    response.disposition === 'APPROVED' ||
    response.disposition === 'APPROVED_WITH_CONDITIONS'
  ) {
    if (kind === 'IDENTITY') {
      const expectedIdentityClaim = [
        packet.identity.assistantName,
        packet.identity.assistantNameOrigin,
        packet.identity.namingRule,
      ].join(' | ');

      if (response.approvedMeaningOrClaim.trim() !== expectedIdentityClaim) {
        push(
          'APPROVED_IDENTITY_CLAIM_MISMATCH',
          'Approved identity claim must exactly match the packet claim bundle.',
        );
      }
    } else {
      const item = packet.lexicon.find((entry) => entry.itemId === response.itemId)!;

      if (response.approvedMeaningOrClaim.trim() !== item.meaningFr) {
        push(
          'APPROVED_LEXICON_MEANING_MISMATCH',
          'Approved lexicon meaning must exactly match the packet meaning.',
        );
      }
      if (response.permittedUsage.trim() !== item.usage) {
        push(
          'APPROVED_LEXICON_USAGE_MISMATCH',
          'Approved lexicon usage must exactly match the packet usage category.',
        );
      }
    }
  }

  return errors;
}

function buildProposal(
  response: BretagneLanguageReviewResponse,
  authority: BretagneLanguageReviewAuthorityContext,
  packet: BretagneLanguageReviewPacket,
): BretagneLanguageReviewProposal | null {
  if (
    response.disposition !== 'APPROVED' &&
    response.disposition !== 'APPROVED_WITH_CONDITIONS'
  ) {
    return null;
  }

  if (response.itemId === packet.identity.itemId) {
    return {
      kind: 'IDENTITY',
      itemId: 'bretagne_companion_identity',
      packetRevision: packet.packetRevision,
      proposalStatus: 'HUMAN_REVIEW_REQUIRED',
      canApplyAutomatically: false,
      disposition: response.disposition,
      reviewerRole: response.reviewerRole.trim(),
      reviewerRef: response.reviewerRef.trim(),
      reviewedAt: response.reviewedAt,
      evidenceReference: response.evidenceReference.trim(),
      authorityCandidateId: authority.candidateId,
      authorityOrganisationName: authority.organisationName,
      scopeAgreementEvidenceRef: authority.scopeAgreementEvidenceRef,
      scopeAgreedAt: authority.scopeAgreedAt,
      exactAssistantName: packet.identity.assistantName,
      exactAssistantNameOrigin: packet.identity.assistantNameOrigin,
      exactNamingRule: packet.identity.namingRule,
      approvedMeaningOrClaim: response.approvedMeaningOrClaim.trim(),
      permittedUsage: response.permittedUsage.trim(),
      conditionsOrRestrictions: response.conditionsOrRestrictions.trim(),
      attributionOrReuseRequirements:
        response.attributionOrReuseRequirements.trim(),
    };
  }

  const item = packet.lexicon.find((entry) => entry.itemId === response.itemId);
  if (!item) return null;

  return {
    kind: 'LEXICON',
    itemId: item.itemId,
    packetRevision: packet.packetRevision,
    proposalStatus: 'HUMAN_REVIEW_REQUIRED',
    canApplyAutomatically: false,
    disposition: response.disposition,
    reviewerRole: response.reviewerRole.trim(),
    reviewerRef: response.reviewerRef.trim(),
    reviewedAt: response.reviewedAt,
    evidenceReference: response.evidenceReference.trim(),
    authorityCandidateId: authority.candidateId,
    authorityOrganisationName: authority.organisationName,
    scopeAgreementEvidenceRef: authority.scopeAgreementEvidenceRef,
    scopeAgreedAt: authority.scopeAgreedAt,
    reviewedTerm: item.term,
    reviewedMeaningFr: item.meaningFr,
    reviewedUsage: item.usage as RegionalLexiconUsage,
    reviewedRevision: item.lexiconRevision,
    approvedMeaningOrClaim: response.approvedMeaningOrClaim.trim(),
    permittedUsage: response.permittedUsage.trim(),
    conditionsOrRestrictions: response.conditionsOrRestrictions.trim(),
    attributionOrReuseRequirements:
      response.attributionOrReuseRequirements.trim(),
  };
}

export function evaluateBretagneLanguageReviewResponse(
  response: BretagneLanguageReviewResponse,
  authorities: readonly BretagneLanguageReviewAuthorityContext[],
  packet: BretagneLanguageReviewPacket = buildBretagneLanguageReviewPacket(),
  nowMs: number = Date.now(),
): BretagneLanguageReviewResponseResult {
  const authorityResolution = resolveReviewAuthority(
    response,
    authorities,
    packet,
    nowMs,
  );

  if (!authorityResolution.authority) {
    return {
      itemId: response.itemId,
      valid: false,
      errors: authorityResolution.errors,
      proposal: null,
    };
  }

  const errors = [
    ...authorityResolution.errors,
    ...validateResponse(response, packet, nowMs),
  ];

  return {
    itemId: response.itemId,
    valid: errors.length === 0,
    errors,
    proposal:
      errors.length === 0
        ? buildProposal(response, authorityResolution.authority, packet)
        : null,
  };
}

export function evaluateBretagneLanguageReviewResponses(
  responses: readonly BretagneLanguageReviewResponse[],
  authorities: readonly BretagneLanguageReviewAuthorityContext[],
  packet: BretagneLanguageReviewPacket = buildBretagneLanguageReviewPacket(),
  nowMs: number = Date.now(),
): BretagneLanguageReviewBatchResult {
  const expectedItemIds = [
    packet.identity.itemId,
    ...packet.lexicon.map((item) => item.itemId),
  ];
  const receivedItemIds = responses.map((response) => response.itemId);

  const counts = new Map<string, number>();
  for (const itemId of receivedItemIds) {
    counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
  }

  const duplicateItemIds = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([itemId]) => itemId);
  const receivedSet = new Set(receivedItemIds);
  const missingItemIds = expectedItemIds.filter((itemId) => !receivedSet.has(itemId));

  const results = responses.map((response) =>
    evaluateBretagneLanguageReviewResponse(
      response,
      authorities,
      packet,
      nowMs,
    ),
  );

  return {
    packetRevision: packet.packetRevision,
    expectedItemIds,
    receivedItemIds,
    missingItemIds,
    duplicateItemIds,
    results,
    allReceivedResponsesValid:
      duplicateItemIds.length === 0 && results.every((result) => result.valid),
    completeCoverage:
      duplicateItemIds.length === 0 &&
      missingItemIds.length === 0 &&
      results.every((result) => result.valid),
  };
}
