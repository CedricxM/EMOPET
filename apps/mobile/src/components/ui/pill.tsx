/**
 * Pill — ELI reliability gating badge.
 * Renders BEFORE the value on every measurement surface. The three states:
 *   valid (vert-gris), degraded (ambre désaturé), suppressed (gris neutre).
 * Never red for suppressed.
 */

import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, radius } from '../../theme';

export type PillState = 'valid' | 'degraded' | 'suppressed';

interface Props {
  state: PillState;
  label?: string;
}

const COPY: Record<PillState, string> = {
  valid: 'Valide',
  degraded: 'Dégradé',
  suppressed: 'Supprimé',
};

const STYLE: Record<PillState, { bg: string; ink: string }> = {
  valid: { bg: colors.eli.validBg, ink: colors.eli.validInk },
  degraded: { bg: colors.eli.degradedBg, ink: colors.eli.degradedInk },
  suppressed: { bg: colors.eli.suppressedBg, ink: colors.eli.suppressedInk },
};

export function Pill({ state, label }: Props) {
  const s = STYLE[state];
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <View style={[styles.dot, { backgroundColor: s.ink }]} />
      <Text style={[styles.text, { color: s.ink }]}>{label ?? COPY[state]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.xxs,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
