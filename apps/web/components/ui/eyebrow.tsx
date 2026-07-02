import type { ReactNode } from 'react';

export type EyebrowTone = 'default' | 'accent' | 'accent2' | 'onDark';

const TONES: Record<EyebrowTone, string> = {
  default: 'var(--fg-2)',
  accent: 'var(--accent-press)',
  accent2: 'var(--lichen-700)',
  onDark: 'var(--cream-300)',
};

export interface EyebrowProps {
  tone?: EyebrowTone;
  children: ReactNode;
}

export function Eyebrow({ tone = 'default', children }: EyebrowProps) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-xxs)',
        fontWeight: 'var(--weight-semi)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: TONES[tone],
      }}
    >
      {children}
    </span>
  );
}
