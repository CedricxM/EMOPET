/**
 * Button — primary (terracotta), secondary (surface), ghost, accent2 (lichen).
 * 10px radius. Sentence case everywhere.
 */

import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, fontFamily, fontSize, radius } from '../../theme';

type Kind = 'primary' | 'secondary' | 'ghost' | 'accent2';

interface Props {
  kind?: Kind;
  small?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
}

const KIND_BG: Record<Kind, string> = {
  primary: colors.accent,
  secondary: colors.surface,
  ghost: 'transparent',
  accent2: colors.accent2,
};

const KIND_PRESSED_BG: Record<Kind, string> = {
  primary: colors.accentPress,
  secondary: colors.bgSunk,
  ghost: colors.bgSunk,
  accent2: colors.accent2Hover,
};

const KIND_INK: Record<Kind, string> = {
  primary: colors.fgOnAccent,
  secondary: colors.fgStrong,
  ghost: colors.fg,
  accent2: colors.fgOnAccent,
};

const KIND_BORDER: Record<Kind, string | undefined> = {
  primary: undefined,
  secondary: colors.borderStrong,
  ghost: undefined,
  accent2: undefined,
};

export function Button({
  kind = 'primary',
  small,
  onPress,
  disabled,
  style,
  children,
}: PropsWithChildren<Props>) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        small ? styles.small : styles.regular,
        {
          backgroundColor: pressed ? KIND_PRESSED_BG[kind] : KIND_BG[kind],
          borderWidth: KIND_BORDER[kind] ? 1 : 0,
          borderColor: KIND_BORDER[kind] ?? 'transparent',
          opacity: disabled ? 0.5 : 1,
        },
        style as ViewStyle,
      ]}
    >
      {typeof children === 'string' ? (
        <Text
          style={[
            styles.label,
            small ? styles.labelSmall : styles.labelRegular,
            { color: KIND_INK[kind] },
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.md,
  },
  regular: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  small: {
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  label: {
    fontFamily: fontFamily.sansSemi,
    fontWeight: '600',
  },
  labelRegular: {
    fontSize: fontSize.sm + 1,
  },
  labelSmall: {
    fontSize: fontSize.sm,
  },
});
