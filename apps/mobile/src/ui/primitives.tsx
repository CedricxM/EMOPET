// EMOPET · UI primitives (React Native)
// Aligned with web primitives.jsx — same props, same visual contract.

import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import Animated from 'react-native-reanimated';
import { T } from '@/tokens';
import { usePressAnimation } from '@/animations/motion';

// ═══════════════════════════════════════════════════════════════════
// Pill — ELI reliability gating (visible BEFORE value)
// ═══════════════════════════════════════════════════════════════════
export type PillState = 'valid' | 'degraded' | 'suppressed';

export function Pill({ state = 'valid', label }: { state?: PillState; label?: string }) {
  const map = {
    valid:      { bg: T.colors.eliValidBg,      ink: T.colors.eliValidInk,      default: 'Valid' },
    degraded:   { bg: T.colors.eliDegradedBg,   ink: T.colors.eliDegradedInk,   default: 'Degraded' },
    suppressed: { bg: T.colors.eliSuppressedBg, ink: T.colors.eliSuppressedInk, default: 'Suppressed' },
  }[state];

  return (
    <View style={[styles.pill, { backgroundColor: map.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: map.ink }]} />
      <Text style={[styles.pillText, { color: map.ink }]}>
        {label ?? map.default}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Card — cream surface, 14px radius, soft shadow
// ═══════════════════════════════════════════════════════════════════
export function Card({
  children,
  style,
  onPress,
  pad = 18,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  pad?: number;
}) {
  const content = (
    <View style={[styles.card, { padding: pad }, style]}>{children}</View>
  );
  if (onPress) {
    const { pressStyle, onPressIn, onPressOut } = usePressAnimation();
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={pressStyle}
      >
        {content}
      </AnimatedPressable>
    );
  }
  return content;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ═══════════════════════════════════════════════════════════════════
// Button — primary / secondary / ghost / accent2
// ═══════════════════════════════════════════════════════════════════
export type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'accent2';

export function Button({
  kind = 'primary',
  children,
  onPress,
  small = false,
  leadingIcon,
}: {
  kind?: ButtonKind;
  children: React.ReactNode;
  onPress?: () => void;
  small?: boolean;
  leadingIcon?: React.ReactNode;
}) {
  const { pressStyle, onPressIn, onPressOut } = usePressAnimation();
  const base: ViewStyle = {
    borderRadius: T.radii.md,
    paddingHorizontal: small ? 12 : 16,
    paddingVertical: small ? 7 : 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  };
  const variant: Record<ButtonKind, ViewStyle> = {
    primary:   { backgroundColor: T.colors.accent },
    secondary: { backgroundColor: T.colors.surface, borderColor: T.colors.borderStrong },
    ghost:     { backgroundColor: 'transparent' },
    accent2:   { backgroundColor: T.colors.accent2 },
  };
  const text: Record<ButtonKind, TextStyle> = {
    primary:   { color: '#fff' },
    secondary: { color: T.colors.fgStrong },
    ghost:     { color: T.colors.fg },
    accent2:   { color: '#fff' },
  };
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[base, variant[kind], pressStyle]}
    >
      {leadingIcon}
      <Text style={[
        styles.buttonText,
        text[kind],
        { fontSize: small ? 13 : 14 },
      ]}>
        {children}
      </Text>
    </AnimatedPressable>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Eyebrow — uppercase, tracked, 11px
// ═══════════════════════════════════════════════════════════════════
export function Eyebrow({
  children,
  color,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  style?: TextStyle;
}) {
  return (
    <Text style={[styles.eyebrow, color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Disclaimer — prudence bandeau with info icon
// ═══════════════════════════════════════════════════════════════════
export function Disclaimer() {
  return (
    <View style={styles.disclaimer}>
      <View style={styles.disclaimerIcon}>
        <Text style={styles.disclaimerIconText}>i</Text>
      </View>
      <Text style={styles.disclaimerText}>
        EMOPET fournit des observations et tendances. Ce n'est pas un avis clinique et cela ne remplace pas l'avis d'un vétérinaire.
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: T.radii.pill,
    alignSelf: 'flex-start',
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontFamily: T.fonts.sans,
    fontSize: 10,
    fontWeight: T.type.wBold,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  card: {
    backgroundColor: T.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.colors.border,
    borderRadius: T.radii.lg,
    ...T.shadow.sm,
  },

  buttonText: {
    fontFamily: T.fonts.sans,
    fontWeight: T.type.wSemi,
  },

  eyebrow: {
    fontFamily: T.fonts.sans,
    fontSize: 11,
    fontWeight: T.type.wBold,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
    color: T.colors.fg2,
    marginBottom: 6,
  },

  disclaimer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: T.colors.prudenceBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.colors.prudenceBorder,
    borderRadius: T.radii.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  disclaimerIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: T.colors.prudenceInk,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  disclaimerIconText: {
    fontFamily: T.fonts.serif,
    fontStyle: 'italic',
    fontSize: 10,
    fontWeight: T.type.wBold,
    color: T.colors.prudenceBg,
    lineHeight: 14,
  },
  disclaimerText: {
    flex: 1,
    fontFamily: T.fonts.sans,
    fontSize: 11.5,
    color: T.colors.prudenceInk,
    lineHeight: 17,
  },
});
