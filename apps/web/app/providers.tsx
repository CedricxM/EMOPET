'use client';

import type { ReactNode } from 'react';
import { I18nProvider } from '../lib/i18n';
import type { Locale } from '../lib/i18n';

/**
 * Client-side providers wrapper. HeroUI v3 est headless (React Aria) et ne
 * requiert pas de provider. Héberge le provider i18n (FR/EN).
 */
export function Providers({ children, locale }: { children: ReactNode; locale: Locale }) {
  return <I18nProvider initialLocale={locale}>{children}</I18nProvider>;
}
