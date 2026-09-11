import type { AIToneProfile } from '@emopet/shared';
import { create } from 'zustand';

export type MobileSubscriptionTier = 'free' | 'trial' | 'kit' | 'premium';
export type MobileAiToneProfile = AIToneProfile;

type SensitiveConsentKey = 'location_opt_in' | 'community_opt_in' | 'vet_export_opt_in';

interface PreferencesState {
  subscriptionTier: MobileSubscriptionTier;
  hardwareLinked: boolean;
  communityAiToneProfileDefault: MobileAiToneProfile;
  aiToneProfile: MobileAiToneProfile | null;
  communityRulesAccepted: boolean;
  waitlistedServiceIds: string[];
  passivePhoneDetectionEnabled: boolean;
  manualPresenceOverride: 'present' | 'absence' | null;
  consents: {
    location_opt_in: boolean;
    community_opt_in: boolean;
    vet_export_opt_in: boolean;
  };
  setSubscriptionTier: (tier: MobileSubscriptionTier) => void;
  setHardwareLinked: (linked: boolean) => void;
  setCommunityAiToneProfileDefault: (profile: MobileAiToneProfile) => void;
  setAiToneProfile: (profile: MobileAiToneProfile | null) => void;
  setCommunityRulesAccepted: (accepted: boolean) => void;
  joinWaitlist: (serviceId: string) => void;
  setPassivePhoneDetectionEnabled: (enabled: boolean) => void;
  setManualPresenceOverride: (state: 'present' | 'absence' | null) => void;
  setConsent: (key: SensitiveConsentKey, value: boolean) => void;
  activateLocationConsentFromDurableAuthority: () => void;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  subscriptionTier: 'free',
  hardwareLinked: false,
  communityAiToneProfileDefault: 'BREIZ',
  aiToneProfile: null,
  communityRulesAccepted: false,
  waitlistedServiceIds: [],
  passivePhoneDetectionEnabled: false,
  manualPresenceOverride: null,
  consents: {
    location_opt_in: false,
    community_opt_in: false,
    vet_export_opt_in: false,
  },
  setSubscriptionTier: (subscriptionTier) => set({ subscriptionTier }),
  setHardwareLinked: (hardwareLinked) => set({ hardwareLinked }),
  setCommunityAiToneProfileDefault: (communityAiToneProfileDefault) => set({ communityAiToneProfileDefault }),
  setAiToneProfile: (aiToneProfile) => set({ aiToneProfile }),
  setCommunityRulesAccepted: (communityRulesAccepted) => set({ communityRulesAccepted }),
  joinWaitlist: (serviceId) =>
    set((state) => ({
      waitlistedServiceIds: state.waitlistedServiceIds.includes(serviceId)
        ? state.waitlistedServiceIds
        : [...state.waitlistedServiceIds, serviceId],
    })),
  // Passive detection is a dependent location feature. A direct UI toggle must
  // never be able to enable it while durable location authority is absent.
  setPassivePhoneDetectionEnabled: (enabled) =>
    set((state) => ({
      passivePhoneDetectionEnabled: enabled && state.consents.location_opt_in,
    })),
  setManualPresenceOverride: (manualPresenceOverride) => set({ manualPresenceOverride }),
  setConsent: (key, value) =>
    set((state) => {
      if (key === 'location_opt_in') {
        // Generic/local state may revoke location authority, but must never
        // manufacture a positive location consent. Positive activation is only
        // available through activateLocationConsentFromDurableAuthority().
        if (value) return {};
        return {
          consents: {
            ...state.consents,
            location_opt_in: false,
          },
          passivePhoneDetectionEnabled: false,
        };
      }

      return {
        consents: {
          ...state.consents,
          [key]: value,
        },
      };
    }),
  activateLocationConsentFromDurableAuthority: () =>
    set((state) => ({
      consents: {
        ...state.consents,
        location_opt_in: true,
      },
    })),
}));
