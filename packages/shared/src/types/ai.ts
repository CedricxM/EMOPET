/**
 * AI Personality Engine types — "Bleiz".
 *
 * Critical rules:
 * - NEVER say "your dog is stressed"
 * - NEVER show raw numbers alone — always contextualize
 * - NEVER claim certainty — hedging language only
 * - NEVER give medical advice
 * - ALWAYS personalize (dog name, specific behaviors)
 * - ALWAYS be kind
 */

export type AIMessageCategory =
  | 'morning_greeting'
  | 'daily_insight'
  | 'weekly_pattern'
  | 'monthly_correlation'
  | 'prediction'
  | 'community_question'
  | 'community_challenge'
  | 'community_celebration'
  | 'copresence_suggestion'
  | 'compatibility_match'
  | 'help_bridge'
  | 'memory_narrative'
  | 'record_announcement'
  | 'referent_promotion'
  | 'deuil_response'
  | 'journal_page';

export interface AIMessage {
  id: string;
  category: AIMessageCategory;
  targetUserId?: string;
  targetCommunityId?: string;
  dogId?: string;
  content: string;
  /** Whether this was delivered as push notification. */
  pushedAt?: Date;
  createdAt: Date;
}

/** Input context for AI message generation. */
export interface AIGenerationContext {
  dogName: string;
  breed: string;
  ownerName: string;
  todayActivity?: { distanceKm: number; avgKm: number };
  todayMat?: { minutes: number; avgMinutes: number };
  eliStatus?: string;
  weather?: { tempC: number; condition: string };
  communityName?: string;
  toneProfile: string;
  /** Records or milestones hit today. */
  records?: Array<{ type: string; value: number; previousValue: number }>;
}

/** Safety filter result. */
export interface SafetyCheck {
  passed: boolean;
  violations: string[];
}

/** Check AI message for safety violations. */
export function checkAIMessageSafety(content: string): SafetyCheck {
  const violations: string[] = [];
  const lower = content.toLowerCase();

  if (lower.includes('stress') && !lower.includes('plus actif')) {
    violations.push('Direct stress claim — rephrase as behavioral observation');
  }
  if (/\b(diagnostiqu|maladie|patholog|traitement|medicament)\b/i.test(content)) {
    violations.push('Medical language detected — redirect to vet');
  }
  if (/\b(certainement|sans doute|assurement|clairement)\b/i.test(content)) {
    violations.push('Certainty language — use hedging (il semble, on dirait)');
  }

  return { passed: violations.length === 0, violations };
}
