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
  setCommunityAiToneProfileDefault: (profile: MobileAiToneProfile) => void;
  setAiToneProfile: (profile: MobileAiToneProfile | null) => void;
  setCommunityRulesAccepted: (accepted: boolean) => void;
  joinWaitlist: (serviceId: string) => void;
  setPassivePhoneDetectionEnabled: (enabled: boolean) => void;
  setManualPresenceOverride: (state: 'present' | 'absence' | null) => void;
  setConsent: (key: SensitiveConsentKey, value: boolean) => void;
  activateLocationConsentFromDurableAuthority: () => void;
  activateCommunityConsentFromDurableAuthority: () => void;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  // Read-only placeholders until canonical account/device authority is wired.
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
  setCommunityAiToneProfileDefault: (communityAiToneProfileDefault) => set({ communityAiToneProfileDefault }),
  setAiToneProfile: (aiToneProfile) => set({ aiToneProfile }),
  setCommunityRulesAccepted: (communityRulesAccepted) => set({ communityRulesAccepted }),
  joinWaitlist: (serviceId) =>
    set((state) => ({
      waitlistedServiceIds: state.waitlistedServiceIds.includes(serviceId)
        ? state.waitlistedServiceIds
        : [...state.waitlistedServiceIds, serviceId],
    })),
  // Passive detection may only be enabled when durable location authority is
  // already reflected in the local consent mirror.
  setPassivePhoneDetectionEnabled: (enabled) =>
    set((state) => ({
      passivePhoneDetectionEnabled: enabled && state.consents.location_opt_in,
    })),
  setManualPresenceOverride: (manualPresenceOverride) => set({ manualPresenceOverride }),
  setConsent: (key, value) =>
    set((state) => {
      if ((key === 'location_opt_in' || key === 'community_opt_in') && value) {
        // Generic/local state may revoke sensitive authority, but it cannot
        // manufacture a positive server-backed consent.
        return {};
      }

      if (key === 'location_opt_in') {
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
  activateCommunityConsentFromDurableAuthority: () =>
    set((state) => ({
      consents: {
        ...state.consents,
        community_opt_in: true,
      },
    })),
}));