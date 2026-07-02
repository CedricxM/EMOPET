import type { AIToneProfile } from '@emopet/shared';
import { AI_TONE_PROFILE_IDS, getAiPersona, getToneProfile, resolveAiToneProfileEffective } from '@emopet/ai-personality';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDogStore, usePreferencesStore } from '../../src/store';

const PERSONAS: AIToneProfile[] = [...AI_TONE_PROFILE_IDS];

export default function AIToneScreen() {
  const communityAiToneProfileDefault = usePreferencesStore((state) => state.communityAiToneProfileDefault);
  const aiToneProfile = usePreferencesStore((state) => state.aiToneProfile);
  const setCommunityAiToneProfileDefault = usePreferencesStore((state) => state.setCommunityAiToneProfileDefault);
  const setAiToneProfile = usePreferencesStore((state) => state.setAiToneProfile);
  const dogName = useDogStore((state) => state.dogs[0]?.name) ?? 'Naya';

  const effectiveProfileId = resolveAiToneProfileEffective(aiToneProfile, communityAiToneProfileDefault);
  const preview = getAiPersona(aiToneProfile, {
    dogName,
    locale: 'fr-FR',
    region: 'France',
    communityDefaultProfile: communityAiToneProfileDefault,
  });
  const effectiveTone = getToneProfile(aiToneProfile, {
    dogName,
    locale: 'fr-FR',
    region: 'France',
    communityDefaultProfile: communityAiToneProfileDefault,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>{'<'} Retour</Text>
      </Pressable>
      <Text style={styles.title}>IA & Tonalite</Text>
      <Text style={styles.helper}>
        Le style de Bleiz est un choix explicite. Il ne doit jamais etre deduit automatiquement de la geolocalisation.
        Les profils officiels V1 restent derives de Breiz.
      </Text>

      <View style={styles.previewCard}>
        <Text style={styles.previewEyebrow}>Profil effectif</Text>
        <Text style={styles.previewTitle}>{effectiveTone.displayName}</Text>
        <Text style={styles.previewGreeting}>{preview.greeting}</Text>
        <Text style={styles.previewText}>{effectiveTone.lexiconHints.join(' | ')}</Text>
        <Text style={styles.previewText}>{effectiveTone.styleHints.join(' | ')}</Text>
        <Text style={styles.previewText}>Prompt communaute: {effectiveTone.communityPrompt}</Text>
        <Text style={styles.previewText}>Profile ID: {effectiveProfileId}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Defaut de la communaute</Text>
        <Text style={styles.sectionHelper}>Base du style partage tant que vous n appliquez pas d override local.</Text>
        {PERSONAS.map((profile) => {
          const tone = getToneProfile(profile, { dogName, locale: 'fr-FR', region: 'France' });
          const active = communityAiToneProfileDefault === profile;
          return (
            <Pressable
              key={`community-${profile}`}
              style={[styles.optionCard, active && styles.optionCardActive]}
              onPress={() => setCommunityAiToneProfileDefault(profile)}
            >
              <Text style={styles.optionTitle}>{tone.displayName}</Text>
              <Text style={styles.optionMeta}>{profile}</Text>
              <Text style={styles.optionText}>{tone.greeting}</Text>
              <Text style={styles.optionText}>{tone.communityPrompt}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mon override personnel</Text>
        <Text style={styles.sectionHelper}>Laissez vide pour suivre la communaute. Utilisez un override seulement si vous voulez un style different.</Text>

        <Pressable
          style={[styles.optionCard, aiToneProfile === null && styles.optionCardActive]}
          onPress={() => setAiToneProfile(null)}
        >
          <Text style={styles.optionTitle}>Suivre la communaute</Text>
          <Text style={styles.optionText}>Utilise automatiquement {communityAiToneProfileDefault} comme style effectif.</Text>
        </Pressable>

        {PERSONAS.map((profile) => {
          const tone = getToneProfile(profile, { dogName, locale: 'fr-FR', region: 'France' });
          const active = aiToneProfile === profile;
          return (
            <Pressable
              key={`user-${profile}`}
              style={[styles.optionCard, active && styles.optionCardActive]}
              onPress={() => setAiToneProfile(profile)}
            >
              <Text style={styles.optionTitle}>{tone.displayName}</Text>
              <Text style={styles.optionMeta}>{profile}</Text>
              <Text style={styles.optionText}>{tone.greeting}</Text>
              <Text style={styles.optionText}>
                Categories mises en avant: {tone.favoredCategories.join(', ')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  content: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  back: {
    color: '#E94560',
    fontSize: 16,
    marginBottom: 14,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  helper: {
    color: '#A6B4C8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  previewCard: {
    backgroundColor: '#0F3460',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  previewEyebrow: {
    color: '#A6B4C8',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  previewGreeting: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 8,
  },
  previewText: {
    color: '#BFD0E5',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHelper: {
    color: '#A6B4C8',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 10,
  },
  optionCard: {
    backgroundColor: '#102247',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#223A66',
  },
  optionCardActive: {
    borderColor: '#E94560',
  },
  optionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  optionMeta: {
    color: '#E94560',
    fontSize: 12,
    marginTop: 4,
  },
  optionText: {
    color: '#A6B4C8',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
});
