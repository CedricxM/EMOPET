/**
 * Eyebrow — uppercase category label above a title.
 */

import type { PropsWithChildren } from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors, fontFamily, fontSize } from '../../theme';

interface Props {
  tone?: 'default' | 'accent' | 'accent2' | 'onDark';
}

export function Eyebrow({ children, tone = 'default' }: PropsWithChildren<Props>) {
  const color =
    tone === 'accent'
      ? '#9B5A3E'
      : tone === 'accent2'
      ? '#4F6E54'
      : tone === 'onDark'
      ? colors.bg
      : colors.fg2;
  return <Text style={[styles.text, { color }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.xxs,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
});
