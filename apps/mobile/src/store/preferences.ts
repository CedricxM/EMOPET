import type { AIToneProfile } from '@emopet/shared';
import { create } from 'zustand';

export type MobileSubscriptionTier = 'free' | 'trial' | 'kit' | 'premium';
export type MobileAiToneProfile = AIToneProfile;

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
  setConsent: (
    key: 'location_opt_in' | 'community_opt_in' | 'vet_export_opt_in',
    value: boolean,
  ) => void;
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
    community_opt_in: true,
    vet_export_opt_in: true,
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
  setPassivePhoneDetectionEnabled: (passivePhoneDetectionEnabled) =>
    set({ passivePhoneDetectionEnabled }),
  setManualPresenceOverride: (manualPresenceOverride) => set({ manualPresenceOverride }),
  setConsent: (key, value) =>
    set((state) => ({
      consents: {
        ...state.consents,
        [key]: value,
      },
    })),
}));
