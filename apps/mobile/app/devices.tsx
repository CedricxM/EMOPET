import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { ScreenContainer } from '../src/components/ui';
import { usePreferencesStore } from '../src/store';
import { fontFamily } from '../src/theme';

const visual = {
  bg: '#F5EEE7',
  ink: '#221E72',
  muted: '#787786',
  surface: 'rgba(255,255,255,0.92)',
  border: 'rgba(34,30,114,0.06)',
  teal: '#35BEB2',
  tealSoft: '#DDF4F1',
  tealInk: '#137C74',
} as const;

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
      <Text style={styles.kicker}>APPAREILS</Text>
      <Text style={styles.title}>MAT & TAG</Text>
      <Text style={styles.intro}>
        Des objets présents, pas envahissants. Leur rôle est de rendre le contexte plus solide, pas de prendre la place de la relation.
      </Text>

      <DeviceCard
        label="MAT"
        title={hardwareLinked ? 'Disponible' : 'À associer'}
        detail="Le lit de repos conserve son volume et sa présence physique. La technologie reste en dessous."
        image={require('../assets/v2/mat-board.jpg')}
        state={hardwareLinked ? 'Au repos' : 'Non associé'}
      />

      <DeviceCard
        label="TAG"
        title={hardwareLinked ? 'Connecté' : 'À associer'}
        detail="Le module s’intègre au collier textile comme un seul objet, sans langage médical ni instrumentation visuelle."
        image={require('../assets/v2/tag-product.jpg')}
        state={hardwareLinked ? 'Porté' : 'Non associé'}
      />

      <View style={styles.principleCard}>
        <Text style={styles.principleKicker}>PRINCIPE</Text>
        <Text style={styles.principleTitle}>Relation d’abord. Information ensuite. Technologie dessous.</Text>
        <Text style={styles.principleBody}>
          Les appareils apportent du contexte et de la continuité. Ils ne produisent pas, à eux seuls, une vérité sur l’état intérieur du chien.
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
}

function DeviceCard({ label, title, detail, state, image }: DeviceCardProps) {
  return (
    <View style={styles.deviceCard}>
      <View style={styles.imageFrame}>
        <Image source={image} style={styles.image} resizeMode="contain" />
      </View>

      <View style={styles.deviceHeader}>
        <View>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.deviceTitle}>{title}</Text>
        </View>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>{state}</Text>
        </View>
      </View>

      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: visual.bg,
  },
  kicker: {
    color: visual.muted,
    fontFamily: fontFamily.sansSemi,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.25,
  },
  title: {
    marginTop: 6,
    color: visual.ink,
    fontFamily: fontFamily.serif,
    fontSize: 34,
    fontWeight: '500',
    letterSpacing: -0.8,
  },
  intro: {
    marginTop: 8,
    marginBottom: 20,
    color: visual.muted,
    fontFamily: fontFamily.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  deviceCard: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 28,
    backgroundColor: visual.surface,
    borderWidth: 1,
    borderColor: visual.border,
  },
  imageFrame: {
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: '#FBF6F0',
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
    color: visual.muted,
    fontFamily: fontFamily.sansSemi,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  deviceTitle: {
    marginTop: 3,
    color: visual.ink,
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
  detail: {
    marginTop: 10,
    color: visual.muted,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  principleCard: {
    marginTop: 6,
    padding: 20,
    borderRadius: 26,
    backgroundColor: '#221E72',
  },
  principleKicker: {
    color: 'rgba(255,255,255,0.64)',
    fontFamily: fontFamily.sansSemi,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  principleTitle: {
    marginTop: 7,
    color: '#FFFFFF',
    fontFamily: fontFamily.serif,
    fontSize: 21,
    fontWeight: '500',
    lineHeight: 27,
  },
  principleBody: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.74)',
    fontFamily: fontFamily.sans,
    fontSize: 13,
    lineHeight: 20,
  },
});
