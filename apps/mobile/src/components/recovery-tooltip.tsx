/**
 * RecoveryTooltip — ELI card annotation shown when the just-completed
 * recovery episode deviates >15% from the baseline mean.
 */

import { StyleSheet, Text, View } from 'react-native';

import type { RecoverySpeedCurrent } from '@emopet/shared';

import { colors, fontFamily, radius, spacing } from '../theme';

interface Props {
  dogName: string;
  recoverySpeed: RecoverySpeedCurrent;
  baselineMinutes: number | null;
}

function triggerLabelFor(slot: RecoverySpeedCurrent['context_slot']): string {
  switch (slot) {
    case 'owner_absent':
      return 'votre départ';
    case 'daytime_active':
      return 'un moment actif';
    case 'owner_present':
      return 'une interaction';
    case 'light_rest_mat':
      return 'un moment de repos agité';
    default:
      return 'un événement';
  }
}

export function RecoveryTooltip({ dogName, recoverySpeed, baselineMinutes }: Props) {
  const mins = Math.round(recoverySpeed.minutes_to_baseline);
  const base = baselineMinutes != null ? Math.round(baselineMinutes) : null;
  const trigger = triggerLabelFor(recoverySpeed.context_slot);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Aujourd’hui, {dogName} a mis {mins} min à revenir à son rythme habituel après {trigger}.
      </Text>
      {base != null && (
        <Text style={styles.baseline}>Moyenne sur les 4 dernières semaines : {base} min.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.s3,
    backgroundColor: colors.bgSunk,
    borderRadius: radius.md,
    paddingVertical: spacing.s3,
    paddingHorizontal: spacing.s3,
  },
  text: {
    fontFamily: fontFamily.sans,
    color: colors.fg,
    fontSize: 13,
    lineHeight: 19,
  },
  baseline: {
    fontFamily: fontFamily.sans,
    color: colors.fgMuted,
    fontSize: 12,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
});
