import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import type { ConsentPurpose, FeatureProgressCard, FeatureProgressCta } from '@emopet/shared';

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
  const activateLocationConsentFromDurableAuthority = usePreferencesStore(
    (state) => state.activateLocationConsentFromDurableAuthority,
  );
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

  async function persistConsentAndApply(
    purpose: ConsentPurpose,
    action: FeatureProgressCta,
  ): Promise<void> {
    const isLocationConsent = purpose === 'location_nearby_temp';

    // Sensitive location/coproximity cannot be represented as an accepted
    // local/demo consent. It must be durably bound to an authenticated
    // principal before any local collection switch is enabled.
    if (isLocationConsent && !token) {
      setConsent('location_opt_in', false);
      setPassivePhoneDetectionEnabled(false);
      Alert.alert(
        'Proximite indisponible',
        'La proximite reste desactivee tant que le consentement ne peut pas etre enregistre durablement sur votre compte.',
      );
      return;
    }

    try {
      await saveFeatureConsent(token, {
        purpose,
        status: 'accepted',
        context: action.context,
      });

      // Local state changes only after durable consent recording succeeds.
      if (purpose === 'community_opt_in') {
        setConsent('community_opt_in', true);
      }
      if (isLocationConsent) {
        activateLocationConsentFromDurableAuthority();
        setPassivePhoneDetectionEnabled(true);
      }

      if (action.route) {
        router.push(action.route as never);
      }
    } catch (reason: unknown) {
      if (isLocationConsent) {
        setConsent('location_opt_in', false);
        setPassivePhoneDetectionEnabled(false);
      }
      Alert.alert(
        isLocationConsent ? 'Proximite indisponible' : 'Consentement indisponible',
        isLocationConsent
          ? 'La proximite reste desactivee. Aucun consentement local ne remplace un enregistrement durable.'
          : reason instanceof Error
            ? reason.message
            : 'Le consentement n a pas pu etre enregistre.',
      );
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
            void persistConsentAndApply(purpose, action);
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
