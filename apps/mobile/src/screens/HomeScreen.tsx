// EMOPET · HomeScreen (Accueil) — React Native port
// Variants: normal (VALID) · suppressed · first-launch

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { T } from '@/tokens';
import { Pill, Card, Button, Eyebrow, Disclaimer } from '@/ui/primitives';
import { Icon } from '@/ui/Icon';
import {
  useStaggeredReveal,
  useCountUp,
  useBarFill,
} from '@/animations/motion';

type Props = {
  variant?: 'normal' | 'suppressed' | 'first-launch';
  onNavigateToChat: () => void;
  onNavigateToTrends: () => void;
};

// ─── Normal (VALID) ───────────────────────────────────────────────
function HomeNormal({ onNavigateToChat, onNavigateToTrends }: Omit<Props, 'variant'>) {
  const headerStyle = useStaggeredReveal(0);
  const eliCardStyle = useStaggeredReveal(1);
  const restCardStyle = useStaggeredReveal(2);
  const anticipationStyle = useStaggeredReveal(3);
  const disclaimerStyle = useStaggeredReveal(4);

  // Animated ELI value (0 → 0.42) and bar (0% → 42%)
  const eliValue = useCountUp(0.42, { decimals: 2, duration: 500, delay: 200 });
  const barStyle = useBarFill(42, { duration: 500, delay: 200 });

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.header, headerStyle]}>
        <Text style={styles.eyebrow}>Bonjour</Text>
        <Text style={styles.h1}>Gwen, ce matin</Text>
      </Animated.View>

      {/* ELI card — gating-first, tappable → Trends */}
      <Animated.View style={eliCardStyle}>
        <Card style={styles.mb14} onPress={onNavigateToTrends}>
          <View style={styles.rowBetween}>
            <Pill state="valid" />
            <Text style={styles.metaRight}>Fenêtre · 22:14 → 06:03</Text>
          </View>
          <Eyebrow>Charge sur 24 h</Eyebrow>
          <View style={styles.valueRow}>
            <Text style={styles.valueLarge}>{eliValue}</Text>
            <Text style={styles.valueUnit}>ELI</Text>
          </View>
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, barStyle]} />
          </View>
          <Text style={styles.body}>
            Estimation basée sur 6 h 12 de signal valide. Tendance stable sur 3 jours.
          </Text>
          <View style={styles.trendsCTA}>
            <Text style={styles.trendsCTAText}>Voir les tendances · 14 j</Text>
            <Icon name="chevron" size={14} color={T.colors.accent} />
          </View>
        </Card>
      </Animated.View>

      {/* Repos fragmenté */}
      <Animated.View style={restCardStyle}>
        <Card style={styles.mb14}>
          <View style={styles.rowBetween}>
            <Pill state="degraded" />
            <Text style={styles.metaRight}>2 nuits observées</Text>
          </View>
          <Eyebrow>Repos cette nuit</Eyebrow>
          <Text style={styles.h3}>Repos fragmenté</Text>
          <View style={styles.metricsGrid}>
            {[['Interruptions', '4'], ['Durée', '6 h 12'], ['Confiance', '62 %']].map(([k, v]) => (
              <View key={k} style={styles.metricCell}>
                <Text style={styles.metricLabel}>{k}</Text>
                <Text style={styles.metricValue}>{v}</Text>
              </View>
            ))}
          </View>
        </Card>
      </Animated.View>

      {/* Observation 3-source */}
      <Animated.View style={anticipationStyle}>
        <Card style={[styles.mb14, styles.anticipationCard]}>
          <Eyebrow color={T.colors.terracotta[700]}>Observation · déclarée + observée</Eyebrow>
          <Text style={styles.anticipationTitle}>Gwen anticipe vos départs le matin.</Text>
          <Text style={styles.anticipationMeta}>
            Détecté 3 fois ce mois-ci · à confirmer sur plusieurs semaines.
          </Text>
          <View style={styles.buttonRow}>
            <Button kind="primary" small onPress={onNavigateToChat}>En savoir plus</Button>
            <Button kind="ghost" small>Masquer</Button>
          </View>
        </Card>
      </Animated.View>

      <Animated.View style={disclaimerStyle}>
        <Disclaimer />
      </Animated.View>
    </ScrollView>
  );
}

