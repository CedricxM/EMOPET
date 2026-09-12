import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Disclaimer, ScreenContainer } from '../../src/components/ui';
import { useDogStore, usePreferencesStore } from '../../src/store';
import { colors, fontFamily } from '../../src/theme';

/**
 * Home is an orchestration surface, not a verdict surface.
 * Keep this screen aligned with G-HOME-ORCHESTRATION-01 and the Care publication boundary:
 * operational state may be shown directly; dog observations require an eligible publication state.
 */
export default function HomeScreen() {
  const dogs = useDogStore((s) => s.dogs);
  const subscriptionTier = usePreferencesStore((s) => s.subscriptionTier);
  const hardwareLinked = usePreferencesStore((s) => s.hardwareLinked);

  const dog = dogs[0];
  const dogName = dog?.name ?? 'Nala';
  const dogPhoto = dog?.photo?.trim();
  const heroSource = dogPhoto ? { uri: dogPhoto } : require('../../assets/v2/nala-hero.jpg');

  const freeWithoutKit = subscriptionTier === 'free' && !hardwareLinked;

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

      <View style={styles.attentionCard}>
        <Text style={styles.cardLabel}>{hardwareLinked ? 'MAINTENANT' : 'À FAIRE'}</Text>
        <Text style={styles.attentionTitle}>
          {hardwareLinked
            ? 'Rien ne demande ton attention dans EMOPET pour le moment.'
            : 'Associer MAT & TAG'}
        </Text>
        <Text style={styles.attentionBody}>
          {hardwareLinked
            ? 'Cela signifie seulement qu’aucun élément éligible n’est présenté ici maintenant. Ce n’est pas une conclusion sur l’état de ton chien.'
            : 'L’association du kit est une étape opérationnelle. Elle ne produit pas, à elle seule, une conclusion sur ton chien.'}
        </Text>
        {!hardwareLinked ? (
          <Pressable
            onPress={() => router.push('/devices')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryAction, pressed ? styles.primaryActionPressed : null]}
          >
            <Text style={styles.primaryActionText}>Ouvrir les appareils</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionKicker}>APPAREILS</Text>
        <Text style={styles.sectionTitle}>Le contexte, sans verdict</Text>
        <Text style={styles.sectionBody}>
          MAT et TAG décrivent ici leur état opérationnel. Les observations Care restent soumises à leurs propres critères de qualité et de publication.
        </Text>
      </View>

      <View style={styles.grid}>
        <StatusCard
          label="MAT"
          title={hardwareLinked ? 'Associé' : 'À associer'}
          badge={hardwareLinked ? 'Disponible' : freeWithoutKit ? 'Optionnel' : undefined}
          onPress={() => router.push('/devices')}
        />
        <StatusCard
          label="TAG"
          title={hardwareLinked ? 'Associé' : 'À associer'}
          badge={hardwareLinked ? 'Disponible' : freeWithoutKit ? 'Optionnel' : undefined}
          onPress={() => router.push('/devices')}
        />
      </View>

      <View style={styles.quietCard}>
        <Text style={styles.cardLabel}>CARE</Text>
        <Text style={styles.quietTitle}>Pas de pseudo-observation pour remplir l’écran.</Text>
        <Text style={styles.quietBody}>
          Quand les éléments fiables ne suffisent pas, EMOPET doit pouvoir rester silencieux plutôt que transformer une donnée partielle en certitude.
        </Text>
      </View>

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
    backgroundColor: colors.bg,
  },
  kickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  kicker: {
    flex: 1,
    color: colors.fgMuted,
    fontFamily: fontFamily.sansSemi,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.25,
  },
  today: {
    color: colors.fgMuted,
    fontFamily: fontFamily.sansSemi,
    fontSize: 11,
    fontWeight: '600',
  },
  name: {
    marginTop: 8,
    marginBottom: 12,
    color: colors.fgStrong,
    fontFamily: fontFamily.serif,
    fontSize: 34,
    fontWeight: '500',
    letterSpacing: -0.8,
  },
  hero: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: 28,
    backgroundColor: colors.surfaceDark,
  },
  attentionCard: {
    marginTop: 14,
    padding: 18,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attentionTitle: {
    marginTop: 6,
    color: colors.fgStrong,
    fontFamily: fontFamily.serif,
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 26,
  },
  attentionBody: {
    marginTop: 8,
    color: colors.fgMuted,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  primaryAction: {
    alignSelf: 'flex-start',
    marginTop: 14,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  primaryActionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  primaryActionText: {
    color: colors.fgOnAccent,
    fontFamily: fontFamily.sansSemi,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    marginTop: 28,
    marginBottom: 12,
  },
  sectionKicker: {
    color: colors.accent,
    fontFamily: fontFamily.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  sectionTitle: {
    marginTop: 5,
    color: colors.fgStrong,
    fontFamily: fontFamily.serif,
    fontSize: 24,
    fontWeight: '500',
  },
  sectionBody: {
    marginTop: 6,
    color: colors.fgMuted,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    minHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  cardLabel: {
    color: colors.fgMuted,
    fontFamily: fontFamily.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  statusTitle: {
    marginTop: 5,
    color: colors.fgStrong,
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
    marginTop: 9,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.accent2Soft,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent2,
  },
  badgeText: {
    color: colors.accent2Hover,
    fontFamily: fontFamily.sansSemi,
    fontSize: 10,
    fontWeight: '700',
  },
  quietCard: {
    marginTop: 14,
    marginBottom: 18,
    padding: 18,
    borderRadius: 24,
    backgroundColor: colors.bgAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quietTitle: {
    marginTop: 6,
    color: colors.fgStrong,
    fontFamily: fontFamily.serif,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
  },
  quietBody: {
    marginTop: 8,
    color: colors.fgMuted,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    lineHeight: 19,
  },
});
