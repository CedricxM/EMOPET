'use client';

import type { ReactNode } from 'react';
import { I18nProvider } from '../lib/i18n';

/**
 * Client-side providers wrapper. HeroUI v3 est headless (React Aria) et ne
 * requiert pas de provider. Héberge le provider i18n (FR/EN).
 */
export function Providers({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}
