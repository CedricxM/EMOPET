export type AnthropicReleaseDisposition = 'GO' | 'HOLD' | 'REMEDIATE';
export type AnthropicEgressScope = 'BOUNDED_BREIZ_MESSAGE_AND_REGIONAL_CONTEXT' | 'OPEN';
export type AnthropicSubjectIdentifierPolicy = 'NO_CANONICAL_EMOPET_SUBJECT_ID' | 'OPEN';

export interface AnthropicEgressAuthority {
  disposition: AnthropicReleaseDisposition;
  evidenceRevision: string | null;
  reviewedAt: string | null;
  reviewerRole: string | null;
  providerTermsEvidence: string | null;
  processorPrivacyEvidence: string | null;
  dataTransferEvidence: string | null;
  credentialCustodyEvidence: string | null;
  retentionConfigurationEvidence: string | null;
  modelUseEvidence: string | null;
  reviewedModels: readonly string[];
  egressScope: AnthropicEgressScope;
  subjectIdentifierPolicy: AnthropicSubjectIdentifierPolicy;
  reason: string;
}

/**
 * Provider/processor authority for Breiz model egress.
 *
 * API-key presence and a runtime flag are deployment configuration, not
 * authorization. The checked-in record remains HOLD until provider terms,
 * processor/privacy/data-transfer, credential custody, retention/use and model
 * review evidence are deliberately supplied.
 */
export const ANTHROPIC_PRODUCTION_AUTHORITY: AnthropicEgressAuthority = {
  disposition: 'HOLD',
  evidenceRevision: null,
  reviewedAt: null,
  reviewerRole: null,
  providerTermsEvidence: null,
  processorPrivacyEvidence: null,
  dataTransferEvidence: null,
  credentialCustodyEvidence: null,
  retentionConfigurationEvidence: null,
  modelUseEvidence: null,
  reviewedModels: [],
  egressScope: 'OPEN',
  subjectIdentifierPolicy: 'OPEN',
  reason:
    'Anthropic provider/processor, retention/use, data-transfer, credential-custody and model authority remain open under #69/#116.',
};

export function isAnthropicProductionEgressAuthorized(
  model: string,
  authority: AnthropicEgressAuthority = ANTHROPIC_PRODUCTION_AUTHORITY,
  nowMs: number = Date.now(),
): boolean {
  if (authority.disposition !== 'GO') return false;
  if (!authority.evidenceRevision?.trim()) return false;
  if (!authority.reviewerRole?.trim()) return false;
  if (!authority.providerTermsEvidence?.trim()) return false;
  if (!authority.processorPrivacyEvidence?.trim()) return false;
  if (!authority.dataTransferEvidence?.trim()) return false;
  if (!authority.credentialCustodyEvidence?.trim()) return false;
  if (!authority.retentionConfigurationEvidence?.trim()) return false;
  if (!authority.modelUseEvidence?.trim()) return false;
  if (!authority.reviewedAt) return false;

  const reviewedAt = Date.parse(authority.reviewedAt);
  if (!Number.isFinite(reviewedAt) || reviewedAt > nowMs) return false;

  if (authority.egressScope !== 'BOUNDED_BREIZ_MESSAGE_AND_REGIONAL_CONTEXT') return false;
  if (authority.subjectIdentifierPolicy !== 'NO_CANONICAL_EMOPET_SUBJECT_ID') return false;

  const normalizedModel = model.trim();
  if (!normalizedModel) return false;
  if (!authority.reviewedModels.includes(normalizedModel)) return false;

  return true;
}
