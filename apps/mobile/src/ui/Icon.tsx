// EMOPET · Icons (react-native-svg)
// Canonical vocabulary from design system — 1.5px stroke, no medical/emotion icons.

import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline, G } from 'react-native-svg';

export type IconName =
  | 'home' | 'chat' | 'journal' | 'compass' | 'profile'
  | 'mat' | 'tag' | 'wave' | 'info' | 'chevron' | 'chevronLeft'
  | 'plus' | 'send' | 'search' | 'empty' | 'signal';

export function Icon({
  name,
  size = 20,
  color = '#1F2A36',
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: color,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'home':
      return (
        <Svg {...common}>
          <Path d="M3 11 L12 4 L21 11 V20 A1 1 0 0 1 20 21 H15 V15 H9 V21 H4 A1 1 0 0 1 3 20 Z" />
        </Svg>
      );
    case 'chat':
      return (
        <Svg {...common}>
          <Path d="M4 6 A2 2 0 0 1 6 4 H18 A2 2 0 0 1 20 6 V15 A2 2 0 0 1 18 17 H10 L6 21 V17 H6 A2 2 0 0 1 4 15 Z" />
        </Svg>
      );
    case 'journal':
      return (
        <Svg {...common}>
          <Path d="M4 4 H17 A3 3 0 0 1 20 7 V20 H7 A3 3 0 0 1 4 17 Z" />
          <Path d="M8 9 H15 M8 13 H14" />
        </Svg>
      );
    case 'compass':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="9" />
          <Path d="M15 9 L11 11 L9 15 L13 13 Z" fill={color} fillOpacity={0.15} />
        </Svg>
      );
    case 'profile':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="9" r="4" />
          <Path d="M4 21 C4 16 8 14 12 14 C16 14 20 16 20 21" />
        </Svg>
      );
    case 'mat':
      return (
        <Svg {...common}>
          <Rect x="3" y="5" width="18" height="14" rx="2" />
          <Path d="M3 9 H21 M3 15 H21" />
          <Circle cx="7" cy="12" r="0.8" fill={color} stroke="none" />
          <Circle cx="12" cy="12" r="0.8" fill={color} stroke="none" />
          <Circle cx="17" cy="12" r="0.8" fill={color} stroke="none" />
        </Svg>
      );
    case 'tag':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="13" r="6" />
          <Circle cx="12" cy="13" r="2.2" />
          <Path d="M6 5 L8 8 M18 5 L16 8" />
        </Svg>
      );
    case 'wave':
      return (
        <Svg {...common}>
          <Path d="M2 9 Q6 5 12 9 T22 9" />
          <Path d="M2 15 Q6 11 12 15 T22 15" opacity={0.55} />
        </Svg>
      );
    case 'info':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="9" />
          <Line x1="12" y1="11" x2="12" y2="16" />
          <Circle cx="12" cy="8" r="0.6" fill={color} stroke="none" />
        </Svg>
      );
    case 'chevron':
      return (
        <Svg {...common}>
          <Polyline points="9 6 15 12 9 18" />
        </Svg>
      );
    case 'chevronLeft':
      return (
        <Svg {...common}>
          <Polyline points="15 18 9 12 15 6" />
        </Svg>
      );
    case 'plus':
      return (
        <Svg {...common}>
          <Line x1="12" y1="5" x2="12" y2="19" />
          <Line x1="5" y1="12" x2="19" y2="12" />
        </Svg>
      );
    case 'send':
      return (
        <Svg {...common}>
          <Path d="M22 2 L11 13 M22 2 L15 22 L11 13 L2 9 Z" />
        </Svg>
      );
    case 'search':
      return (
        <Svg {...common}>
          <Circle cx="11" cy="11" r="7" />
          <Line x1="16" y1="16" x2="21" y2="21" />
        </Svg>
      );
    case 'signal':
      return (
        <Svg {...common}>
          <Path d="M2 12 Q6 6 10 12 T18 12 T22 12" />
        </Svg>
      );
    case 'empty':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="9" opacity={0.3} strokeDasharray="2 3" />
          <Circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
        </Svg>
      );
    default:
      return null;
  }
}
