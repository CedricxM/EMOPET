/**
 * Card — cream surface, 14px radius, warm shadow OR border (never both).
 */

import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '../../theme';

interface Props {
  onPress?: () => void;
  padding?: number;
  style?: ViewStyle | ViewStyle[];
  tone?: 'surface' | 'accentSoft' | 'accent2Soft' | 'sunk' | 'suppressed';
  bordered?: boolean;
}

const TONE: Record<NonNullable<Props['tone']>, { bg: string; border: string }> = {
  surface: { bg: colors.surface, border: colors.border },
  accentSoft: { bg: colors.accentSoft, border: colors.accentSoftBorder },
  accent2Soft: { bg: colors.accent2Soft, border: colors.accent2SoftBorder },
  sunk: { bg: colors.bgSunk, border: colors.border },
  suppressed: { bg: colors.eli.suppressedBg, border: '#D6D9DD' },
};

export function Card({
  children,
  onPress,
  padding = spacing.s5,
  style,
  tone = 'surface',
  bordered = true,
}: PropsWithChildren<Props>) {
  const t = TONE[tone];
  const base: ViewStyle = {
    backgroundColor: t.bg,
    borderRadius: radius.lg,
    padding,
    ...(bordered
      ? { borderWidth: 1, borderColor: t.border }
      : shadows.sm),
  };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [base, pressed && styles.pressed, style as ViewStyle]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style as ViewStyle]}>{children}</View>;
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.94,
  },
});
