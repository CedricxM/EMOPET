'use client';

/** Atomes UI de la vue Bien-être ELI v6 (Sprint 03). SVG maison, pas de dépendance graphe. */

import { CONFIDENCE_META, RGPD_NOTICE, SCIENTIFIC_FOOTER } from '../../lib/eli/catalog';
import type { ConfidenceState } from '../../lib/eli/catalog';

export function ConfidenceBadge({ state, size = 'md' }: { state: ConfidenceState; size?: 'sm' | 'md' }) {
  const m = CONFIDENCE_META[state];
  const pad = size === 'sm' ? '2px 8px' : '4px 10px';
  const fs = size === 'sm' ? 10 : 11;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: pad,
        borderRadius: 'var(--radius-pill)',
        background: m.bg,
        color: m.color,
        fontFamily: 'var(--font-mono)',
        fontSize: fs,
        fontWeight: 600,
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: m.color }} />
      {m.label}
    </span>
  );
}

/** Jauge circulaire 0-100 avec repère baseline. */
export function Gauge({ value, baseline, color = 'var(--terracotta-500)', label }: { value: number; baseline?: number; color?: string; label?: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const size = 140;
  const cx = size / 2;
  // Repère baseline (angle sur le cercle, départ à -90°).
  const baseAngle = baseline != null ? (-90 + (Math.max(0, Math.min(100, baseline)) / 100) * 360) * (Math.PI / 180) : null;
  const tick = baseAngle != null ? { x1: cx + (r - 7) * Math.cos(baseAngle), y1: cx + (r - 7) * Math.sin(baseAngle), x2: cx + (r + 7) * Math.cos(baseAngle), y2: cx + (r + 7) * Math.sin(baseAngle) } : null;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label ?? 'Indicateur'} : ${value.toFixed(1)} sur 100`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--cream-300)" strokeWidth="10" />
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform={`rotate(-90 ${cx} ${cx})`}
      />
      {tick && <line x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} stroke="var(--granit-500)" strokeWidth="2" strokeDasharray="2 2" />}
      <text x={cx} y={cx - 2} textAnchor="middle" fontFamily="var(--font-serif)" fontSize="32" fill="var(--fg-strong)">
        {value.toFixed(0)}
      </text>
      <text x={cx} y={cx + 18} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" letterSpacing="0.12em" fill="var(--fg-muted)">
        /100
      </text>
    </svg>
  );
}

/** Mini-courbe SVG (7 derniers points par défaut). */
export function Sparkline({ data, color = 'var(--terracotta-500)', width = 120, height = 36 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(1, max - min);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DeltaText({ delta }: { delta: number }) {
  const positive = delta >= 0;
  return (
    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semi)', color: positive ? 'var(--lichen-700)' : 'var(--orange-pro)' }}>
      {positive ? '+' : ''}{delta.toFixed(1)} vs baseline
    </span>
  );
}

export function ScientificFooter() {
  return (
    <footer style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--divider)', paddingTop: 16, marginTop: 8 }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6, color: 'var(--fg-muted)', letterSpacing: '0.02em' }}>
        {SCIENTIFIC_FOOTER}
      </p>
      <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 12, fontStyle: 'italic', color: 'var(--fg-muted)' }}>
        {RGPD_NOTICE}
      </p>
    </footer>
  );
}
