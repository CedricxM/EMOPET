import type { CSSProperties } from 'react';
import { T } from './tokens';

export type MPIconName =
  | 'home'
  | 'chat'
  | 'journal'
  | 'compass'
  | 'profile'
  | 'signal'
  | 'wave'
  | 'mat'
  | 'tag'
  | 'plus'
  | 'send'
  | 'chevron'
  | 'info'
  | 'empty'
  | 'filter';

type Props = {
  name: MPIconName;
  size?: number;
  color?: string;
  stroke?: number;
  style?: CSSProperties;
};

export function MPIcon({ name, size = 20, color = T.fg2, stroke = 1.5, style }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
  };
  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case 'chat':
      return (
        <svg {...common}>
          <path d="M4 6h16v10H9l-5 4V6Z" />
        </svg>
      );
    case 'journal':
      return (
        <svg {...common}>
          <path d="M5 4h11a3 3 0 0 1 3 3v13H7a2 2 0 0 1-2-2V4Z" />
          <path d="M9 8h7M9 12h7M9 16h5" />
        </svg>
      );
    case 'compass':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m9 15 2-6 6-2-2 6-6 2Z" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.6-6 8-6s6.5 2 8 6" />
        </svg>
      );
    case 'signal':
      return (
        <svg {...common}>
          <path d="M4 14c2-3 5-3 8-1s6 2 8-1" />
          <path d="M4 10c2-3 5-3 8-1s6 2 8-1" />
        </svg>
      );
    case 'wave':
      return (
        <svg {...common}>
          <path d="M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
        </svg>
      );
    case 'mat':
      return (
        <svg {...common}>
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <path d="M4 10h16M4 14h16" />
        </svg>
      );
    case 'tag':
      return (
        <svg {...common}>
          <path d="M12 3c3.5 0 6 2.8 6 6.3 0 4-6 11.7-6 11.7S6 13.3 6 9.3C6 5.8 8.5 3 12 3Z" />
          <circle cx="12" cy="9.5" r="1.6" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'send':
      return (
        <svg {...common}>
          <path d="m4 12 16-8-6 16-3-7-7-1Z" />
        </svg>
      );
    case 'chevron':
      return (
        <svg {...common}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      );
    case 'info':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01M12 12v5" />
        </svg>
      );
    case 'empty':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
        </svg>
      );
    case 'filter':
      return (
        <svg {...common}>
          <path d="M4 5h16l-6 8v6l-4-2v-4L4 5Z" />
        </svg>
      );
    default:
      return null;
  }
}
