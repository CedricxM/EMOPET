/**
 * Icon — custom EMOPET SVG set, 1.5px stroke, granit ink.
 * Names map to the assets/icon-*.svg shipped with the design system.
 *
 * Absolute rules (from the DS):
 *  - No medical icons (cross, stethoscope, ECG).
 *  - No emotion icons (smileys, sad/happy faces).
 *  - Stroke width 1.5. Round caps. Square caps only on short ticks.
 */

import { Svg, Circle, Path, Line, Polyline, Rect, G } from 'react-native-svg';
import type { ColorValue } from 'react-native';

import { colors } from '../../theme';

export type IconName =
  | 'home'
  | 'chat'
  | 'journal'
  | 'compass'
  | 'profile'
  | 'signal'
  | 'mat'
  | 'tag'
  | 'wave'
  | 'info'
  | 'chevron'
  | 'plus'
  | 'send'
  | 'close'
  | 'search';

interface Props {
  name: IconName;
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color = colors.fg2, strokeWidth = 1.5 }: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderPaths(name, color, common)}
    </Svg>
  );
}

function renderPaths(
  name: IconName,
  color: ColorValue,
  c: {
    stroke: ColorValue;
    strokeWidth: number;
    strokeLinecap: 'round';
    strokeLinejoin: 'round';
    fill: 'none';
  },
) {
  switch (name) {
    case 'home':
      return <Path {...c} d="M3 11 L12 4 L21 11 V20 A1 1 0 0 1 20 21 H15 V15 H9 V21 H4 A1 1 0 0 1 3 20 Z" />;
    case 'chat':
      return (
        <Path
          {...c}
          d="M4 6 A2 2 0 0 1 6 4 H18 A2 2 0 0 1 20 6 V15 A2 2 0 0 1 18 17 H10 L6 21 V17 A2 2 0 0 1 4 15 Z"
        />
      );
    case 'journal':
      return (
        <G>
          <Path {...c} d="M4 4 H17 A3 3 0 0 1 20 7 V20 H7 A3 3 0 0 1 4 17 Z" />
          <Line {...c} x1={8} y1={9} x2={15} y2={9} />
          <Line {...c} x1={8} y1={13} x2={14} y2={13} />
        </G>
      );
    case 'compass':
      return (
        <G>
          <Circle {...c} cx={12} cy={12} r={9} />
          <Path stroke={color} strokeWidth={c.strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={color} fillOpacity={0.15} d="M15 9 L11 11 L9 15 L13 13 Z" />
        </G>
      );
    case 'profile':
      return (
        <G>
          <Circle {...c} cx={12} cy={9} r={4} />
          <Path {...c} d="M4 21 C4 16 8 14 12 14 C16 14 20 16 20 21" />
        </G>
      );
    case 'signal':
      return <Path {...c} d="M2 12 Q6 6 10 12 T18 12 T22 12" />;
    case 'mat':
      return (
        <G>
          <Rect {...c} x={3} y={5} width={18} height={14} rx={2} />
          <Line {...c} x1={3} y1={9} x2={21} y2={9} />
          <Line {...c} x1={3} y1={15} x2={21} y2={15} />
          <Circle cx={7} cy={12} r={0.9} fill={color} />
          <Circle cx={12} cy={12} r={0.9} fill={color} />
          <Circle cx={17} cy={12} r={0.9} fill={color} />
        </G>
      );
    case 'tag':
      return (
        <G>
          <Circle {...c} cx={12} cy={13} r={6} />
          <Circle {...c} cx={12} cy={13} r={2.2} />
          <Path {...c} d="M6 5 L8 8 M18 5 L16 8" />
        </G>
      );
    case 'wave':
      return (
        <G>
          <Path {...c} d="M2 9 Q6 5 12 9 T22 9" />
          <Path {...c} opacity={0.55} d="M2 15 Q6 11 12 15 T22 15" />
        </G>
      );
    case 'info':
      return (
        <G>
          <Circle {...c} cx={12} cy={12} r={9} />
          <Line {...c} x1={12} y1={11} x2={12} y2={16} />
          <Circle cx={12} cy={8} r={0.8} fill={color} />
        </G>
      );
    case 'chevron':
      return <Polyline {...c} points="9,6 15,12 9,18" />;
    case 'plus':
      return (
        <G>
          <Line {...c} x1={12} y1={5} x2={12} y2={19} />
          <Line {...c} x1={5} y1={12} x2={19} y2={12} />
        </G>
      );
    case 'send':
      return <Path {...c} d="M22 2 L11 13 M22 2 L15 22 L11 13 L2 9 Z" />;
    case 'close':
      return (
        <G>
          <Line {...c} x1={6} y1={6} x2={18} y2={18} />
          <Line {...c} x1={18} y1={6} x2={6} y2={18} />
        </G>
      );
    case 'search':
      return (
        <G>
          <Circle {...c} cx={11} cy={11} r={7} />
          <Line {...c} x1={16} y1={16} x2={21} y2={21} />
        </G>
      );
  }
}
