'use client';

/**
 * Contexte i18n (client). Détection : préférence localStorage → navigateur → FR.
 * Changement manuel persisté. `t(ns, key)` typé (clé inconnue = erreur compile).
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Dict } from './dictionaries';
import { DEFAULT_LOCALE, detectLocale, isLocale, translate } from './translate';
import type { Locale } from './translate';

const LS_KEY = 'breiz-locale';

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: <NS extends keyof Dict>(ns: NS, key: keyof Dict[NS] & string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  t: (ns, key) => translate(DEFAULT_LOCALE, ns, key),
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(LS_KEY); } catch { /* indisponible */ }
    const nav = typeof navigator !== 'undefined' ? navigator.language : null;
    const detected = detectLocale(saved, nav);
    setLocaleState(detected);
    document.documentElement.lang = detected;
  }, []);

  const setLocale = useCallback((l: Locale) => {
    if (!isLocale(l)) return;
    setLocaleState(l);
    try { localStorage.setItem(LS_KEY, l); } catch { /* indisponible */ }
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    <NS extends keyof Dict>(ns: NS, key: keyof Dict[NS] & string) => translate(locale, ns, key),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
