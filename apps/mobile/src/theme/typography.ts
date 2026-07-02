/**
 * Typography tokens.
 *
 * Font families: Fraunces (serif, headings) and Source Sans 3 (sans, body).
 * Fonts are not yet bundled — when they load via expo-font, the named families
 * take over; until then the OS falls back to system serif/sans.
 *
 * To load them: pnpm add expo-font @expo-google-fonts/fraunces
 * @expo-google-fonts/source-sans-3, then call useFonts in app/_layout.tsx.
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
    ios: 'SourceSans3-Regular',
    android: 'SourceSans3-Regular',
    web: '"Source Sans 3", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: 'System',
  })!,
  sansMedium: Platform.select({
    ios: 'SourceSans3-Medium',
    android: 'SourceSans3-Medium',
    web: '"Source Sans 3", -apple-system, sans-serif',
    default: 'System',
  })!,
  sansSemi: Platform.select({
    ios: 'SourceSans3-SemiBold',
    android: 'SourceSans3-SemiBold',
    web: '"Source Sans 3", -apple-system, sans-serif',
    default: 'System',
  })!,
  sansBold: Platform.select({
    ios: 'SourceSans3-Bold',
    android: 'SourceSans3-Bold',
    web: '"Source Sans 3", -apple-system, sans-serif',
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
