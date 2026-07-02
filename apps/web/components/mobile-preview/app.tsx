'use client';

import { useState } from 'react';
import { useTabTransition } from './animations';
import { DevPanel, type VariantsByTab } from './dev-panel';
import { IOSDevice } from './ios-frame';
import { ChatScreenEmpty, ChatScreenNormal } from './screens/chat';
import {
  HomeScreenFirstLaunch,
  HomeScreenNormal,
  HomeScreenSuppressed,
} from './screens/home';
import { JournalScreenEmpty, JournalScreenNormal } from './screens/journal';
import { LocalScreenEmpty, LocalScreenNormal } from './screens/local';
import { ProfileScreen } from './screens/profile';
import { TabBar, type TabKey } from './tab-bar';
import { T } from './tokens';

const INITIAL_VARIANTS: VariantsByTab = {
  home: 'normal',
  chat: 'normal',
  journal: 'normal',
  local: 'normal',
  profile: 'normal',
};

function renderScreen(tab: TabKey, variants: VariantsByTab) {
  switch (tab) {
    case 'home':
      if (variants.home === 'suppressed') return <HomeScreenSuppressed />;
      if (variants.home === 'firstLaunch') return <HomeScreenFirstLaunch />;
      return <HomeScreenNormal />;
    case 'chat':
      return variants.chat === 'empty' ? <ChatScreenEmpty /> : <ChatScreenNormal />;
    case 'journal':
      return variants.journal === 'empty' ? <JournalScreenEmpty /> : <JournalScreenNormal />;
    case 'local':
      return variants.local === 'empty' ? <LocalScreenEmpty /> : <LocalScreenNormal />;
    case 'profile':
      return <ProfileScreen />;
    default:
      return null;
  }
}

export function MobilePreviewApp() {
  const [tab, setTab] = useState<TabKey>('home');
  const [variants, setVariants] = useState<VariantsByTab>(INITIAL_VARIANTS);
  const transitionKey = `${tab}-${variants[tab]}`;
  const screenRef = useTabTransition(transitionKey);

  const handleVariantChange = <K extends TabKey>(t: K, value: VariantsByTab[K]) => {
    setVariants((prev) => ({ ...prev, [t]: value }));
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: `radial-gradient(1200px 600px at 20% 0%, ${T.cream50} 0%, ${T.cream100} 55%, ${T.cream200} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 48,
        padding: '40px 24px',
        flexWrap: 'wrap',
      }}
    >
      <IOSDevice>
        <div ref={screenRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {renderScreen(tab, variants)}
        </div>
        <TabBar active={tab} onChange={setTab} />
      </IOSDevice>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 320 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontFamily: T.fontSans,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: T.fgMuted,
            }}
          >
            EMOPET · mobile preview
          </span>
          <span
            style={{
              fontFamily: T.fontSerif,
              fontSize: 28,
              fontWeight: 500,
              color: T.fgStrong,
              letterSpacing: 0,
              lineHeight: 1.2,
            }}
          >
            v0.3 — iOS 26
          </span>
          <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.fg2, lineHeight: 1.55 }}>
            Gwen, Épagneul breton — Lorient. Design system canonique : navy / cream / orange / teal.
            Sora pour l’interface, JetBrains Mono pour les données. Animations réduites si l’OS le demande.
          </span>
        </div>

        <DevPanel activeTab={tab} variants={variants} onChange={handleVariantChange} />

        <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.fgMuted, lineHeight: 1.55 }}>
          Sidebar → Dashboard / Breiz / Journal / Local / Rapport / Profil pour la version bureau complète.
        </span>
      </div>
    </div>
  );
}
