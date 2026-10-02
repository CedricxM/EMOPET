/** Système d'ancrage régional de l'assistant — point d'entrée. */

export type { RegionalProfile, ConversationContext, RegionStatus } from './types';
export type {
  RegionalKnowledgeBase,
  GeographyEntry,
  CultureEntry,
  RhythmSourcePlaceholder,
  RegionalKnowledgeEvidence,
  ContentStatus,
} from './knowledge-types';
export {
  buildAssistantSystemPrompt,
  MAX_KNOWLEDGE_TOKENS,
} from './build-system-prompt';
export type { BuiltPrompt } from './build-system-prompt';
export {
  filterRelevantKnowledge,
  isRegionalKnowledgeEntryReleaseReady,
  estimateTokens,
  normalizeText,
} from './filter-knowledge';
export { shouldInitiate, INITIATE_IDLE_MINUTES, DEFAULT_INITIATIVE_ENABLED } from './initiate';
export type { InitiateContext } from './initiate';
export {
  detectRegion,
  resolveRegionalCompanionContext,
  REGION_REGISTRY,
  DEFAULT_REGION_ID,
} from './detect-region';
export type {
  RegionBundle,
  DetectRegionResult,
  DetectRegionInput,
  RegionalCompanionContext,
  RegionalCompanionContextMode,
  ResolveRegionalCompanionContextInput,
} from './detect-region';
export { BRETAGNE_PROFILE, BRETAGNE_KNOWLEDGE } from './profiles/bretagne';
export {
  NEUTRAL_FRANCE_PROFILE,
  NEUTRAL_FRANCE_KNOWLEDGE,
} from './profiles/neutral-france';

export type {
  RegionalPack,
  RegionalSourceBinding,
  RegionalDataDomain,
  RegionalPackReleaseBlocker,
  RegionalPackReleaseVerdict,
  RegionalIdentityEvidence,
  RegionalIdentityReviewStatus,
} from './regional-pack';
export {
  evaluateRegionalPackReleaseReadiness,
  isRegionalIdentityEvidenceReleaseReady,
} from './regional-pack';
export { BRETAGNE_REGIONAL_PACK } from './profiles/bretagne-pack';

export type {
  RegionalDomainEvidenceStatus,
  RegionalPackSourceEvidence,
  RegionalPackDomainEvidence,
  RegionalPackIdentityEvidence,
  RegionalPackEvidenceReport,
} from './regional-pack-evidence';
export { buildRegionalPackEvidenceReport } from './regional-pack-evidence';

export type {
  BretagneLanguageReviewPacketStatus,
  BretagneReviewRequestedDisposition,
  BretagneLanguageIdentityReviewItem,
  BretagneLanguageLexiconReviewItem,
  BretagneLanguageReviewResponseTemplate,
  BretagneLanguageReviewPacket,
} from './bretagne-language-review-packet';
export {
  BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION,
  buildBretagneLanguageReviewPacket,
  auditBretagneLanguageReviewPacket,
} from './bretagne-language-review-packet';

export type {
  BretagneLanguageReviewResponseKind,
  BretagneLanguageReviewResponse,
  BretagneLanguageReviewResponseErrorCode,
  BretagneLanguageReviewResponseError,
  BretagneIdentityReviewProposal,
  BretagneLexiconReviewProposal,
  BretagneLanguageReviewProposal,
  BretagneLanguageReviewResponseResult,
  BretagneLanguageReviewBatchResult,
} from './bretagne-language-review-response';
export {
  evaluateBretagneLanguageReviewResponse,
  evaluateBretagneLanguageReviewResponses,
} from './bretagne-language-review-response';

export type {
  BretagneLanguageReviewDecisionDisposition,
  BretagneLanguageReviewDecision,
  BretagneLanguageReviewDecisionErrorCode,
  BretagneLanguageReviewDecisionError,
  BretagneIdentityRuntimeEvidenceCandidate,
  BretagneLexiconRuntimeEvidenceCandidate,
  BretagneLanguageRuntimeEvidenceCandidate,
  BretagneLanguageReviewDecisionResult,
} from './bretagne-language-review-decision';
export {
  BRETAGNE_LANGUAGE_REVIEW_DECISION_REVISION,
  validateBretagneLanguageReviewDecision,
  buildBretagneLanguageRuntimeEvidenceCandidate,
  evaluateBretagneLanguageReviewDecision,
} from './bretagne-language-review-decision';
