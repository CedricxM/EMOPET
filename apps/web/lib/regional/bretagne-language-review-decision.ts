/**
 * Human repository decision gate for Bretagne language-review proposals.
 *
 * External review creates a bounded proposal. This layer requires a separate
 * human repository/code-review decision before any runtime identity or
 * regional-lexicon evidence can be considered for manual application.
 *
 * Nothing in this module mutates runtime authority.
 */

import {
  buildBretagneLanguageReviewPacket,
  type BretagneLanguageReviewPacket,
} from './bretagne-language-review-packet';
import type {
  BretagneIdentityReviewProposal,
  BretagneLanguageReviewProposal,
  BretagneLexiconReviewProposal,
} from './bretagne-language-review-response';

export const BRETAGNE_LANGUAGE_REVIEW_DECISION_REVISION =
  'bretagne-language-review-decision-v1-2026-10-02' as const;

export type BretagneLanguageReviewDecisionDisposition =
  | 'ACCEPT'
  | 'REJECT'
  | 'REQUEST_CHANGES';

export interface BretagneLanguageReviewDecision {
  decisionRevision: typeof BRETAGNE_LANGUAGE_REVIEW_DECISION_REVISION;
  packetRevision: string;
  itemId: string;
  kind: 'IDENTITY' | 'LEXICON';
  decision: BretagneLanguageReviewDecisionDisposition;
  codeReviewerRole: string;
  codeReviewerRef: string;
  decidedAt: string;
  decisionEvidenceReference: string;
  conditionsAcknowledged: boolean;
  attributionOrReuseAcknowledged: boolean;
  semanticAuthorityUnchangedConfirmed: boolean;
  automaticApplyAllowed: false;
  notes: string;
}

export type BretagneLanguageReviewDecisionErrorCode =
  | 'PROPOSAL_NOT_HUMAN_REVIEW_ONLY'
  | 'PACKET_REVISION_MISMATCH'
  | 'ITEM_ID_MISMATCH'
  | 'KIND_MISMATCH'
  | 'RUNTIME_IDENTITY_DRIFT'
  | 'RUNTIME_LEXICON_DRIFT'
  | 'INVALID_DECISION'
  | 'MISSING_CODE_REVIEWER_ROLE'
  | 'MISSING_CODE_REVIEWER_REF'
  | 'INVALID_DECISION_DATE'
  | 'FUTURE_DECISION_DATE'
  | 'MISSING_DECISION_EVIDENCE'
  | 'MISSING_CONDITIONS_ACKNOWLEDGEMENT'
  | 'MISSING_ATTRIBUTION_ACKNOWLEDGEMENT'
  | 'SEMANTIC_AUTHORITY_CONFIRMATION_REQUIRED'
  | 'REQUEST_CHANGES_REQUIRES_NOTES'
  | 'AUTOMATIC_APPLY_FORBIDDEN';

export interface BretagneLanguageReviewDecisionError {
  itemId: string;
  code: BretagneLanguageReviewDecisionErrorCode;
  message: string;
}

export interface BretagneIdentityRuntimeEvidenceCandidate {
  kind: 'IDENTITY';
  itemId: 'bretagne_companion_identity';
  candidateStatus: 'MANUAL_RUNTIME_PATCH_REQUIRED';
  canApplyAutomatically: false;
  semanticAuthorityChangeAllowed: false;
  profileMutationAllowedAutomatically: false;
  identityEvidence: {
    status: 'VERIFIED';
    exactAssistantName: string;
    exactAssistantNameOrigin: string;
    exactNamingRule: string;
    reviewerRole: string;
    reviewerRef: string;
    reviewedAt: string;
    reviewReceipt: string;
    note: string;
  };
  codeReview: {
    reviewerRole: string;
    reviewerRef: string;
    decidedAt: string;
    decisionReceipt: string;
  };
}

export interface BretagneLexiconRuntimeEvidenceCandidate {
  kind: 'LEXICON';
  itemId: string;
  candidateStatus: 'MANUAL_RUNTIME_PATCH_REQUIRED';
  canApplyAutomatically: false;
  semanticAuthorityChangeAllowed: false;
  lexiconMutationAllowedAutomatically: false;
  lexiconEvidence: {
    status: 'VERIFIED';
    reviewer: string;
    reviewedAt: string;
    reviewReceipt: string;
    reviewedTerm: string;
    reviewedMeaningFr: string;
    reviewedUsage: BretagneLexiconReviewProposal['reviewedUsage'];
    reviewedRevision: string;
  };
  codeReview: {
    reviewerRole: string;
    reviewerRef: string;
    decidedAt: string;
    decisionReceipt: string;
  };
}

export type BretagneLanguageRuntimeEvidenceCandidate =
  | BretagneIdentityRuntimeEvidenceCandidate
  | BretagneLexiconRuntimeEvidenceCandidate;