// ─── Suppressed ──────────────────────────────────────────────────
function HomeSuppressed() {
  const headerStyle = useStaggeredReveal(0);
  const eliCardStyle = useStaggeredReveal(1);
  const explainStyle = useStaggeredReveal(2);
  const disclaimerStyle = useStaggeredReveal(3);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.header, headerStyle]}>
        <Text style={styles.eyebrow}>Bonjour</Text>
        <Text style={styles.h1}>Gwen, ce matin</Text>
      </Animated.View>

      <Animated.View style={eliCardStyle}>
        <Card style={styles.mb14}>
          <View style={styles.rowBetween}>
            <Pill state="suppressed" />
            <Text style={styles.metaRight}>Fenêtre · 22:14 → 06:03</Text>
          </View>
          <Eyebrow>Charge sur 24 h</Eyebrow>
          <View style={styles.valueRow}>
            <Text style={styles.valueSuppressed}>— —</Text>
            <Text style={styles.valueUnit}>ELI</Text>
          </View>
          <Text style={[styles.body, { marginTop: 14 }]}>
            Signal insuffisant pour interprétation (fiable ≥ 2h requis). Aucune valeur affichée.
          </Text>
        </Card>
      </Animated.View>

      <Animated.View style={explainStyle}>
        <Card style={[styles.mb14, styles.suppressedBanner]}>
          <View style={styles.suppressedRow}>
            <View style={styles.suppressedIcon}>
              <Text style={styles.suppressedIconText}>i</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.suppressedTitle}>Pourquoi cet état ?</Text>
              <Text style={styles.suppressedText}>
                Contact TAG partiel cette nuit — 38 min de signal valide sur 8 h. Vérifiez l'ajustement du collier.
              </Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View style={disclaimerStyle}>
        <Disclaimer />
      </Animated.View>
    </ScrollView>
  );
}

// ─── First launch ────────────────────────────────────────────────
function HomeFirstLaunch() {
  const headerStyle = useStaggeredReveal(0);
  const leadStyle = useStaggeredReveal(1);
  const step1Style = useStaggeredReveal(2);
  const step2Style = useStaggeredReveal(3);
  const disclaimerStyle = useStaggeredReveal(4);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.header, headerStyle]}>
        <Text style={styles.eyebrow}>Bienvenue</Text>
        <Text style={styles.h1}>Présentons votre chien</Text>
      </Animated.View>

      <Animated.View style={leadStyle}>
        <Text style={styles.leadText}>
          EMOPET observe les tendances — charge, repos, contexte. Pour commencer, renseignez quelques informations. Vous pourrez tout modifier plus tard.
        </Text>
      </Animated.View>

      <Animated.View style={step1Style}>
        <Card style={styles.mb14}>
          <Eyebrow>Étape 1 · Profil du chien</Eyebrow>
          <Text style={styles.stepTitle}>Nom, race, date de naissance</Text>
          <Text style={styles.stepMeta}>Environ deux minutes.</Text>
          <View style={{ marginTop: 14 }}>
            <Button kind="primary" leadingIcon={<Icon name="plus" size={14} color="#fff" />}>
              Ajouter un chien
            </Button>
          </View>
        </Card>
      </Animated.View>

      <Animated.View style={step2Style}>
        <View style={[styles.stepDashed, styles.mb14]}>
          <Eyebrow>Étape 2 · Kit MAT + TAG (optionnel)</Eyebrow>
          <Text style={styles.stepDashedText}>
            L'app fonctionne sans capteur — Breiz vous accompagne à partir du contexte. Le kit ajoute des mesures physiologiques réelles.
          </Text>
          <View style={{ marginTop: 12 }}>
            <Button kind="secondary" small>En savoir plus</Button>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={disclaimerStyle}>
        <Disclaimer />
      </Animated.View>
    </ScrollView>
  );
}

