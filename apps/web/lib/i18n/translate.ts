/**
 * Cœur i18n pur (sans React, testable) : résolution de clé + formatage localisé.
 */

import { DICTIONARIES } from './dictionaries';
import type { Dict } from './dictionaries';

export type Locale = 'fr' | 'en';
export const LOCALES: Locale[] = ['fr', 'en'];
export const DEFAULT_LOCALE: Locale = 'fr';

export function isLocale(x: unknown): x is Locale {
  return x === 'fr' || x === 'en';
}

/** Résout une clé `ns.key` dans la locale, avec repli sur la locale par défaut. */
export function translate<NS extends keyof Dict>(locale: Locale, ns: NS, key: keyof Dict[NS] & string): string {
  const table = (DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE])[ns] as Record<string, string>;
  const fallback = DICTIONARIES[DEFAULT_LOCALE][ns] as Record<string, string>;
  return table[key] ?? fallback[key] ?? key;
}

function intlLocale(locale: Locale): string {
  return locale === 'fr' ? 'fr-FR' : 'en-US';
}

export function formatNumberLocale(n: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(n);
}

/** Distance localisée (l'app reste en km ; seul le format du nombre change). */
export function formatDistanceLocale(meters: number, locale: Locale): string {
  if (meters >= 1000) return `${formatNumberLocale(Math.round((meters / 1000) * 10) / 10, locale)} km`;
  return `${formatNumberLocale(meters, locale)} m`;
}

export function formatDateLocale(iso: string, locale: Locale, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString(intlLocale(locale), opts ?? { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Détection initiale : préférence sauvegardée → langue navigateur → défaut. */
export function detectLocale(saved: string | null | undefined, navLang: string | null | undefined): Locale {
  if (isLocale(saved)) return saved;
  if (navLang && navLang.slice(0, 2).toLowerCase() === 'en') return 'en';
  return DEFAULT_LOCALE;
}
