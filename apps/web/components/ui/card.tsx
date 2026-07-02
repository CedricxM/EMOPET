import type { CSSProperties, ReactNode } from 'react';

export type CardTone = 'surface' | 'navy' | 'accentSoft' | 'accent2Soft' | 'sunk' | 'suppressed';

const TONES: Record<CardTone, { bg: string; border: string; ink?: string }> = {
  surface: { bg: 'var(--surface)', border: 'var(--border)' },
  navy: { bg: 'var(--emopet-navy)', border: 'rgba(246, 239, 231, 0.16)', ink: 'var(--fg-on-dark)' },
  accentSoft: { bg: 'var(--accent-soft)', border: 'var(--accent-soft-border)' },
  accent2Soft: { bg: 'var(--accent-2-soft)', border: 'var(--accent-2-soft-border)' },
  sunk: { bg: 'var(--bg-sunk)', border: 'var(--border)' },
  suppressed: { bg: 'var(--eli-suppressed-bg)', border: 'var(--border)' },
};

export interface CardProps {
  tone?: CardTone;
  bordered?: boolean;
  padding?: number | string;
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
}

export function Card({
  tone = 'surface',
  bordered = true,
  padding = 'var(--space-5)',
  children,
  style,
  onClick,
}: CardProps) {
  const t = TONES[tone];
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      style={{
        background: t.bg,
        border: bordered ? `1px solid ${t.border}` : '1px solid transparent',
        boxShadow: bordered ? 'none' : 'var(--shadow-sm)',
        borderRadius: 'var(--radius-lg)',
        padding,
        textAlign: 'left',
        width: '100%',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: 'inherit',
        color: t.ink ?? 'inherit',
        transition: `background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)`,
        ...style,
      }}
    >
      {children}
    </Component>
  );
}
