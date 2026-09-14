import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { ScreenContainer } from '../src/components/ui';
import { usePreferencesStore } from '../src/store';
import { colors, fontFamily } from '../src/theme';

export default function DevicesScreen() {
  const hardwareLinked = usePreferencesStore((s) => s.hardwareLinked);

  return (
    <ScreenContainer
      scroll
      horizontalPadding={18}
      topPadding={12}
      bottomPadding={48}
      contentStyle={styles.screen}
    >
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Revenir à l’écran précédent"
        hitSlop={12}
        style={({ pressed }) => [styles.backButton, pressed ? styles.backButtonPressed : null]}
      >
        <Text style={styles.backText}>‹ Retour</Text>
      </Pressable>

      <Text style={styles.kicker}>APPAREILS</Text>
      <Text style={styles.title}>MAT & TAG</Text>
      <Text style={styles.intro}>
        Deux surfaces complémentaires : MAT qualifie le contexte de repos, TAG apporte de la continuité mobile et contextuelle. Leur présence ne vaut jamais conclusion sur l’état intérieur du chien.
      </Text>

      <DeviceCard
        label="MAT"
        title={hardwareLinked ? 'Associé' : 'À associer'}
        detail="Surface de repos instrumentée et contexte de référence qualifié. Les chaînes de mesure restent soumises à leurs gates de qualité et de publication."
        image={require('../assets/v2/mat-board.jpg')}
        imageLabel="Vue produit du MAT EMOPET, surface de repos rembourrée"
        state={hardwareLinked ? 'Associé' : 'Non associé'}
      />

      <DeviceCard
        label="TAG"
        title={hardwareLinked ? 'Associé' : 'À associer'}
        detail="Continuité mobile et contextuelle autour du chien. Les données du TAG restent des sources d’observation, pas un diagnostic ni un récit émotionnel."
        image={require('../assets/v2/tag-product.jpg')}
        imageLabel="Vue produit du TAG EMOPET intégré à un collier textile"
        state={hardwareLinked ? 'Associé' : 'Non associé'}
      />

      <View style={styles.principleCard} accessibilityRole="summary">
        <Text style={styles.principleKicker}>PRINCIPE</Text>
        <Text style={styles.principleTitle}>Relation d’abord. Information ensuite. Technologie dessous.</Text>
        <Text style={styles.principleBody}>
          MAT et TAG apportent du contexte et de la continuité. ELI doit encore qualifier la provenance, la qualité, les limites et l’incertitude avant toute publication admissible.
        </Text>
      </View>
    </ScreenContainer>
  );
}

interface DeviceCardProps {
  label: string;
  title: string;
  detail: string;
  state: string;
  image: ImageSourcePropType;
  imageLabel: string;
}

function DeviceCard({ label, title, detail, state, image, imageLabel }: DeviceCardProps) {
  return (
    <View
      style={styles.deviceCard}
      accessible
      accessibilityLabel={`${label}. ${title}. État : ${state}. ${detail}`}
    >
      <View style={styles.imageFrame} importantForAccessibility="no-hide-descendants">
        <Image
          source={image}
          style={styles.image}
          resizeMode="contain"
          accessible
          accessibilityLabel={imageLabel}
        />
      </View>

      <View style={styles.deviceHeader} importantForAccessibility="no-hide-descendants">
        <View>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.deviceTitle}>{title}</Text>
        </View>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>{state}</Text>
        </View>
      </View>

      <Text style={styles.detail} importantForAccessibility="no-hide-descendants">
        {detail}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
  },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: 4,
  },
  backButtonPressed: {
    opacity: 0.62,
  },
  backText: {
    color: colors.fg,
    fontFamily: fontFamily.sansSemi,
    fontSize: 14,
    fontWeight: '700',
  },
  kicker: {
    color: colors.accent,
    fontFamily: fontFamily.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.25,
  },
  title: {
    marginTop: 6,
    color: colors.fgStrong,
    fontFamily: fontFamily.serif,
    fontSize: 34,
    fontWeight: '500',
    letterSpacing: -0.8,
  },
  intro: {
    marginTop: 8,
    marginBottom: 20,
    color: colors.fgMuted,
    fontFamily: fontFamily.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  deviceCard: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageFrame: {
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: colors.bgAlt,
  },
  image: {
    width: '100%',
    aspectRatio: 1.62,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 14,
  },
  label: {
    color: colors.fgMuted,
    fontFamily: fontFamily.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  deviceTitle: {
    marginTop: 3,
    color: colors.fgStrong,
    fontFamily: fontFamily.serif,
    fontSize: 21,
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  detail: {
    marginTop: 10,
    color: colors.fgMuted,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  principleCard: {
    marginTop: 6,
    padding: 20,
    borderRadius: 26,
    backgroundColor: colors.surfaceDark,
  },
  principleKicker: {
    color: colors.accentSoftBorder,
    fontFamily: fontFamily.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  principleTitle: {
    marginTop: 7,
    color: colors.fgOnDark,
    fontFamily: fontFamily.serif,
    fontSize: 21,
    fontWeight: '500',
    lineHeight: 27,
  },
  principleBody: {
    marginTop: 10,
    color: colors.bgSunk,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    lineHeight: 20,
  },
});
