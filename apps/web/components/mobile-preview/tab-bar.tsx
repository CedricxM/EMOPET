'use client';

import { animatePress } from './animations';
import { MPIcon, type MPIconName } from './icon';
import { T } from './tokens';

export type TabKey = 'home' | 'chat' | 'journal' | 'local' | 'profile';

type TabDef = { key: TabKey; label: string; icon: MPIconName };

const TABS: TabDef[] = [
  { key: 'home', label: 'Accueil', icon: 'home' },
  { key: 'chat', label: 'Breiz', icon: 'chat' },
  { key: 'journal', label: 'Journal', icon: 'journal' },
  { key: 'local', label: 'Local', icon: 'compass' },
  { key: 'profile', label: 'Moi', icon: 'profile' },
];

type Props = {
  active: TabKey;
  onChange: (key: TabKey) => void;
};

export function TabBar({ active, onChange }: Props) {
  return (
    <div
      style={{
        borderTop: `1px solid ${T.divider}`,
        background: T.cream50,
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        padding: '8px 6px 10px',
        flexShrink: 0,
      }}
    >
      {TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={(e) => {
              animatePress(e.currentTarget);
              onChange(t.key);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '6px 0 2px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? T.accentPress : T.fgMuted,
              fontFamily: T.fontSans,
              fontSize: 10,
              fontWeight: isActive ? 600 : 500,
            }}
          >
            <MPIcon name={t.icon} size={22} color={isActive ? T.accentPress : T.fgMuted} />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
