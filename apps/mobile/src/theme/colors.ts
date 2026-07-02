/**
 * EMOPET color tokens — Breton brand direction.
 * Cream / granit / terracotta / lichen; warm, editorial, non-medical.
 * Sourced from emopet-design-system/colors_and_type.css.
 */

export const palette = {
  cream: {
    50: '#FAF7F1',
    100: '#F4EFE6',
    200: '#ECE5D7',
    300: '#DDD4C2',
    400: '#C6BBA4',
  },
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
  terracotta: {
    700: '#9B5A3E',
    600: '#B46A4A',
    500: '#C97B5A',
    400: '#D79378',
    300: '#E5B29D',
    200: '#F0D2C3',
    100: '#F7E5DA',
  },
  lichen: {
    700: '#4F6E54',
    600: '#5F7F64',
    500: '#6B8E6F',
    400: '#87A38B',
    300: '#A8BCAC',
    200: '#CAD7CC',
    100: '#E3EAE4',
  },
} as const;

export const colors = {
  bg: palette.cream[100],
  bgAlt: palette.cream[50],
  bgSunk: palette.cream[200],
  surface: '#FBF8F2',
  surface2: palette.cream[50],
  surfaceDark: palette.granit[800],

  fg: palette.granit[800],
  fgStrong: palette.granit[900],
  fg2: palette.granit[600],
  fgMuted: palette.granit[500],
  fgHint: palette.granit[400],
  fgDisabled: palette.granit[300],
  fgOnDark: palette.cream[50],
  fgOnAccent: '#FFFFFF',

  accent: palette.terracotta[500],
  accentHover: palette.terracotta[600],
  accentPress: palette.terracotta[700],
  accentSoft: palette.terracotta[100],
  accentSoftBorder: palette.terracotta[300],

  accent2: palette.lichen[500],
  accent2Hover: palette.lichen[600],
  accent2Soft: palette.lichen[100],
  accent2SoftBorder: palette.lichen[200],

  border: palette.cream[300],
  borderStrong: palette.cream[400],
  divider: 'rgba(31, 42, 54, 0.08)',

  // ELI reliability gating — never red for suppressed.
  eli: {
    valid: '#7A9B7E',
    validBg: '#E8EEE7',
    validInk: '#3F5A43',
    degraded: '#C9A55A',
    degradedBg: '#F6EED9',
    degradedInk: '#7A5F1E',
    suppressed: '#9AA0A6',
    suppressedBg: '#ECEDEE',
    suppressedInk: '#565B62',
  },

  // Prudence bandeau (vet disclaimer + cautious context).
  prudence: {
    bg: '#F3ECDF',
    ink: '#5C4A2B',
    border: '#E1D3B5',
  },

  overlay: 'rgba(31, 42, 54, 0.24)',
} as const;
