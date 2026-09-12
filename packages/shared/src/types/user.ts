import type { AIToneProfile } from './community.js';

export type SubscriptionTier = 'free' | 'trial' | 'kit' | 'premium';

export interface UserConsents {
  location_opt_in: boolean;
  community_opt_in: boolean;
  /**
   * Coarse preference only. This MUST NOT authorize durable professional access.
   * Vet View requires a scoped, recipient-bound, revocable grant entity.
   */
  vet_export_opt_in: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  displayName?: string;
  avatarUrl?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  communityId?: string;
  locale?: string;
  timezone?: string;
  subscriptionTier?: SubscriptionTier;
  hardwareLinked?: boolean;
  /** Explicit user override for Bleiz voice. Null/undefined means "follow community default". */
  aiToneProfile?: AIToneProfile | 'BREIZ_BASE';
  consents?: UserConsents;
  isReferent: boolean;
  onboardingDay: number;
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionPlan = 'monthly' | 'annual' | 'all_inclusive';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'past_due';
export type PaymentMethod = 'sepa' | 'card' | 'alma_3x';

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  priceEur: number;
  status: SubscriptionStatus;
  startDate: Date;
  engagementEndDate: Date;
  renewalDate: Date;
  paymentMethod: PaymentMethod;
  /**
   * Months of continuous membership. Billing/account history only.
   * It must not drive streaks, social rank, Care authority or dog-performance rewards.
   */
  tier: number;
}

export type HealthEntryType =
  | 'vaccination'
  | 'weight'
  | 'vet_visit'
  | 'medication'
  | 'antiparasitic'
  | 'note';

export interface HealthEntry {
  id: string;
  dogId: string;
  type: HealthEntryType;
  date: Date;
  title: string;
  details?: string;
  value?: number;
  nextDueDate?: Date;
  vetId?: string;
  createdAt: Date;
}

/**
 * Legacy achievement compatibility.
 *
 * `distance_record`, `mat_streak`, walk-volume and journal-quota achievements
 * were removed because real-dog performance, MAT/data adherence and pressure to
 * produce relationship content are not authorized reward sources.
 */
export type AchievementType =
  | 'community_first'
  | 'founding_member';

/**
 * @deprecated Global achievements are HOLD under #233.
 * If playful progression is later approved, it belongs to a World-owned model
 * independent of Care/ELI and real-dog performance.
 */
export interface Achievement {
  id: string;
  userId: string;
  type: AchievementType;
  title: string;
  description: string;
  unlockedAt: Date;
  value?: number;
}
