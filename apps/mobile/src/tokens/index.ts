// EMOPET · Design tokens (TypeScript)
// Mirror of colors_and_type.css — canonical source of truth.
// Any visual decision references these tokens, never hardcoded values.

export const tokens = {
  // ─── Surfaces (sable / crème chaud, jamais blanc pur) ────────────
  cream: {
    50:  '#FAF7F1',
    100: '#F4EFE6',
    200: '#ECE5D7',
    300: '#DDD4C2',
    400: '#C6BBA4',
  },
  // ─── Granit (bleu-gris profond, pierre bretonne, PAS bleu médical)
  granit: {
    900: '#141C25',
    800: '#1F2A36',
    700: '#2E3A48',
    600: '#4A5766',
    500: '#6B7684',
    400: '#8E98A5',
    300: '#B6BCC5',
    200: '#D4D8DE',
  },
  // ─── Terracotta (accent primaire, chaleur non agressive) ─────────
  terracotta: {
    700: '#9B5A3E',
    600: '#B46A4A',
    500: '#C97B5A',
    200: '#F0D2C3',
    100: '#F7E5DA',
  },
  // ─── Lichen (nature / calme, accent secondaire) ──────────────────
  lichen: {
    700: '#4F6E54',
    500: '#6B8E6F',
    200: '#CAD7CC',
    100: '#E3EAE4',
  },
  // ─── ELI reliability gating (CRITIQUE — jamais détourné) ─────────
  eli: {
    valid:        '#7A9B7E',
    validBg:      '#E8EEE7',
    validInk:     '#3F5A43',
    degraded:     '#C9A55A',
    degradedBg:   '#F6EED9',
    degradedInk:  '#7A5F1E',
    suppressed:   '#9AA0A6',
    suppressedBg: '#ECEDEE',
    suppressedInk:'#565B62',
  },
  // ─── Prudence (disclaimer) ───────────────────────────────────────
  prudence: {
    bg:     '#F3ECDF',
    ink:    '#5C4A2B',
    border: '#E1D3B5',
  },
} as const;

// ─── Semantic roles ────────────────────────────────────────────────
// Also re-exposes palette groups so screens can reference T.colors.terracotta[600].
export const colors = {
  // Palette groups
  cream:        tokens.cream,
  granit:       tokens.granit,
  terracotta:   tokens.terracotta,
  lichen:       tokens.lichen,
  eli:          tokens.eli,
  // Semantic surfaces
  bg:           tokens.cream[100],
  bgAlt:        tokens.cream[50],
  bgSunk:       tokens.cream[200],
  surface:      '#FBF8F2',
  fg:           tokens.granit[800],
  fgStrong:     tokens.granit[900],
  fg2:          tokens.granit[600],
  fgMuted:      tokens.granit[500],
  fgHint:       tokens.granit[400],
  fgOnDark:     tokens.cream[50],
  accent:       tokens.terracotta[500],
  accentHover:  tokens.terracotta[600],
  accentPress:  tokens.terracotta[700],
  accentSoft:   tokens.terracotta[100],
  accent2:      tokens.lichen[500],
  accent2Soft:  tokens.lichen[100],
  border:       tokens.cream[300],
  borderStrong: tokens.cream[400],
  divider:      'rgba(31, 42, 54, 0.08)',
  prudenceBg:   tokens.prudence.bg,
  prudenceInk:  tokens.prudence.ink,
  prudenceBorder: tokens.prudence.border,
  eliValid:     tokens.eli.valid,
  eliValidBg:   tokens.eli.validBg,
  eliValidInk:  tokens.eli.validInk,
  eliDegraded:  tokens.eli.degraded,
  eliDegradedBg:tokens.eli.degradedBg,
  eliDegradedInk:tokens.eli.degradedInk,
  eliSuppressed:tokens.eli.suppressed,
  eliSuppressedBg:tokens.eli.suppressedBg,
  eliSuppressedInk:tokens.eli.suppressedInk,
} as const;

// ─── Typography ────────────────────────────────────────────────────
// On iOS/Android, expo-font loads these — fallback to system while loading.
export const fonts = {
  serif: 'Fraunces',
  sans:  'SourceSans3',
  mono:  'JetBrainsMono',
  // System fallback until loaded
  serifFallback: 'Georgia',
  sansFallback: 'System',
  monoFallback: 'Menlo',
} as const;

// Note: `type` intentionally NOT wrapped in `as const` because
// `tabular` must be mutable to satisfy RN's FontVariant[] typing.
// Individual literal types kept via inline `as const` on weights.
export const type = {
  // tabular numerals — use fontVariant: ['tabular-nums'] on numeric Text
  tabular: ['tabular-nums'] as ['tabular-nums'],

  // Scale (match css: --text-xs..--text-5xl)
  xxs: 11,
  xs:  12,
  sm:  13,
  md:  15,
  lg:  17,
  xl:  20,
  xxl: 24,
  xxxl:30,
  xxxxl:38,
  xxxxxl:48,

  lhTight: 1.15,
  lhSnug:  1.3,
  lhNormal:1.5,
  lhRelaxed:1.65,

  wRegular: '400' as const,
  wMedium:  '500' as const,
  wSemi:    '600' as const,
  wBold:    '700' as const,
};

// ─── Shape ─────────────────────────────────────────────────────────
export const radii = {
  xs: 4, sm: 6, md: 10, lg: 14, xl: 20, pill: 999,
} as const;

export const space = {
  s0: 0, s1: 4, s2: 8, s3: 12, s4: 16, s5: 20, s6: 24,
  s8: 32, s10: 40, s12: 56, s16: 80,
} as const;

// ─── Elevation (React Native shadows + Android elevation) ─────────
// Warm-black, low-opacity. Never cool/blue.
export const shadow = {
  xs: {
    shadowColor: '#1F2A36',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 1,
  },
  sm: {
    shadowColor: '#1F2A36',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#1F2A36',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1F2A36',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 8,
  },
} as const;

// ─── Motion (Reanimated Easing curves + durations) ────────────────
// Mirror anime.js config — strict DS rules:
//   • translate ≤ 4px
//   • scale only for press (1 → 0.98 → 1)
//   • no bounce
//   • no pulse on measurement UI
//   • durations: 120ms press, 220ms state, 360ms reveal
import { Easing } from 'react-native-reanimated';

export const motion = {
  // "ease-out" canonical curve — cubic-bezier(0.2, 0.7, 0.2, 1)
  easeOut: Easing.bezier(0.2, 0.7, 0.2, 1),
  easeStandard: Easing.bezier(0.4, 0.0, 0.2, 1),

  // Durations (ms)
  dur: {
    fast: 120,
    med:  220,
    slow: 360,
  },

  // Stagger (ms between siblings)
  stagger: 60,

  // Translate distances (px) — never exceed 4px for subtle reveals
  revealY: 4,
  revealX: 4,

  // Press scale
  pressScale: 0.98,
} as const;

export const T = { colors, fonts, type, radii, space, shadow, motion };
export default T;
