import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  Caption,
  Eyebrow,
  H1,
  Icon,
  P2,
  ScreenContainer,
} from '../../src/components/ui';
import { useDogStore, usePreferencesStore } from '../../src/store';
import { colors, fontFamily, fontSize, radius, spacing } from '../../src/theme';

interface MenuItem {
  name: string;
  hint: string | null;
  route: string;
}

const MENU: MenuItem[] = [
  { name: 'IA & tonalité', hint: 'Voix Bleiz · calme', route: '/settings/ai-tone' },
  { name: 'Mode prudence', hint: 'Activé', route: '/settings' },
  { name: 'Santé & vétérinaire', hint: 'Rapport 14 j', route: '/settings/health-vet' },
  { name: 'Confidentialité', hint: 'Pseudonymes · opt-in', route: '/settings' },
  { name: 'À propos d’EMOPET', hint: null, route: '/settings' },
];

export default function ProfileScreen() {
  const dogs = useDogStore((s) => s.dogs);
  const dog = dogs[0];
  const hardwareLinked = usePreferencesStore((s) => s.hardwareLinked);

  const dogName = dog?.name ?? 'Gwen';
  const dogMeta = dog ? buildDogMeta(dog) : 'Épagneul breton · 4 ans · 18 kg';

  return (
    <ScreenContainer scroll>
      <H1>Mon profil</H1>

      <Card style={styles.dogCard} padding={14}>
        <View style={styles.dogRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{dogName[0]?.toUpperCase() ?? 'G'}</Text>
          </View>
          <View style={styles.dogBody}>
            <Text style={styles.dogName}>{dogName}</Text>
            <Caption>{dogMeta}</Caption>
          </View>
        </View>
      </Card>

      <Eyebrow>Capteurs</Eyebrow>
      <View style={styles.sensorList}>
        <SensorRow
          iconName="mat"
          title="MAT · tapis"
          subtitle={hardwareLinked ? 'Connecté · 98 % présence' : 'Non lié'}
          bars={[0.3, 0.5, 0.7, 0.9]}
          state="valid"
        />
        <SensorRow
          iconName="tag"
          title="TAG · collier"
          subtitle={hardwareLinked ? 'Contact partiel · batterie 42 %' : 'Non lié'}
          bars={[0.3, 0.5, 0.7, 0]}
          state="degraded"
          degradedLastBar
        />
      </View>

      <Card tone="suppressed" padding={14} bordered style={styles.suppressedBanner}>
        <View style={styles.suppressedRow}>
          <View style={styles.suppressedIcon}>
            <Text style={styles.suppressedIconText}>i</Text>
          </View>
          <View style={styles.suppressedBody}>
            <Text style={styles.suppressedTitle}>Signal insuffisant pour interprétation</Text>
            <P2 style={styles.suppressedText}>
              Moins de 30 min de signal valide ces dernières 24 h — on reste prudent.
            </P2>
          </View>
        </View>
      </Card>

      <Eyebrow>Paramètres</Eyebrow>
      <Card padding={0} bordered style={styles.menuCard}>
        {MENU.map((it, i, arr) => (
          <Pressable
            key={it.name}
            onPress={() => router.push(it.route as never)}
            style={({ pressed }) => [
              styles.menuRow,
              { borderBottomWidth: i === arr.length - 1 ? 0 : 1 },
              pressed && styles.menuRowPressed,
            ]}
          >
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>{it.name}</Text>
              {it.hint && <Caption style={styles.menuHint}>{it.hint}</Caption>}
            </View>
            <Icon name="chevron" size={14} color={colors.fgHint} />
          </Pressable>
        ))}
      </Card>
    </ScreenContainer>
  );
}

interface SensorProps {
  iconName: 'mat' | 'tag';
  title: string;
  subtitle: string;
  bars: number[];
  state: 'valid' | 'degraded';
  degradedLastBar?: boolean;
}

function SensorRow({ iconName, title, subtitle, bars, state, degradedLastBar }: SensorProps) {
  return (
    <Card padding={12} bordered>
      <View style={styles.sensorRow}>
        <View style={styles.sensorIcon}>
          <Icon name={iconName} size={20} color={colors.fg2} />
        </View>
        <View style={styles.sensorBody}>
          <Text style={styles.sensorTitle}>{title}</Text>
          <Caption style={styles.sensorSubtitle}>{subtitle}</Caption>
        </View>
        <View style={styles.bars}>
          {bars.map((h, i) => {
            let barColor: string = state === 'valid' ? colors.eli.valid : colors.eli.degraded;
            if (degradedLastBar && i === bars.length - 2) barColor = colors.eli.degraded;
            if (h === 0) barColor = colors.border;
            return (
              <View
                key={i}
                style={{
                  width: 4,
                  height: 8 + h * 14,
                  borderRadius: 1,
                  backgroundColor: barColor,
                }}
              />
            );
          })}
        </View>
      </View>
    </Card>
  );
}

function buildDogMeta(dog: { breed?: string | null; birthDate?: Date | null; weight?: number | null }) {
  const parts: string[] = [];
  if (dog.breed) parts.push(dog.breed);
  if (dog.birthDate) {
    const years = Math.floor((Date.now() - new Date(dog.birthDate).getTime()) / 31_557_600_000);
    if (years > 0) parts.push(`${years} ans`);
  }
  if (dog.weight != null) parts.push(`${dog.weight} kg`);
  return parts.length ? parts.join(' · ') : 'Informations à compléter';
}

const styles = StyleSheet.create({
  dogCard: {
    marginTop: spacing.s3,
    marginBottom: spacing.s4,
  },
  dogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.bgSunk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fontFamily.serif,
    fontSize: 22,
    fontWeight: '600',
    color: colors.fg2,
  },
  dogBody: {
    flex: 1,
  },
  dogName: {
    fontFamily: fontFamily.serif,
    fontSize: 18,
    fontWeight: '600',
    color: colors.fgStrong,
  },
  sensorList: {
    gap: spacing.s2,
    marginBottom: spacing.s5,
  },
  sensorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  sensorIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.bgSunk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorBody: {
    flex: 1,
  },
  sensorTitle: {
    fontFamily: fontFamily.sansSemi,
    fontSize: 14,
    fontWeight: '600',
    color: colors.fgStrong,
  },
  sensorSubtitle: {
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  bars: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'flex-end',
  },
  suppressedBanner: {
    marginBottom: spacing.s5,
  },
  suppressedRow: {
    flexDirection: 'row',
    gap: spacing.s3,
    alignItems: 'flex-start',
  },
  suppressedIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.eli.suppressed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suppressedIconText: {
    fontFamily: fontFamily.serif,
    fontStyle: 'italic',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  suppressedBody: {
    flex: 1,
  },
  suppressedTitle: {
    fontFamily: fontFamily.sansSemi,
    fontSize: 13,
    fontWeight: '600',
    color: colors.eli.suppressedInk,
    marginBottom: 3,
  },
  suppressedText: {
    color: colors.eli.suppressedInk,
    opacity: 0.85,
  },
  menuCard: {
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s4,
    paddingVertical: 14,
    borderBottomColor: colors.border,
  },
  menuRowPressed: {
    backgroundColor: colors.bgSunk,
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.fgStrong,
  },
  menuHint: {
    marginTop: 2,
  },
});
