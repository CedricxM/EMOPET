import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AnticipationCard } from '../../src/components/anticipation-card';
import { Disclaimer, ScreenContainer } from '../../src/components/ui';
import { shouldShowAnticipationCard, useV6Insights } from '../../src/hooks/use-v6-insights';
import { useDogStore, usePreferencesStore } from '../../src/store';
import { fontFamily } from '../../src/theme';

const visual = {
  bg: '#F5EEE7',
  ink: '#221E72',
  muted: '#787786',
  surface: 'rgba(255,255,255,0.90)',
  surfaceBorder: 'rgba(34,30,114,0.06)',
  teal: '#35BEB2',
  tealSoft: '#DDF4F1',
  tealInk: '#137C74',
} as const;

export default function HomeScreen() {
  const dogs = useDogStore((s) => s.dogs);
  const subscriptionTier = usePreferencesStore((s) => s.subscriptionTier);
  const hardwareLinked = usePreferencesStore((s) => s.hardwareLinked);
  const insights = useV6Insights();
  const [anticipationDismissedAt, setAnticipationDismissedAt] = useState<Date | null>(null);

  const dog = dogs[0];
  const dogName = dog?.name ?? insights.dogName ?? 'Nala';
  const dogPhoto = dog?.photo?.trim();
  const heroSource = dogPhoto ? { uri: dogPhoto } : require('../../assets/v2/nala-hero.jpg');

  const freeWithoutKit = subscriptionTier === 'free' && !hardwareLinked;
  const showAnticipation = shouldShowAnticipationCard(insights, anticipationDismissedAt);
  const observation =
    showAnticipation && insights.anticipation
      ? 'Une variation mérite un peu de contexte.'
      : 'Rien de particulier à signaler pour le moment.';

  return (
    <ScreenContainer
      scroll
      horizontalPadding={18}
      topPadding={10}
      bottomPadding={112}
      contentStyle={styles.screen}
    >
      <View style={styles.kickerRow}>
        <Text style={styles.kicker}>ACCUEIL · ESPACE DE {dogName.toLocaleUpperCase('fr-FR')}</Text>
        <Text style={styles.today}>Aujourd’hui</Text>
      </View>

      <Text style={styles.name}>{dogName}</Text>

      <Image
        source={heroSource}
        style={styles.hero}
        resizeMode="cover"
        accessibilityLabel={`Portrait de ${dogName}`}
      />

      <View style={styles.grid}>
        <StatusCard label="Repos" title={freeWithoutKit ? 'À observer' : 'Une nuit observée'} />
        <StatusCard
          label="Activité"
          title={freeWithoutKit ? 'Contexte manuel' : 'Repères disponibles'}
        />
        <StatusCard
          label="MAT"
          title={hardwareLinked ? 'Disponible' : 'À associer'}
          badge={hardwareLinked ? 'Au repos' : undefined}
          onPress={() => router.push('/devices')}
        />
        <StatusCard
          label="TAG"
          title={hardwareLinked ? 'Connecté' : 'À associer'}
          badge={hardwareLinked ? 'Porté' : undefined}
          onPress={() => router.push('/devices')}
        />
      </View>

      <View style={styles.observationCard}>
        <Text style={styles.cardLabel}>Dernière observation</Text>
        <Text style={styles.observation}>{observation}</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionKicker}>CONTEXTE</Text>
        <Text style={styles.sectionTitle}>Un regard posé</Text>
        <Text style={styles.sectionBody}>
          EMOPET sépare ce qui est observé de ce qui doit encore être confirmé.
        </Text>
      </View>

      {showAnticipation && insights.anticipation ? (
        <AnticipationCard
          dogName={dogName}
          anticipation={insights.anticipation}
          onLearnMore={() => {}}
          onDismiss={() => setAnticipationDismissedAt(new Date())}
        />
      ) : (
        <View style={styles.quietCard}>
          <Text style={styles.cardLabel}>Observation</Text>
          <Text style={styles.quietTitle}>
            Pas assez d’informations fiables pour interpréter davantage.
          </Text>
          <Text style={styles.quietBody}>
            Les repères disponibles restent visibles sans transformer une donnée partielle en certitude.
          </Text>
        </View>
      )}

      <Disclaimer />
    </ScreenContainer>
  );
}

interface StatusCardProps {
  label: string;
  title: string;
  badge?: string;
  onPress?: () => void;
}

function StatusCard({ label, title, badge, onPress }: StatusCardProps) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [
        styles.statusCard,
        pressed && onPress ? styles.statusPressed : null,
      ]}
    >
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.statusTitle}>{title}</Text>
      {badge ? (
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: visual.bg,
  },
  kickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  kicker: {
    flex: 1,
    color: visual.muted,
    fontFamily: fontFamily.sansSemi,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.25,
  },
  today: {
    color: visual.muted,
    fontFamily: fontFamily.sansSemi,
    fontSize: 11,
    fontWeight: '600',
  },
  name: {
    marginTop: 8,
    marginBottom: 12,
    color: visual.ink,
    fontFamily: fontFamily.serif,
    fontSize: 34,
    fontWeight: '500',
    letterSpacing: -0.8,
  },
  hero: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: 28,
    backgroundColor: '#12253A',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginTop: -8,
  },
  statusCard: {
    width: '48.4%',
    minHeight: 88,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 22,
    backgroundColor: visual.surface,
    borderWidth: 1,
    borderColor: visual.surfaceBorder,
  },
  statusPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  cardLabel: {
    color: visual.muted,
    fontFamily: fontFamily.sansSemi,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusTitle: {
    marginTop: 4,
    color: visual.ink,
    fontFamily: fontFamily.sansSemi,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: visual.tealSoft,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: visual.teal,
  },
  badgeText: {
    color: visual.tealInk,
    fontFamily: fontFamily.sansSemi,
    fontSize: 10,
    fontWeight: '700',
  },
  observationCard: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 22,
    backgroundColor: visual.surface,
    borderWidth: 1,
    borderColor: visual.surfaceBorder,
  },
  observation: {
    marginTop: 5,
    color: visual.ink,
    fontFamily: fontFamily.sansSemi,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  sectionHeader: {
    marginTop: 30,
    marginBottom: 12,
  },
  sectionKicker: {
    color: visual.muted,
    fontFamily: fontFamily.sansSemi,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  sectionTitle: {
    marginTop: 4,
    color: visual.ink,
    fontFamily: fontFamily.serif,
    fontSize: 24,
    fontWeight: '500',
  },
  sectionBody: {
    marginTop: 6,
    color: visual.muted,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  quietCard: {
    marginBottom: 18,
    padding: 18,
    borderRadius: 24,
    backgroundColor: visual.surface,
    borderWidth: 1,
    borderColor: visual.surfaceBorder,
  },
  quietTitle: {
    marginTop: 6,
    color: visual.ink,
    fontFamily: fontFamily.serif,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
  },
  quietBody: {
    marginTop: 8,
    color: visual.muted,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    lineHeight: 19,
  },
});
