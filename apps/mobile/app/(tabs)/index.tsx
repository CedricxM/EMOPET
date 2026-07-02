import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  Caption,
  DataXL,
  Disclaimer,
  Eyebrow,
  H1,
  Micro,
  P2,
  Pill,
  ScreenContainer,
} from '../../src/components/ui';
import { AnticipationCard } from '../../src/components/anticipation-card';
import { RecoveryTooltip } from '../../src/components/recovery-tooltip';
import {
  shouldShowAnticipationCard,
  shouldShowRecoveryTooltip,
  useV6Insights,
} from '../../src/hooks/use-v6-insights';
import { useDogStore, usePreferencesStore } from '../../src/store';
import { colors, fontFamily, fontSize, radius, spacing } from '../../src/theme';

export default function HomeScreen() {
  const dogs = useDogStore((s) => s.dogs);
  const subscriptionTier = usePreferencesStore((s) => s.subscriptionTier);
  const hardwareLinked = usePreferencesStore((s) => s.hardwareLinked);
  const insights = useV6Insights();
  const [anticipationDismissedAt, setAnticipationDismissedAt] = useState<Date | null>(null);

  const dogName = dogs[0]?.name ?? insights.dogName ?? 'Gwen';
  const freeWithoutKit = subscriptionTier === 'free' && !hardwareLinked;
  const showAnticipation = shouldShowAnticipationCard(insights, anticipationDismissedAt);
  const showRecoveryTooltip = shouldShowRecoveryTooltip(insights);

  const greeting = useMemo(() => greetingFor(new Date()), []);

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Micro>{greeting}</Micro>
        <H1 style={styles.title}>{dogName}, ce matin</H1>
      </View>

      {/* ELI card */}
      <Card style={styles.card}>
        <View style={styles.pillRow}>
          <Pill state={freeWithoutKit ? 'suppressed' : 'valid'} />
          <Caption style={styles.windowText}>
            {freeWithoutKit ? 'En attente de capteurs' : 'Fenêtre · 22:14 → 06:03'}
          </Caption>
        </View>
        <Eyebrow>Charge sur 24 h</Eyebrow>
        <View style={styles.valueRow}>
          <DataXL>{freeWithoutKit ? '—' : '0,42'}</DataXL>
          <Text style={styles.valueUnit}>ELI</Text>
        </View>
        <View style={styles.meter}>
          <View
            style={[
              styles.meterFill,
              {
                width: freeWithoutKit ? '0%' : '42%',
                backgroundColor: freeWithoutKit ? colors.eli.suppressed : colors.eli.valid,
              },
            ]}
          />
        </View>
        <P2 style={styles.cardBody}>
          {freeWithoutKit
            ? 'Le mode sans capteur affiche uniquement des repères généraux — aucune interprétation n’est produite.'
            : 'Estimation basée sur 6 h 12 de signal valide. Tendance stable sur 3 jours.'}
        </P2>

        {showRecoveryTooltip && insights.recoverySpeed && (
          <RecoveryTooltip
            dogName={dogName}
            recoverySpeed={insights.recoverySpeed}
            baselineMinutes={insights.recoveryBaselineMinutes}
          />
        )}
      </Card>

      {/* Repos */}
      <Card style={styles.card}>
        <View style={styles.pillRow}>
          <Pill state="degraded" />
          <Caption style={styles.windowText}>2 nuits observées</Caption>
        </View>
        <Eyebrow>Repos cette nuit</Eyebrow>
        <Text style={styles.restTitle}>Repos fragmenté</Text>
        <View style={styles.grid}>
          {([
            ['Interruptions', '4'],
            ['Durée', '6 h 12'],
            ['Confiance', '62 %'],
          ] as const).map(([k, v]) => (
            <View key={k} style={styles.gridCell}>
              <Text style={styles.gridKey}>{k}</Text>
              <Text style={styles.gridValue}>{v}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Anticipation observation */}
      {showAnticipation && insights.anticipation ? (
        <AnticipationCard
          dogName={dogName}
          anticipation={insights.anticipation}
          onLearnMore={() => {}}
          onDismiss={() => setAnticipationDismissedAt(new Date())}
        />
      ) : (
        <Card style={styles.card} tone="accentSoft">
          <Eyebrow tone="accent">Observation · déclarée + observée</Eyebrow>
          <Text style={styles.observationTitle}>{dogName} anticipe vos départs le matin.</Text>
          <P2 style={styles.observationBody}>
            Détecté 3 fois ce mois-ci · à confirmer sur plusieurs semaines.
          </P2>
          <View style={styles.buttonRow}>
            <Button kind="primary" small>
              En savoir plus
            </Button>
            <Button kind="ghost" small onPress={() => setAnticipationDismissedAt(new Date())}>
              Masquer
            </Button>
          </View>
        </Card>
      )}

      <Disclaimer />
    </ScreenContainer>
  );
}

function greetingFor(d: Date) {
  const h = d.getHours();
  if (h < 6) return 'Bonne nuit';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.s5,
  },
  title: {
    marginTop: spacing.s1,
  },
  card: {
    marginBottom: spacing.s4,
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s4,
  },
  windowText: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 2,
  },
  valueUnit: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm + 1,
    color: colors.fgMuted,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  meter: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: spacing.s4,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardBody: {
    marginTop: spacing.s3,
  },
  restTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 22,
    fontWeight: '500',
    color: colors.fgStrong,
    marginTop: 4,
    marginBottom: spacing.s3,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.s3,
  },
  gridCell: {
    flex: 1,
  },
  gridKey: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10,
    color: colors.fgMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  gridValue: {
    fontFamily: fontFamily.serif,
    fontSize: 20,
    fontWeight: '500',
    color: colors.fgStrong,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  observationTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 17,
    fontWeight: '500',
    color: colors.fgStrong,
    marginTop: 2,
    lineHeight: 22,
  },
  observationBody: {
    marginTop: spacing.s2,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
    marginTop: spacing.s4,
  },
});
