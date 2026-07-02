export interface MeterProps {
  value: number;
  max?: number;
  tone?: 'accent' | 'accent2' | 'degraded' | 'suppressed';
  height?: number;
}

const COLORS = {
  accent: 'var(--accent)',
  accent2: 'var(--accent-2)',
  degraded: 'var(--eli-degraded)',
  suppressed: 'var(--eli-suppressed)',
};

export function Meter({ value, max = 100, tone = 'accent', height = 6 }: MeterProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      style={{
        width: '100%',
        height,
        borderRadius: 'var(--radius-pill)',
        background: 'var(--bg-sunk)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: COLORS[tone],
          transition: `width var(--dur-med) var(--ease-out)`,
        }}
      />
    </div>
  );
}
