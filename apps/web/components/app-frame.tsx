'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { BreizDock } from './breiz/BreizDock';

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  if (isLanding) {
    return (
      <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>{children}</main>
      {/* Breiz compagnon : accès global sur toutes les pages applicatives (pas la landing). */}
      <BreizDock />
    </div>
  );
}
