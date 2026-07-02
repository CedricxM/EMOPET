/* eslint-disable @next/next/no-img-element -- BrandLogo supports mixed SVG/PNG logo assets with dynamic sizing. */
import type { CSSProperties, ReactNode } from 'react';

export type BrandLogoVariant = 'navy' | 'white';
export type BrandLogoMode = 'lockup' | 'mark';

export interface BrandLogoProps {
  variant?: BrandLogoVariant;
  mode?: BrandLogoMode;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
}

const LOGO_SRC: Record<BrandLogoVariant, Record<BrandLogoMode, string>> = {
  navy: {
    lockup: '/assets/brand/emopet-logo-dark.png',
    mark: '/assets/brand/emopet-logo-mark.svg',
  },
  white: {
    lockup: '/assets/brand/emopet-logo-white.svg',
    mark: '/assets/brand/app-icon.svg',
  },
};

export function BrandLogo({
  variant = 'navy',
  mode = 'lockup',
  width,
  height,
  className,
  style,
  priority = false,
}: BrandLogoProps) {
  const intrinsicWidth = width ?? (mode === 'mark' ? 44 : 148);
  return (
    <img
      className={className}
      src={LOGO_SRC[variant][mode]}
      alt={mode === 'mark' ? 'EMOPET' : 'EMOPET - Smart care. Strong bond.'}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      style={{
        display: 'block',
        width: intrinsicWidth,
        height: height ?? 'auto',
        objectFit: 'contain',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export interface WavePatternProps {
  tone?: 'dark' | 'light';
  opacity?: number;
  className?: string;
  style?: CSSProperties;
}

export function WavePattern({ tone = 'dark', opacity = 1, className, style }: WavePatternProps) {
  const navy = tone === 'dark' ? 'var(--cream-50)' : 'var(--emopet-navy)';
  const teal = 'var(--emopet-teal)';
  const orange = 'var(--emopet-orange)';
  return (
    <svg
      className={className}
      aria-hidden
      viewBox="0 0 960 320"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity,
        ...style,
      }}
    >
      <path
        d="M-40 190C50 110 130 116 220 192S390 275 492 180 704 64 832 162s188 90 250 16"
        stroke={teal}
        strokeWidth="2"
        fill="none"
        opacity="0.42"
      />
      <path
        d="M-40 232C70 134 150 148 242 222s176 80 278-8 206-126 330-32 180 78 232 0"
        stroke={navy}
        strokeWidth="1.4"
        fill="none"
        opacity="0.22"
      />
      <path
        d="M-30 148C62 84 152 80 244 154s178 78 278-4 204-112 322-18 178 76 236 8"
        stroke={orange}
        strokeWidth="2"
        fill="none"
        opacity="0.34"
      />
      <path
        d="M520 188c-30 0-52-20-52-48 0-24 19-43 43-43 20 0 36 16 36 35 0 17-13 30-30 30-13 0-24-11-24-24 0-9 7-17 16-17"
        stroke={teal}
        strokeWidth="2"
        fill="none"
        opacity="0.45"
        strokeLinecap="round"
      />
      <circle cx="526" cy="139" r="4" fill={orange} opacity="0.8" />
      <circle cx="196" cy="190" r="3" fill={teal} opacity="0.55" />
      <circle cx="750" cy="164" r="3" fill={navy} opacity="0.35" />
    </svg>
  );
}

export interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  tone?: 'cream' | 'navy' | 'teal' | 'orange';
  confidence?: string;
  icon?: ReactNode;
}

const METRIC_TONE: Record<NonNullable<MetricCardProps['tone']>, { bg: string; ink: string; muted: string; border: string; accent: string }> = {
  cream: {
    bg: 'var(--surface)',
    ink: 'var(--fg-strong)',
    muted: 'var(--fg-muted)',
    border: 'var(--border)',
    accent: 'var(--emopet-orange)',
  },
  navy: {
    bg: 'var(--emopet-navy)',
    ink: 'var(--cream-50)',
    muted: 'color-mix(in srgb, var(--cream-50) 72%, transparent)',
    border: 'rgba(246, 239, 231, 0.18)',
    accent: 'var(--emopet-orange)',
  },
  teal: {
    bg: 'var(--accent-2-soft)',
    ink: 'var(--fg-strong)',
    muted: 'var(--fg-2)',
    border: 'var(--accent-2-soft-border)',
    accent: 'var(--emopet-teal)',
  },
  orange: {
    bg: 'var(--accent-soft)',
    ink: 'var(--fg-strong)',
    muted: 'var(--fg-2)',
    border: 'var(--accent-soft-border)',
    accent: 'var(--emopet-orange)',
  },
};

export function MetricCard({ label, value, detail, tone = 'cream', confidence, icon }: MetricCardProps) {
  const t = METRIC_TONE[tone];
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 170,
        padding: 20,
        borderRadius: 'var(--radius-lg)',
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: t.ink,
        boxShadow: tone === 'cream' ? 'var(--shadow-sm)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: t.muted,
          }}
        >
          {label}
        </span>
        {icon && <span style={{ color: t.accent, display: 'inline-flex' }}>{icon}</span>}
      </div>
      <strong
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-3xl)',
          lineHeight: 1.1,
          color: t.ink,
          fontWeight: 700,
        }}
      >
        {value}
      </strong>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', lineHeight: 1.6, color: t.muted }}>
        {detail}
      </span>
      {confidence && (
        <span
          style={{
            marginTop: 'auto',
            alignSelf: 'flex-start',
            padding: '5px 9px',
            borderRadius: 'var(--radius-pill)',
            background: tone === 'navy' ? 'rgba(246, 239, 231, 0.12)' : 'rgba(255, 255, 255, 0.5)',
            border: `1px solid ${t.border}`,
            color: t.muted,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {confidence}
        </span>
      )}
    </div>
  );
}
