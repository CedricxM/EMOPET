/**
 * Typography tokens.
 *
 * Font families per BRAND-AUTHORITY-001 (2026-08-25): Fraunces for display /
 * titles, Instrument Sans for body, JetBrains Mono for technical/metadata.
 *
 * The native family names below are the aliases registered by `useFonts` in
 * `app/_layout.tsx`. They must stay in sync with that map: a name declared
 * here that the layout does not register silently falls back to the system
 * font, which is how the previous body family stayed declared but never
 * loaded until #238.
 *
 * On web, `expo-font` emits `@font-face{font-family:<the key useFonts was given>}`
 * (`_createWebFontTemplate`), so the registered CSS family is the alias, not the
 * human family name. Each web stack therefore leads with the alias and keeps
 * `"Instrument Sans"` behind it, which matches only if the font is also served
 * by a stylesheet link. Leading with the human name alone silently fell back to
 * the system sans on web.
 *
 * `mono` is unchanged and still resolves to the platform monospace on native,
 * and on web its stack deliberately leads with an unregistered `"JetBrains
 * Mono"`: loading it is a separate change, outside #238.
 */

import { Platform } from 'react-native';

export const fontFamily = {
  serif: Platform.select({
    ios: 'Fraunces',
    android: 'Fraunces',
    web: '"Fraunces", Georgia, "Times New Roman", serif',
    default: 'Fraunces',
  })!,
  sans: Platform.select({
    ios: 'InstrumentSans-Regular',
    android: 'InstrumentSans-Regular',
    web: '"InstrumentSans-Regular", "Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: 'System',
  })!,
  sansMedium: Platform.select({
    ios: 'InstrumentSans-Medium',
    android: 'InstrumentSans-Medium',
    web: '"InstrumentSans-Medium", "Instrument Sans", -apple-system, sans-serif',
    default: 'System',
  })!,
  sansSemi: Platform.select({
    ios: 'InstrumentSans-SemiBold',
    android: 'InstrumentSans-SemiBold',
    web: '"InstrumentSans-SemiBold", "Instrument Sans", -apple-system, sans-serif',
    default: 'System',
  })!,
  sansBold: Platform.select({
    ios: 'InstrumentSans-Bold',
    android: 'InstrumentSans-Bold',
    web: '"InstrumentSans-Bold", "Instrument Sans", -apple-system, sans-serif',
    default: 'System',
  })!,
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    web: '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace',
    default: 'monospace',
  })!,
} as const;

export const fontSize = {
  xxs: 11,
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  '3xl': 30,
  '4xl': 38,
  '5xl': 48,
} as const;

export const lineHeight = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.5,
  relaxed: 1.65,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semi: '600',
  bold: '700',
} as const;

export const letterSpacing = {
  tight: -0.4,
  snug: -0.2,
  normal: 0,
  wide: 0.4,
  wider: 1.4,
} as const;
