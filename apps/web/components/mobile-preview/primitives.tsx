'use client';

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { animatePress } from './animations';
import { MPIcon } from './icon';
import { T } from './tokens';

/* ---------------- Pill ---------------- */

export type PillState = 'valid' | 'degraded' | 'suppressed';

type PillProps = {
  state: PillState;
  label?: string;
  showDot?: boolean;
  style?: CSSProperties;
};

const PILL_STYLES: Record<PillState, { bg: string; ink: string; dot: string; label: string }> = {
  valid: { bg: T.eliValidBg, ink: T.eliValidInk, dot: T.eliValid, label: 'ELI valide' },
  degraded: { bg: T.eliDegradedBg, ink: T.eliDegradedInk, dot: T.eliDegraded, label: 'ELI dégradé' },
  suppressed: {
    bg: T.eliSuppressedBg,
    ink: T.eliSuppressedInk,
    dot: T.eliSuppressed,
    label: 'Signal insuffisant',
  },
};

export function MPPill({ state, label, showDot = true, style }: PillProps) {
  const s = PILL_STYLES[state];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 9px',
        borderRadius: 999,
        background: s.bg,
        color: s.ink,
        fontFamily: T.fontSans,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {showDot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: s.dot,
            display: 'inline-block',
          }}
        />
      )}
      {label ?? s.label}
    </span>
  );
}

/* ---------------- Eyebrow ---------------- */

export function MPEyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span
      style={{
        fontFamily: T.fontSans,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: T.fgMuted,
        display: 'inline-block',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ---------------- Card ---------------- */

type CardProps = {
  children: ReactNode;
  pad?: number;
  tone?: 'default' | 'soft' | 'suppressed' | 'accent';
  bordered?: boolean;
  reveal?: boolean;
  style?: CSSProperties;
};

export function MPCard({
  children,
  pad = 18,
  tone = 'default',
  bordered = false,
  reveal = false,
  style,
}: CardProps) {
  let bg: string = T.surface;
  let borderColor: string = T.border;
  let ink: string | undefined;
  if (tone === 'soft') {
    bg = T.accent2Soft;
    borderColor = T.accent2SoftBorder;
  } else if (tone === 'suppressed') {
    bg = T.eliSuppressedBg;
    borderColor = T.eliSuppressedBg;
    ink = T.eliSuppressedInk;
  } else if (tone === 'accent') {
    bg = T.accentSoft;
    borderColor = T.accentSoftBorder;
  }
  return (
    <div
      {...(reveal ? { 'data-reveal': '' } : {})}
      style={{
        background: bg,
        border: bordered ? `1px solid ${borderColor}` : '1px solid ' + T.border,
        borderRadius: 14,
        padding: pad,
        boxShadow: tone === 'suppressed' ? 'none' : '0 1px 2px rgba(31,42,54,0.05)',
        color: ink,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ---------------- Button ---------------- */

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'accent2';
type ButtonSize = 'sm' | 'md';

type MPButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: ButtonKind;
  size?: ButtonSize;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function MPButton({
  kind = 'primary',
  size = 'md',
  leading,
  trailing,
  onClick,
  children,
  style,
  ...rest
}: MPButtonProps) {
  const height = size === 'sm' ? 32 : 40;
  const px = size === 'sm' ? 12 : 16;
  const fontSize = size === 'sm' ? 12 : 13;

  let bg: string = T.accent;
  let color: string = '#FFFFFF';
  let border: string = `1px solid ${T.accent}`;

  if (kind === 'secondary') {
    bg = T.surface;
    color = T.fgStrong;
    border = `1px solid ${T.border}`;
  } else if (kind === 'ghost') {
    bg = 'transparent';
    color = T.fg;
    border = '1px solid transparent';
  } else if (kind === 'accent2') {
    bg = T.accent2;
    color = '#FFFFFF';
    border = `1px solid ${T.accent2}`;
  }

  return (
    <button
      {...rest}
      onClick={(e) => {
        animatePress(e.currentTarget);
        onClick?.(e);
      }}
      style={{
        height,
        padding: `0 ${px}px`,
        borderRadius: 10,
        background: bg,
        color,
        border,
        cursor: 'pointer',
        fontFamily: T.fontSans,
        fontSize,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        transition: 'background 120ms cubic-bezier(0.2,0.7,0.2,1)',
        ...style,
      }}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
}

/* ---------------- Disclaimer (prudence bandeau) ---------------- */

export function MPDisclaimer({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: '10px 14px',
        borderRadius: 10,
        background: T.prudenceBg,
        border: `1px solid ${T.prudenceBorder}`,
        color: T.prudenceInk,
        fontFamily: T.fontSans,
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      <MPIcon name="info" size={14} color={T.prudenceInk} />
      <span>{children}</span>
    </div>
  );
}
