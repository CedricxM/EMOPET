import type { SVGProps } from 'react';

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
  | 'search'
  | 'download'
  | 'calendar'
  | 'filter'
  | 'activity'
  | 'users'
  | 'phone';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.5, ...rest }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest,
  };
  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
        </svg>
      );
    case 'chat':
      return (
        <svg {...common}>
          <path d="M4 5h16v11H8l-4 4V5Z" />
        </svg>
      );
    case 'journal':
      return (
        <svg {...common}>
          <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
          <path d="M5 17a3 3 0 0 1 3-3h11" />
        </svg>
      );
    case 'compass':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m14.5 9.5-1 4-4 1 1-4 4-1Z" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c1.8-3.5 4.8-5 8-5s6.2 1.5 8 5" />
        </svg>
      );
    case 'signal':
      return (
        <svg {...common}>
          <path d="M3 17h3v3H3zM9 12h3v8H9zM15 7h3v13h-3z" />
        </svg>
      );
    case 'mat':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M7 10v4M12 10v4M17 10v4" />
        </svg>
      );
    case 'tag':
      return (
        <svg {...common}>
          <path d="M4 12V5a1 1 0 0 1 1-1h7l8 8-8 8-8-8Z" />
          <circle cx="8.5" cy="8.5" r="1" />
        </svg>
      );
    case 'wave':
      return (
        <svg {...common}>
          <path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" />
        </svg>
      );
    case 'info':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      );
    case 'chevron':
      return (
        <svg {...common}>
          <path d="m9 6 6 6-6 6" />
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
          <path d="m4 12 16-8-5 16-4-6-7-2Z" />
        </svg>
      );
    case 'close':
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case 'download':
      return (
        <svg {...common}>
          <path d="M12 4v12M6 12l6 4 6-4M4 20h16" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case 'filter':
      return (
        <svg {...common}>
          <path d="M4 5h16l-6 8v6l-4-2v-4L4 5Z" />
        </svg>
      );
    case 'activity':
      return (
        <svg {...common}>
          <path d="M3 12h4l3 8 4-16 3 8h4" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19c1-3 3-4.3 5.5-4.3S13.5 16 14.5 19" />
          <path d="M16 5.2a3.2 3.2 0 0 1 0 6M17.5 14.7c2.2.3 3.7 1.6 4.5 4.3" />
        </svg>
      );
    case 'phone':
      return (
        <svg {...common}>
          <path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z" />
        </svg>
      );
  }
}
