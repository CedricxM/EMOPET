'use client';

export function DemoBanner() {
  return (
    <div
      role="status"
      aria-label="Mode démonstration EMOPET"
      style={{
        width: '100%',
        minHeight: 34,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-sunk)',
        color: 'var(--fg-2)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-semi)',
        letterSpacing: '0.02em',
      }}
    >
      DÉMONSTRATION MVP · DONNÉES CONTRÔLÉES / SIMULÉES · NON CLINIQUE · PAS UNE RELEASE PRODUIT
    </div>
  );
}
