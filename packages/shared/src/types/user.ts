import type { AIToneProfile } from './community.js';

export type SubscriptionTier = 'free' | 'trial' | 'kit' | 'premium';

export interface UserConsents {
  location_opt_in: boolean;
  community_opt_in: boolean;
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
  /** Months of continuous membership — drives progressive rewards. */
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

export type AchievementType =
  | 'distance_record'
  | 'mat_streak'
  | 'community_first'
  | 'walk_group'
  | 'founding_member'
  | 'monthly_journal';

export interface Achievement {
  id: string;
  dogId: string;
  type: AchievementType;
  title: string;
  description: string;
  unlockedAt: Date;
  value?: number;
}
