/** Système d'ancrage régional de l'assistant — point d'entrée. */

export type { RegionalProfile, ConversationContext, RegionStatus } from './types';
export type {
  RegionalKnowledgeBase,
  GeographyEntry,
  CultureEntry,
  RhythmSourcePlaceholder,
  ContentStatus,
} from './knowledge-types';
export {
  buildAssistantSystemPrompt,
  MAX_KNOWLEDGE_TOKENS,
} from './build-system-prompt';
export type { BuiltPrompt } from './build-system-prompt';
export { filterRelevantKnowledge, estimateTokens, normalizeText } from './filter-knowledge';
export { shouldInitiate, INITIATE_IDLE_MINUTES, DEFAULT_INITIATIVE_ENABLED } from './initiate';
export type { InitiateContext } from './initiate';
export {
  detectRegion,
  REGION_REGISTRY,
  DEFAULT_REGION_ID,
} from './detect-region';
export type { RegionBundle, DetectRegionResult, DetectRegionInput } from './detect-region';
export { BRETAGNE_PROFILE, BRETAGNE_KNOWLEDGE } from './profiles/bretagne';
