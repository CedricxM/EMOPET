/**
 * Spacing and radius scale — 4px base.
 * Matches the design system tokens (space-0..16, radius-xs..pill).
 */

export const spacing = {
  s0: 0,
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
  s10: 40,
  s12: 56,
  s16: 80,
  // Legacy aliases — kept so existing screens don't break mid-migration.
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

// Legacy alias — the design system card radius is 14.
export const borderRadius = {
  sm: radius.sm,
  md: radius.md,
  lg: radius.lg,
  xl: radius.xl,
  full: radius.pill,
} as const;
