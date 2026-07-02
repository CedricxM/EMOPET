/**
 * EMOPET Entitlement System
 *
 * Tiered feature access like Claw Code's permission levels.
 * free < trial < kit < premium
 */

import type { SubscriptionTier } from '../types/user.js';

export interface FeatureEntitlement {
  feature_id: string;
  min_tier: SubscriptionTier;
  description_fr: string;
  preview_data?: unknown;
}

const TIER_ORDER: Record<SubscriptionTier, number> = {
  free: 0,
  trial: 1,
  kit: 2,
  premium: 3,
};

export const FEATURE_ENTITLEMENTS: FeatureEntitlement[] = [
  // FREE tier
  { feature_id: 'breed_profile', min_tier: 'free', description_fr: 'Profil de race personnalisé' },
  { feature_id: 'bleiz_education', min_tier: 'free', description_fr: 'Contenu éducatif quotidien' },
  { feature_id: 'community_feed', min_tier: 'free', description_fr: 'Communauté locale' },
  { feature_id: 'directory', min_tier: 'free', description_fr: 'Annuaire vétérinaire' },
  { feature_id: 'seasonal_alerts', min_tier: 'free', description_fr: 'Alertes saisonnières' },

  // KIT tier (requires hardware)
  { feature_id: 'eli_insights', min_tier: 'kit', description_fr: 'Insights capteurs personnalisés',
    preview_data: { example: 'Pixel a dormi 4h de repos profond ce matin' } },
  { feature_id: 'absence_mode', min_tier: 'kit', description_fr: 'Mode absence',
    preview_data: { example: 'Pixel est calme quand vous partez avant 8h' } },
  { feature_id: 'vet_report', min_tier: 'kit', description_fr: 'Rapport vétérinaire 14 jours' },
  { feature_id: 'walk_quality', min_tier: 'kit', description_fr: 'Qualité de promenade' },
  { feature_id: 'routine_stability', min_tier: 'kit', description_fr: 'Indice de stabilité de routine' },

  // PREMIUM tier (future)
  { feature_id: 'multi_dog', min_tier: 'premium', description_fr: 'Suivi multi-chiens' },
  { feature_id: 'historical_export', min_tier: 'premium', description_fr: 'Export historique complet' },
];

export function canAccess(tier: SubscriptionTier, feature_id: string): boolean {
  const entitlement = FEATURE_ENTITLEMENTS.find((e) => e.feature_id === feature_id);
  if (!entitlement) return false;
  return TIER_ORDER[tier] >= TIER_ORDER[entitlement.min_tier];
}

export function getLockedFeatures(tier: SubscriptionTier): FeatureEntitlement[] {
  return FEATURE_ENTITLEMENTS.filter((e) => TIER_ORDER[tier] < TIER_ORDER[e.min_tier]);
}

export function getAvailableFeatures(tier: SubscriptionTier): FeatureEntitlement[] {
  return FEATURE_ENTITLEMENTS.filter((e) => TIER_ORDER[tier] >= TIER_ORDER[e.min_tier]);
}
