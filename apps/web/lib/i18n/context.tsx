'use client';

/**
 * Contexte i18n (client).
 *
 * La langue est désormais DÉCIDÉE PAR LE SERVEUR et transmise en `initialLocale` :
 * le premier rendu client est donc identique au HTML reçu. Avant, ce provider
 * détectait la langue dans un `useEffect`, c'est-à-dire APRÈS le premier rendu —
 * d'où une bascule visible du français vers l'anglais chez tout visiteur non
 * francophone, et un attribut `lang` faux jusqu'à l'hydratation.
 *
 * Persistance : un COOKIE, parce que c'est la seule forme que le serveur peut
 * relire au rendu suivant. `localStorage` est conservé en lecture pour migrer le
 * choix des visiteurs qui en avaient déjà un, une seule fois.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Dict } from './dictionaries';
import { DEFAULT_LOCALE, isLocale, translate } from './translate';
import type { Locale } from './translate';

const LS_KEY = 'breiz-locale';
/** Doit rester identique à `LOCALE_COOKIE` de `./server`. Le test le vérifie. */
const COOKIE_KEY = 'emopet-locale';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

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

function writeCookie(l: Locale): void {
  try {
    document.cookie = `${COOKIE_KEY}=${l}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  } catch {
    /* indisponible : le serveur retombera sur Accept-Language */
  }
}

function readCookie(): string | null {
  try {
    const hit = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE_KEY}=`));
    return hit ? (hit.split('=')[1] ?? null) : null;
  } catch {
    return null;
  }
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    // Migration unique : un visiteur qui avait déjà choisi sa langue avant que le
    // cookie existe garde son choix. Sans cela, son préréglage serait perdu et
    // silencieusement remplacé par l'en-tête du navigateur.
    if (readCookie()) return;

    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LS_KEY);
    } catch {
      /* indisponible */
    }
    if (!isLocale(saved)) return;

    writeCookie(saved);
    if (saved !== locale) {
      setLocaleState(saved);
      document.documentElement.lang = saved;
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    if (!isLocale(l)) return;
    setLocaleState(l);
    writeCookie(l);
    try {
      localStorage.setItem(LS_KEY, l);
    } catch {
      /* indisponible */
    }
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
