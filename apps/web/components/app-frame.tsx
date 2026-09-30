'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useI18n } from '../lib/i18n';
import { Sidebar } from './sidebar';
import { BreizDock } from './breiz/BreizDock';
import styles from './app-shell.module.css';

const SKIP_LINK_CLASS =
  'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] ' +
  'focus:px-4 focus:py-2 focus:bg-[#141C25] focus:text-white focus:rounded-lg';

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const isLanding = pathname === '/';

  if (isLanding) {
    return (
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={SKIP_LINK_CLASS}>
        {t('nav', 'skipToContent')}
      </a>
      <Sidebar />
      <main id="main-content" tabIndex={-1} className={styles.main}>{children}</main>
      {/* Breiz compagnon : accès global sur toutes les pages applicatives (pas la landing). */}
      <BreizDock />
    </div>
  );
}
