'use client';

import type { TabKey } from './tab-bar';
import { T } from './tokens';

export type VariantsByTab = {
  home: 'normal' | 'suppressed' | 'firstLaunch';
  chat: 'normal' | 'empty';
  journal: 'normal' | 'empty';
  local: 'normal' | 'empty';
  profile: 'normal';
};

const VARIANT_LABELS: Record<TabKey, Array<{ value: string; label: string }>> = {
  home: [
    { value: 'normal', label: 'Normal' },
    { value: 'suppressed', label: 'Signal insuffisant' },
    { value: 'firstLaunch', label: 'Premier lancement' },
  ],
  chat: [
    { value: 'normal', label: 'Conversation' },
    { value: 'empty', label: 'Vide' },
  ],
  journal: [
    { value: 'normal', label: 'Avec entrées' },
    { value: 'empty', label: 'Vide' },
  ],
  local: [
    { value: 'normal', label: 'Avec services' },
    { value: 'empty', label: 'Urgences vides' },
  ],
  profile: [{ value: 'normal', label: 'Normal' }],
};

type Props = {
  activeTab: TabKey;
  variants: VariantsByTab;
  onChange: <K extends TabKey>(tab: K, value: VariantsByTab[K]) => void;
};

export function DevPanel({ activeTab, variants, onChange }: Props) {
  const options = VARIANT_LABELS[activeTab];
  const current = variants[activeTab];
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 16,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        minWidth: 260,
        boxShadow: '0 4px 12px rgba(31,42,54,0.06)',
      }}
    >
      <div
        style={{
          fontFamily: T.fontSans,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: T.fgMuted,
        }}
      >
        Dev · {activeTab}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map((o) => {
          const isActive = o.value === current;
          return (
            <button
              key={o.value}
              onClick={() => onChange(activeTab, o.value as VariantsByTab[TabKey])}
              style={{
                padding: '6px 11px',
                borderRadius: 999,
                border: `1px solid ${isActive ? T.accent : T.border}`,
                background: isActive ? T.accentSoft : T.cream50,
                color: isActive ? T.accentPress : T.fg2,
                fontFamily: T.fontSans,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <div
        style={{
          fontFamily: T.fontSans,
          fontSize: 11,
          color: T.fgMuted,
          lineHeight: 1.5,
        }}
      >
        Basculez les variantes par onglet pour visualiser chaque état. Palette ELI : jamais de rouge sur SUPPRESSED.
      </div>
    </div>
  );
}
