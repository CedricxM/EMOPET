export interface MeterProps {
  value: number;
  max?: number;
  tone?: 'accent' | 'accent2' | 'degraded' | 'suppressed';
  height?: number;
  /**
   * Ce que la barre mesure, en toutes lettres.
   *
   * `role="meter"` tire son nom de cette propriété et de nulle part ailleurs :
   * sans elle, un lecteur d'écran annonce le nombre nu — « 86 » — sans dire de
   * quoi. Le `tone` ne comble pas ce vide : une couleur ne s'annonce pas.
   */
  label: string;
  /** Lu à la place du nombre brut, quand l'unité change ce qu'il signifie. */
  valueText?: string;
}

const COLORS = {
  accent: 'var(--accent)',
  accent2: 'var(--accent-2)',
  degraded: 'var(--eli-degraded)',
  suppressed: 'var(--eli-suppressed)',
};

export function Meter({ value, max = 100, tone = 'accent', height = 6, label, valueText }: MeterProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      {...(valueText ? { 'aria-valuetext': valueText } : {})}
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
