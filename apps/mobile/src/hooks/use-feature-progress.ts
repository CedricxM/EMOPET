import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import type { FeatureProgressCard, FeatureProgressCta } from '@emopet/shared';

import {
  acceptCommunityRulesRequest,
  fetchFeatureProgress,
  getConsentPromptCopy,
  joinFeatureWaitlistRequest,
  saveFeatureConsent,
} from '../services/feature-progress';
import { useAuthStore, usePreferencesStore } from '../store';

export function useFeatureProgress() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.userId);
  const consents = usePreferencesStore((state) => state.consents);
  const communityRulesAccepted = usePreferencesStore((state) => state.communityRulesAccepted);
  const waitlistedServiceIds = usePreferencesStore((state) => state.waitlistedServiceIds);
  const setConsent = usePreferencesStore((state) => state.setConsent);
  const setCommunityRulesAccepted = usePreferencesStore((state) => state.setCommunityRulesAccepted);
  const joinWaitlist = usePreferencesStore((state) => state.joinWaitlist);
  const setPassivePhoneDetectionEnabled = usePreferencesStore(
    (state) => state.setPassivePhoneDetectionEnabled,
  );

  const [services, setServices] = useState<FeatureProgressCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchFeatureProgress(token, {
      userId,
      communityRulesAccepted,
      waitlistedServiceIds,
      consents,
    })
      .then((payload) => {
        if (mounted) {
          setServices(payload.services);
        }
      })
      .catch((reason: unknown) => {
        if (mounted) {
          setError(reason instanceof Error ? reason.message : 'Impossible de charger les services.');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [communityRulesAccepted, consents, token, userId, waitlistedServiceIds]);

  async function refresh(): Promise<void> {
    try {
      const payload = await fetchFeatureProgress(token, {
        userId,
        communityRulesAccepted,
        waitlistedServiceIds,
        consents,
      });
      setServices(payload.services);
      setError(null);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les services.');
    }
  }

  async function onAction(action: FeatureProgressCta, item: FeatureProgressCard): Promise<void> {
    if (action.type === 'open' || action.type === 'learn_more' || action.type === 'view_progress') {
      router.push((action.route ?? '/progress') as never);
      return;
    }

    if (action.type === 'join_waitlist') {
      joinWaitlist(item.serviceId);
      await joinFeatureWaitlistRequest(token, item.serviceId);
      Alert.alert(
        'Liste rejointe',
        `${item.title} reste visible ici, et vous serez prioritaire pour la beta.`,
      );
      return;
    }

    if (action.type === 'accept_rules') {
      await acceptCommunityRulesRequest(token);
      setCommunityRulesAccepted(true);
      Alert.alert(
        'Regles acceptees',
        'Vous pouvez maintenant avancer vers les fonctions communautaires qui demandent une base de moderation claire.',
      );
      if (action.route) {
        router.push(action.route as never);
      }
      return;
    }

    if (action.type === 'consent' && action.purpose) {
      const purpose = action.purpose;
      const prompt = getConsentPromptCopy(purpose);
      Alert.alert(prompt.title, prompt.body, [
        { text: prompt.cancelLabel, style: 'cancel' },
        {
          text: prompt.confirmLabel,
          onPress: () => {
            if (purpose === 'community_opt_in') {
              setConsent('community_opt_in', true);
            }
            if (purpose === 'location_nearby_temp') {
              setConsent('location_opt_in', true);
              setPassivePhoneDetectionEnabled(true);
            }

            void saveFeatureConsent(token, {
              purpose,
              status: 'accepted',
              context: action.context,
            });

            if (action.route) {
              router.push(action.route as never);
            }
          },
        },
      ]);
    }
  }

  return {
    services,
    loading,
    error,
    refresh,
    onAction,
  };
}
