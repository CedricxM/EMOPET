import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
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
import { usePhysicalMovementObservation } from '../../src/hooks/use-physical-movement-observation';
import {
  V6_INSIGHTS_RUNTIME_SOURCE,
  shouldShowAnticipationCard,
  shouldShowRecoveryTooltip,
  useV6Insights,
} from '../../src/hooks/use-v6-insights';
import { useAuthStore, useDogStore } from '../../src/store';
import { colors, fontFamily, fontSize, spacing } from '../../src/theme';

export default function HomeScreen() {
  const token = useAuthStore((s) => s.token);
  const dogs = useDogStore((s) => s.dogs);
  const selectedDogId = useDogStore((s) => s.selectedDogId);
  const insights = useV6Insights();
  const physicalMovement = usePhysicalMovementObservation(selectedDogId, token);
  const [anticipationDismissedAt, setAnticipationDismissedAt] = useState<Date | null>(null);

  const selectedDog = dogs.find((dog) => dog.id === selectedDogId) ?? dogs[0];
  const dogName = selectedDog?.name ?? 'Votre chien';
  const movementObservation =
    physicalMovement.response?.status === 'AVAILABLE'
      ? physicalMovement.response.observation
      : null;
  const showAnticipation = shouldShowAnticipationCard(insights, anticipationDismissedAt);
  const showRecoveryTooltip = shouldShowRecoveryTooltip(insights);

  const greeting = useMemo(() => greetingFor(new Date()), []);

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Micro>{greeting}</Micro>
        <H1 style={styles.title}>{dogName}, ce matin</H1>
      </View>

      {/* ELI card — unavailable until an authoritative producer/projection exists. */}
      <Card style={styles.card}>
        <View style={styles.pillRow}>
          <Pill state="suppressed" />
          <Caption style={styles.windowText}>
            Source ELI · {V6_INSIGHTS_RUNTIME_SOURCE.status}
          </Caption>
        </View>
        <Eyebrow>Charge sur 24 h</Eyebrow>
        <View style={styles.valueRow}>
          <DataXL>—</DataXL>
          <Text style={styles.valueUnit}>ELI</Text>
        </View>
        <View style={styles.meter}>
          <View
            style={[
              styles.meterFill,
              {
                width: '0%',
                backgroundColor: colors.eli.suppressed,
              },
            ]}
          />
        </View>
        <P2 style={styles.cardBody}>
          Aucune projection ELI de référence n est câblée. Aucune valeur capteur n est affichée à partir
          d un tier, d un toggle local ou d un contenu de démonstration.
        </P2>

        {V6_INSIGHTS_RUNTIME_SOURCE.authoritative &&
          showRecoveryTooltip &&
          insights.recoverySpeed && (
            <RecoveryTooltip
              dogName={dogName}
              recoverySpeed={insights.recoverySpeed}
              baselineMinutes={insights.recoveryBaselineMinutes}
            />
          )}
      </Card>

      {/* First authorised #479 live slice: physical measurement only, no latent ELI semantics. */}
      <Card style={styles.card}>
        <View style={styles.pillRow}>
          <Pill
            state={
              movementObservation?.qualityState === 'VALID'
                ? 'valid'
                : movementObservation?.qualityState === 'DEGRADED'
                  ? 'degraded'
                  : 'suppressed'
            }
            label={movementObservation ? 'Mesure physique' : 'Indisponible'}
          />
          <Caption style={styles.windowText}>TAG · fenêtre 30 min</Caption>
        </View>
        <Eyebrow>Variabilité de mouvement</Eyebrow>
        {physicalMovement.loading ? (
          <Text style={styles.restTitle}>Chargement…</Text>
        ) : movementObservation ? (
          <>
            <View style={styles.valueRow}>
              <DataXL>{movementObservation.value.toFixed(2)}</DataXL>
              <Text style={styles.valueUnit}>CV ODBA</Text>
            </View>
            <P2 style={styles.cardBody}>
              Variation physique du mouvement mesurée par le TAG sur 30 minutes. Cette valeur ne décrit
              ni une émotion, ni du stress, ni le bien-être de {dogName}.
            </P2>
            <Caption style={styles.cardBody}>
              {movementObservation.validSeconds}s valides · horodatage ±
              {movementObservation.eventTime.uncertaintyMs} ms
            </Caption>
          </>
        ) : (
          <>
            <Text style={styles.restTitle}>Données indisponibles</Text>
            <P2 style={styles.cardBody}>
              EMOPET s abstient si la mesure, sa qualité ou sa provenance temporelle ne sont pas suffisantes.
              Aucun score émotionnel n est substitué.
            </P2>
          </>
        )}
      </Card>

      {/* Repos — no synthetic metrics while the sensor runtime is unwired. */}
      <Card style={styles.card}>
        <View style={styles.pillRow}>
          <Pill state="suppressed" />
          <Caption style={styles.windowText}>Source repos non câblée</Caption>
        </View>
        <Eyebrow>Repos cette nuit</Eyebrow>
        <Text style={styles.restTitle}>Données indisponibles</Text>
        <P2 style={styles.cardBody}>
          EMOPET n affiche pas de durée, d interruption ou de confiance sans données capteur de référence.
        </P2>
      </Card>

      {/* Anticipation observation */}
      {V6_INSIGHTS_RUNTIME_SOURCE.authoritative &&
      showAnticipation &&
      insights.anticipation ? (
        <AnticipationCard
          dogName={dogName}
          anticipation={insights.anticipation}
          onLearnMore={() => {}}
          onDismiss={() => setAnticipationDismissedAt(new Date())}
        />
      ) : (
        <Card style={styles.card} tone="suppressed">
          <Eyebrow>Observation indisponible</Eyebrow>
          <Text style={styles.observationTitle}>Aucune observation comportementale de référence.</Text>
          <P2 style={styles.observationBody}>
            Les cartes d anticipation restent silencieuses tant qu un producteur autoritatif n est pas câblé.
          </P2>
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