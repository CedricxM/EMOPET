'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useI18n } from '../lib/i18n';
import { Sidebar } from './sidebar';
import { BreizDock } from './breiz/BreizDock';

/**
 * Classes du lien d'évitement, reprises telles quelles de la landing
 * (`app/page.tsx`), qui en portait déjà un : invisible tant qu'il n'a pas le
 * focus, pleinement visible dès qu'un clavier l'atteint.
 */
const SKIP_LINK_CLASS =
  'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] ' +
  'focus:px-4 focus:py-2 focus:bg-[#141C25] focus:text-white focus:rounded-lg';

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const isLanding = pathname === '/';

  if (isLanding) {
    // `app/page.tsx` rend déjà son propre <main> : en poser un second ici
    // imbriquait deux régions principales, mesurées sur la page d'accueil.
    return (
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sans ce lien, atteindre le contenu demandait 9 tabulations sur chacune
          des huit routes : la sidebar est parcourue en entier à chaque page. */}
      <a href="#main-content" className={SKIP_LINK_CLASS}>
        {t('nav', 'skipToContent')}
      </a>
      <Sidebar />
      <main
        id="main-content"
        tabIndex={-1}
        style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </main>
      {/* Breiz compagnon : accès global sur toutes les pages applicatives (pas la landing). */}
      <BreizDock />
    </div>
  );
}