export interface BretagneLanguageReviewDecisionResult {
  valid: boolean;
  errors: readonly BretagneLanguageReviewDecisionError[];
  runtimeCandidate: BretagneLanguageRuntimeEvidenceCandidate | null;
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function proposalMatchesCurrentRuntime(
  proposal: BretagneLanguageReviewProposal,
  packet: BretagneLanguageReviewPacket,
): BretagneLanguageReviewDecisionError | null {
  if (proposal.kind === 'IDENTITY') {
    const matches =
      proposal.itemId === packet.identity.itemId &&
      proposal.exactAssistantName === packet.identity.assistantName &&
      proposal.exactAssistantNameOrigin ===
        packet.identity.assistantNameOrigin &&
      proposal.exactNamingRule === packet.identity.namingRule;

    return matches
      ? null
      : {
          itemId: proposal.itemId,
          code: 'RUNTIME_IDENTITY_DRIFT',
          message:
            'Identity proposal no longer matches the current runtime-derived review packet.',
        };
  }

  const item = packet.lexicon.find(
    (entry) => entry.itemId === proposal.itemId,
  );

  const matches =
    item != null &&
    proposal.reviewedTerm === item.term &&
    proposal.reviewedMeaningFr === item.meaningFr &&
    proposal.reviewedUsage === item.usage &&
    proposal.reviewedRevision === item.lexiconRevision;

  return matches
    ? null
    : {
        itemId: proposal.itemId,
        code: 'RUNTIME_LEXICON_DRIFT',
        message:
          'Lexicon proposal no longer matches the current runtime-derived review packet.',
      };
}

export function validateBretagneLanguageReviewDecision(
  decision: BretagneLanguageReviewDecision,
  proposal: BretagneLanguageReviewProposal,
  packet: BretagneLanguageReviewPacket = buildBretagneLanguageReviewPacket(),
  nowMs: number = Date.now(),
): BretagneLanguageReviewDecisionError[] {
  const errors: BretagneLanguageReviewDecisionError[] = [];
  const push = (
    code: BretagneLanguageReviewDecisionErrorCode,
    message: string,
  ) => errors.push({ itemId: proposal.itemId, code, message });

  if (
    proposal.proposalStatus !== 'HUMAN_REVIEW_REQUIRED' ||
    proposal.canApplyAutomatically !== false
  ) {
    push(
      'PROPOSAL_NOT_HUMAN_REVIEW_ONLY',
      'Proposal must remain HUMAN_REVIEW_REQUIRED and non-automatic.',
    );
  }

  if (
    proposal.packetRevision !== packet.packetRevision ||
    decision.packetRevision !== packet.packetRevision
  ) {
    push(
      'PACKET_REVISION_MISMATCH',
      'Decision and proposal must bind the current packet revision.',
    );
  }

  if (decision.itemId !== proposal.itemId) {
    push('ITEM_ID_MISMATCH', 'Decision itemId must match the proposal itemId.');
  }
  if (decision.kind !== proposal.kind) {
    push('KIND_MISMATCH', 'Decision kind must match the proposal kind.');
  }

  const drift = proposalMatchesCurrentRuntime(proposal, packet);
  if (drift) errors.push(drift);

  if (
    decision.decision !== 'ACCEPT' &&
    decision.decision !== 'REJECT' &&
    decision.decision !== 'REQUEST_CHANGES'
  ) {
    push('INVALID_DECISION', 'Decision must be ACCEPT, REJECT or REQUEST_CHANGES.');
  }

  if (!nonEmpty(decision.codeReviewerRole)) {
    push('MISSING_CODE_REVIEWER_ROLE', 'Code reviewer role is required.');
  }
  if (!nonEmpty(decision.codeReviewerRef)) {
    push('MISSING_CODE_REVIEWER_REF', 'Code reviewer reference is required.');
  }
  if (!nonEmpty(decision.decisionEvidenceReference)) {
    push(
      'MISSING_DECISION_EVIDENCE',
      'Controlled decision evidence reference is required.',
    );
  }

  const decidedAt = Date.parse(decision.decidedAt);
  if (!Number.isFinite(decidedAt)) {
    push('INVALID_DECISION_DATE', 'Decision timestamp must be valid.');
  } else if (decidedAt > nowMs) {
    push('FUTURE_DECISION_DATE', 'Decision timestamp cannot be in the future.');
  }

  if (decision.automaticApplyAllowed !== false) {
    push('AUTOMATIC_APPLY_FORBIDDEN', 'Automatic apply can never be enabled.');
  }

  if (decision.decision === 'ACCEPT') {
    if (
      proposal.disposition === 'APPROVED_WITH_CONDITIONS' &&
      decision.conditionsAcknowledged !== true
    ) {
      push(
        'MISSING_CONDITIONS_ACKNOWLEDGEMENT',
        'Conditional approval requires explicit conditions acknowledgement.',
      );
    }

    if (
      nonEmpty(proposal.attributionOrReuseRequirements) &&
      decision.attributionOrReuseAcknowledged !== true
    ) {
      push(
        'MISSING_ATTRIBUTION_ACKNOWLEDGEMENT',
        'Attribution/reuse requirements must be explicitly acknowledged.',
      );
    }

    if (decision.semanticAuthorityUnchangedConfirmed !== true) {
      push(
        'SEMANTIC_AUTHORITY_CONFIRMATION_REQUIRED',
        'Acceptance must confirm that MotsPet/ELI semantic authority is unchanged.',
      );
    }
  }

  if (
    decision.decision === 'REQUEST_CHANGES' &&
    !nonEmpty(decision.notes)
  ) {
    push(
      'REQUEST_CHANGES_REQUIRES_NOTES',
      'REQUEST_CHANGES requires an explicit reason.',
    );
  }

  return errors;
}

function identityCandidate(
  proposal: BretagneIdentityReviewProposal,
  decision: BretagneLanguageReviewDecision,
): BretagneIdentityRuntimeEvidenceCandidate {
  return {
    kind: 'IDENTITY',
    itemId: 'bretagne_companion_identity',
    candidateStatus: 'MANUAL_RUNTIME_PATCH_REQUIRED',
    canApplyAutomatically: false,
    semanticAuthorityChangeAllowed: false,
    profileMutationAllowedAutomatically: false,
    identityEvidence: {
      status: 'VERIFIED',
      exactAssistantName: proposal.exactAssistantName,
      exactAssistantNameOrigin: proposal.exactAssistantNameOrigin,
      exactNamingRule: proposal.exactNamingRule,
      reviewerRole: proposal.reviewerRole,
      reviewerRef: proposal.reviewerRef,
      reviewedAt: proposal.reviewedAt,
      reviewReceipt: proposal.evidenceReference,
      note: [
        proposal.conditionsOrRestrictions,
        proposal.attributionOrReuseRequirements,
      ]
        .filter(nonEmpty)
        .join(' | '),
    },
    codeReview: {
      reviewerRole: decision.codeReviewerRole.trim(),
      reviewerRef: decision.codeReviewerRef.trim(),
      decidedAt: decision.decidedAt,
      decisionReceipt: decision.decisionEvidenceReference.trim(),
    },
  };
}

function lexiconCandidate(
  proposal: BretagneLexiconReviewProposal,
  decision: BretagneLanguageReviewDecision,
): BretagneLexiconRuntimeEvidenceCandidate {
  return {
    kind: 'LEXICON',
    itemId: proposal.itemId,
    candidateStatus: 'MANUAL_RUNTIME_PATCH_REQUIRED',
    canApplyAutomatically: false,
    semanticAuthorityChangeAllowed: false,
    lexiconMutationAllowedAutomatically: false,
    lexiconEvidence: {
      status: 'VERIFIED',
      reviewer: proposal.reviewerRole,
      reviewedAt: proposal.reviewedAt,
      reviewReceipt: proposal.evidenceReference,
      reviewedTerm: proposal.reviewedTerm,
      reviewedMeaningFr: proposal.reviewedMeaningFr,
      reviewedUsage: proposal.reviewedUsage,
      reviewedRevision: proposal.reviewedRevision,
    },
    codeReview: {
      reviewerRole: decision.codeReviewerRole.trim(),
      reviewerRef: decision.codeReviewerRef.trim(),
      decidedAt: decision.decidedAt,
      decisionReceipt: decision.decisionEvidenceReference.trim(),
    },
  };
}

export function buildBretagneLanguageRuntimeEvidenceCandidate(
  decision: BretagneLanguageReviewDecision,
  proposal: BretagneLanguageReviewProposal,
): BretagneLanguageRuntimeEvidenceCandidate | null {
  if (decision.decision !== 'ACCEPT') return null;

  return proposal.kind === 'IDENTITY'
    ? identityCandidate(proposal, decision)
    : lexiconCandidate(proposal, decision);
}

export function evaluateBretagneLanguageReviewDecision(
  decision: BretagneLanguageReviewDecision,
  proposal: BretagneLanguageReviewProposal,
  packet: BretagneLanguageReviewPacket = buildBretagneLanguageReviewPacket(),
  nowMs: number = Date.now(),
): BretagneLanguageReviewDecisionResult {
  const errors = validateBretagneLanguageReviewDecision(
    decision,
    proposal,
    packet,
    nowMs,
  );

  return {
    valid: errors.length === 0,
    errors,
    runtimeCandidate:
      errors.length === 0
        ? buildBretagneLanguageRuntimeEvidenceCandidate(decision, proposal)
        : null,
  };
}
