/**
 * v0.3 canonical token helper — mirrors values from styles/tokens.css
 * so inline-style code in the mobile preview stays concise.
 * Anything UI-level should reference CSS vars where possible;
 * this object is for ergonomics within the mobile preview.
 */

export const T = {
  // Surfaces
  cream50: '#FBF7F1',
  cream100: '#F6EFE7',
  cream200: '#EEE5D9',
  cream300: '#DCD2C4',
  cream400: '#C5BAA8',

  // Granit
  granit900: '#14123A',
  granit800: '#1D1A6A',
  granit700: '#2E2B83',
  granit600: '#4A4796',
  granit500: '#6B6F76',
  granit400: '#8E919A',
  granit300: '#B7B9BF',
  granit200: '#D6D7DB',

  // Terracotta
  terracotta700: '#C2350F',
  terracotta600: '#E03E18',
  terracotta500: '#FE502D',
  terracotta400: '#FF6E50',
  terracotta300: '#FF9A82',
  terracotta200: '#FFC7B9',
  terracotta100: '#FFE7E0',

  // Lichen
  lichen700: '#1E7E76',
  lichen600: '#25998F',
  lichen500: '#2CB7AB',
  lichen400: '#5BC9BF',
  lichen300: '#8FDAD3',
  lichen200: '#BFE9E5',
  lichen100: '#E3F5F2',

  // ELI gating (never red for SUPPRESSED)
  eliValid: '#7A9B7E',
  eliValidBg: '#E8EEE7',
  eliValidInk: '#3F5A43',
  eliDegraded: '#C9A55A',
  eliDegradedBg: '#F6EED9',
  eliDegradedInk: '#7A5F1E',
  eliSuppressed: '#9AA0A6',
  eliSuppressedBg: '#ECEDEE',
  eliSuppressedInk: '#565B62',

  // Semantic
  bg: '#F6EFE7',
  surface: '#FBF8F2',
  surface2: '#FAF7F1',
  fg: '#1D1A6A',
  fgStrong: '#14123A',
  fg2: '#4A4796',
  fgMuted: '#6B6F76',
  fgHint: '#8E919A',

  accent: '#FE502D',
  accentHover: '#E03E18',
  accentPress: '#C2350F',
  accentSoft: '#FFE7E0',
  accentSoftBorder: '#FF9A82',

  accent2: '#2CB7AB',
  accent2Soft: '#E3F5F2',
  accent2SoftBorder: '#BFE9E5',

  border: '#DCD2C4',
  borderStrong: '#C5BAA8',
  divider: 'rgba(31, 42, 54, 0.08)',

  prudenceBg: '#F3ECDF',
  prudenceInk: '#5C4A2B',
  prudenceBorder: '#E1D3B5',

  // Type
  fontSerif: "'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSans: "'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontMono: "'JetBrains Mono', 'SF Mono', ui-monospace, Menlo, Consolas, monospace",
  ffTabular: "'tnum' 1, 'lnum' 1",

  // Motion
  easeOut: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
  durFast: 120,
  durMed: 220,
  durSlow: 360,
} as const;
