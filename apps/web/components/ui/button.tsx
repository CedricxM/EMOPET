'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useState } from 'react';

export type ButtonKind = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'accent2';
export type ButtonSize = 'sm' | 'md';

const KINDS: Record<ButtonKind, { bg: string; bgHover: string; bgPress: string; ink: string; border: string }> = {
  primary: {
    bg: 'var(--emopet-navy)',
    bgHover: 'var(--granit-700)',
    bgPress: 'var(--granit-900)',
    ink: 'var(--fg-on-dark)',
    border: 'transparent',
  },
  accent: {
    bg: 'var(--accent)',
    // Encre navy (AA) : les états hover/press s'ÉCLAIRCISSENT (une encre foncée
    // veut un fond plus clair) au lieu de foncer. Tous les états ≥ 4.5:1.
    bgHover: 'var(--terracotta-400)',
    bgPress: 'var(--terracotta-300)',
    ink: 'var(--accent-ink)',
    border: 'transparent',
  },
  secondary: {
    bg: 'var(--surface)',
    bgHover: 'var(--bg-sunk)',
    bgPress: 'var(--cream-300)',
    ink: 'var(--fg-strong)',
    border: 'var(--border)',
  },
  outline: {
    bg: 'transparent',
    bgHover: 'color-mix(in srgb, var(--emopet-navy) 7%, transparent)',
    bgPress: 'color-mix(in srgb, var(--emopet-navy) 12%, transparent)',
    ink: 'var(--emopet-navy)',
    border: 'var(--emopet-navy)',
  },
  ghost: {
    bg: 'transparent',
    bgHover: 'var(--bg-sunk)',
    bgPress: 'var(--cream-300)',
    ink: 'var(--fg)',
    border: 'transparent',
  },
  accent2: {
    bg: 'var(--accent-2)',
    // Idem accent : encre navy → hover/press plus clairs (≥ 4.5:1 partout).
    bgHover: 'var(--lichen-400)',
    bgPress: 'var(--lichen-300)',
    ink: 'var(--accent-2-ink)',
    border: 'transparent',
  },
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: ButtonKind;
  size?: ButtonSize;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function Button({
  kind = 'primary',
  size = 'md',
  leading,
  trailing,
  children,
  style,
  ...rest
}: ButtonProps) {
  const k = KINDS[kind];
  const [state, setState] = useState<'idle' | 'hover' | 'press'>('idle');
  const bg = state === 'press' ? k.bgPress : state === 'hover' ? k.bgHover : k.bg;
  const h = size === 'sm' ? 32 : 40;
  const fs = size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)';
  return (
    <button
      {...rest}
      onMouseEnter={() => setState('hover')}
      onMouseLeave={() => setState('idle')}
      onMouseDown={() => setState('press')}
      onMouseUp={() => setState('hover')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: h,
        padding: '0 16px',
        borderRadius: 'var(--radius-md)',
        background: bg,
        color: k.ink,
        border: `1px solid ${k.border}`,
        fontFamily: 'var(--font-sans)',
        fontSize: fs,
        fontWeight: 'var(--weight-semi)',
        lineHeight: 1,
        cursor: 'pointer',
        transition: `background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)`,
        ...style,
      }}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
}
