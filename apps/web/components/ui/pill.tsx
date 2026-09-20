import type { ReactNode } from 'react';

export type PillState = 'valid' | 'degraded' | 'suppressed';

/** Exporté pour que la carte ELI du tableau de bord puisse préfixer le libellé
 *  sans redéclarer la table. Aucun changement de comportement. */
export const PILL_LABELS: Record<PillState, string> = {
  valid: 'Valide',
  degraded: 'Dégradé',
  suppressed: 'Supprimé',
};

const STYLES: Record<PillState, { bg: string; ink: string; dot: string }> = {
  valid: { bg: 'var(--eli-valid-bg)', ink: 'var(--eli-valid-ink)', dot: 'var(--eli-valid)' },
  degraded: { bg: 'var(--eli-degraded-bg)', ink: 'var(--eli-degraded-ink)', dot: 'var(--eli-degraded)' },
  suppressed: { bg: 'var(--eli-suppressed-bg)', ink: 'var(--eli-suppressed-ink)', dot: 'var(--eli-suppressed)' },
};

export interface PillProps {
  state: PillState;
  label?: ReactNode;
  showDot?: boolean;
}

export function Pill({ state, label, showDot = true }: PillProps) {
  const s = STYLES[state];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 'var(--radius-pill)',
        background: s.bg,
        color: s.ink,
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-xxs)',
        fontWeight: 'var(--weight-semi)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        lineHeight: 1,
      }}
    >
      {showDot && (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: 'var(--radius-pill)',
            background: s.dot,
            display: 'inline-block',
          }}
        />
      )}
      {label ?? PILL_LABELS[state]}
    </span>
  );
}
