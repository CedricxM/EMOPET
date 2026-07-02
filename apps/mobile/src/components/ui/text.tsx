/**
 * Typography primitives — H1/H2/H3, P, Caption, Micro, Data.
 * Fraunces for H1–H3 and data-xl; Source Sans for everything else.
 */

import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, fontFamily, fontSize, fontWeight, letterSpacing, lineHeight } from '../../theme';

type Props = PropsWithChildren<TextProps>;

function make(base: TextProps['style']) {
  return function Made({ children, style, ...rest }: Props) {
    return (
      <Text {...rest} style={[base, style]}>
        {children}
      </Text>
    );
  };
}

// Display (hero)
export const Display = make(
  StyleSheet.create({
    s: {
      fontFamily: fontFamily.serif,
      fontWeight: fontWeight.semi,
      fontSize: fontSize['5xl'],
      lineHeight: fontSize['5xl'] * lineHeight.tight,
      letterSpacing: letterSpacing.tight,
      color: colors.fgStrong,
    },
  }).s,
);

// Screen title — Fraunces 38
export const H1 = make(
  StyleSheet.create({
    s: {
      fontFamily: fontFamily.serif,
      fontWeight: fontWeight.semi,
      fontSize: 30,
      lineHeight: 30 * lineHeight.tight,
      letterSpacing: letterSpacing.snug,
      color: colors.fgStrong,
    },
  }).s,
);

// Card title — Fraunces 24
export const H2 = make(
  StyleSheet.create({
    s: {
      fontFamily: fontFamily.serif,
      fontWeight: fontWeight.semi,
      fontSize: fontSize.xxl,
      lineHeight: fontSize.xxl * lineHeight.snug,
      color: colors.fgStrong,
    },
  }).s,
);

// Sub title — Fraunces 20
export const H3 = make(
  StyleSheet.create({
    s: {
      fontFamily: fontFamily.serif,
      fontWeight: fontWeight.medium,
      fontSize: fontSize.xl,
      lineHeight: fontSize.xl * lineHeight.snug,
      color: colors.fgStrong,
    },
  }).s,
);

// Body
export const P = make(
  StyleSheet.create({
    s: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.md,
      lineHeight: fontSize.md * lineHeight.relaxed,
      color: colors.fg,
    },
  }).s,
);

// Secondary paragraph
export const P2 = make(
  StyleSheet.create({
    s: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * lineHeight.relaxed,
      color: colors.fg2,
    },
  }).s,
);

// Lead — serif italic intro line
export const Lead = make(
  StyleSheet.create({
    s: {
      fontFamily: fontFamily.serif,
      fontStyle: 'italic',
      fontSize: fontSize.xl,
      lineHeight: fontSize.xl * lineHeight.snug,
      color: colors.fg2,
      fontWeight: fontWeight.regular,
    },
  }).s,
);

// Caption / small
export const Caption = make(
  StyleSheet.create({
    s: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.xs,
      color: colors.fgMuted,
    },
  }).s,
);

// Micro — tiny metadata
export const Micro = make(
  StyleSheet.create({
    s: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.xxs,
      letterSpacing: letterSpacing.wide,
      color: colors.fgMuted,
    },
  }).s,
);

// Big numeric readout (ELI value) — Fraunces, tabular
export const DataXL = make(
  StyleSheet.create({
    s: {
      fontFamily: fontFamily.serif,
      fontWeight: fontWeight.medium,
      fontSize: 52,
      letterSpacing: letterSpacing.tight,
      color: colors.fgStrong,
      lineHeight: 54,
      fontVariant: ['tabular-nums'],
    },
  }).s,
);

// Compact stat value — Fraunces 20, tabular
export const DataMD = make(
  StyleSheet.create({
    s: {
      fontFamily: fontFamily.serif,
      fontWeight: fontWeight.medium,
      fontSize: fontSize.xl,
      color: colors.fgStrong,
      fontVariant: ['tabular-nums'],
    },
  }).s,
);
