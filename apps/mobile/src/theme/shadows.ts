/**
 * Shadow tokens — warm-black, low opacity (0.04–0.08).
 * React Native uses separate shadow/elevation props; web uses boxShadow.
 */

import type { ViewStyle } from 'react-native';

export const shadows: Record<'xs' | 'sm' | 'md' | 'lg', ViewStyle> = {
  xs: {
    shadowColor: '#1F2A36',
    shadowOpacity: 0.04,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sm: {
    shadowColor: '#1F2A36',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  md: {
    shadowColor: '#1F2A36',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: '#1F2A36',
    shadowOpacity: 0.08,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
};
