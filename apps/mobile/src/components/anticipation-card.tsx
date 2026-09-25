/**
 * AnticipationCard — home-screen card shown when v6 anticipation detection
 * meets its threshold. Non-medical copy, never labels the dog.
 */

import { StyleSheet, Text, View } from 'react-native';

import type { AnticipationDetected } from '@emopet/shared';

import { Button, Eyebrow, P2 } from './ui';
import { Card } from './ui/card';
import { colors, fontFamily, spacing } from '../theme';

interface Props {
  dogName: string;
  anticipation: AnticipationDetected;
  onLearnMore: () => void;
  onDismiss: () => void;
}

export function AnticipationCard({ dogName, anticipation, onLearnMore, onDismiss }: Props) {
  return (
    <Card tone="accentSoft" style={styles.card}>
      <Eyebrow tone="accent">Observation · déclarée + observée</Eyebrow>
      <Text style={styles.title}>Un schéma d’activité avant certains départs a été observé pour {dogName}.</Text>
      <P2 style={styles.subtitle}>
        Activité élevée observée sur {anticipation.above_threshold_hit_count} fenêtres pré-départ parmi {anticipation.event_occurrence_count} événements analysés · hypothèse à confirmer sur plusieurs semaines.
      </P2>
      <View style={styles.row}>
        <Button kind="primary" small onPress={onLearnMore}>
          En savoir plus
        </Button>
        <Button kind="ghost" small onPress={onDismiss}>
          Masquer
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.s4,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 17,
    fontWeight: '500',
    color: colors.fgStrong,
    marginTop: 2,
    lineHeight: 22,
  },
  subtitle: {
    marginTop: spacing.s2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
    marginTop: spacing.s4,
  },
});