// ─── Dispatcher ──────────────────────────────────────────────────
export function HomeScreen({ variant = 'normal', onNavigateToChat, onNavigateToTrends }: Props) {
  if (variant === 'suppressed') return <HomeSuppressed />;
  if (variant === 'first-launch') return <HomeFirstLaunch />;
  return <HomeNormal onNavigateToChat={onNavigateToChat} onNavigateToTrends={onNavigateToTrends} />;
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 4,
  },
  header: {
    paddingTop: 12,
    marginBottom: 18,
  },
  eyebrow: {
    fontFamily: T.fonts.sans,
    fontSize: 12,
    fontWeight: T.type.wSemi,
    color: T.colors.fgMuted,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
  },
  h1: {
    fontFamily: T.fonts.serif,
    fontWeight: T.type.wSemi,
    fontSize: 32,
    color: T.colors.fgStrong,
    marginTop: 4,
    letterSpacing: -0.32,
  },
  h3: {
    fontFamily: T.fonts.serif,
    fontWeight: T.type.wMedium,
    fontSize: 22,
    color: T.colors.fgStrong,
    marginVertical: 4,
    marginBottom: 10,
  },
  leadText: {
    fontFamily: T.fonts.sans,
    fontSize: 14.5,
    color: T.colors.fg2,
    lineHeight: 22,
    marginBottom: 20,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  metaRight: {
    fontFamily: T.fonts.sans,
    fontSize: 11,
    color: T.colors.fgMuted,
    fontVariant: T.type.tabular,
    letterSpacing: 0.44,
  },

  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  valueLarge: {
    fontFamily: T.fonts.serif,
    fontWeight: T.type.wMedium,
    fontSize: 52,
    letterSpacing: -1.04,
    color: T.colors.fgStrong,
    fontVariant: T.type.tabular,
  },
  valueSuppressed: {
    fontFamily: T.fonts.serif,
    fontWeight: T.type.wRegular,
    fontSize: 32,
    color: T.colors.fgMuted,
    fontStyle: 'italic',
  },
  valueUnit: {
    fontFamily: T.fonts.sans,
    fontSize: 14,
    color: T.colors.fgMuted,
    letterSpacing: 0.56,
  },

  barTrack: {
    height: 4,
    backgroundColor: T.colors.border,
    borderRadius: 2,
    marginTop: 14,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    backgroundColor: T.colors.eliValid,
    borderRadius: 2,
  },

  body: {
    fontFamily: T.fonts.sans,
    fontSize: 13,
    color: T.colors.fg2,
    marginTop: 12,
    lineHeight: 19.5,
  },

  trendsCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.colors.border,
  },
  trendsCTAText: {
    fontFamily: T.fonts.sans,
    fontSize: 12,
    fontWeight: T.type.wSemi,
    color: T.colors.accent,
    letterSpacing: 0.24,
  },

  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  metricCell: {
    flex: 1,
  },
  metricLabel: {
    fontFamily: T.fonts.sans,
    fontSize: 10,
    color: T.colors.fgMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: T.type.wSemi,
  },
  metricValue: {
    fontFamily: T.fonts.serif,
    fontWeight: T.type.wMedium,
    fontSize: 20,
    color: T.colors.fgStrong,
    fontVariant: T.type.tabular,
    marginTop: 2,
  },

  anticipationCard: {
    backgroundColor: T.colors.terracotta[100],
    borderColor: '#E5B29D',
  },
  anticipationTitle: {
    fontFamily: T.fonts.serif,
    fontSize: 17,
    fontWeight: T.type.wMedium,
    color: T.colors.fgStrong,
    marginTop: 2,
  },
  anticipationMeta: {
    fontFamily: T.fonts.sans,
    fontSize: 12,
    color: T.colors.fg2,
    marginTop: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },

  suppressedBanner: {
    backgroundColor: T.colors.eliSuppressedBg,
    borderColor: '#D6D9DD',
  },
  suppressedRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  suppressedIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: T.colors.eliSuppressed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suppressedIconText: {
    fontFamily: T.fonts.serif,
    fontStyle: 'italic',
    fontWeight: T.type.wSemi,
    fontSize: 14,
    color: '#fff',
  },
  suppressedTitle: {
    fontFamily: T.fonts.sans,
    fontSize: 13,
    fontWeight: T.type.wSemi,
    color: T.colors.eliSuppressedInk,
    marginBottom: 3,
  },
  suppressedText: {
    fontFamily: T.fonts.sans,
    fontSize: 12,
    color: T.colors.eliSuppressedInk,
    opacity: 0.85,
    lineHeight: 18,
  },

  stepTitle: {
    fontFamily: T.fonts.serif,
    fontSize: 18,
    fontWeight: T.type.wMedium,
    color: T.colors.fgStrong,
    marginTop: 2,
  },
  stepMeta: {
    fontFamily: T.fonts.sans,
    fontSize: 12.5,
    color: T.colors.fgMuted,
    marginTop: 4,
    lineHeight: 19,
  },
  stepDashed: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: T.colors.border,
    borderRadius: T.radii.lg,
    padding: 18,
  },
  stepDashedText: {
    fontFamily: T.fonts.sans,
    fontSize: 13,
    color: T.colors.fg2,
    lineHeight: 20,
    marginTop: 4,
  },

  mb14: {
    marginBottom: 14,
  },
});
