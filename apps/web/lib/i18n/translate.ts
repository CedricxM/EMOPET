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

/**
 * Remplit les placeholders `{clé}` d'une chaîne du dictionnaire.
 *
 * Le dictionnaire reste plat : pas de moteur de gabarits, pas de dépendance.
 * Il existe parce que les énoncés d'observation portent des nombres (référence,
 * fenêtre, minutes inexploitables) et que les découper en fragments — la
 * convention employée jusqu'ici pour `recoveryIntro/Middle/Outro` — devient
 * illisible dès qu'une phrase en contient trois.
 *
 * Une clé absente est laissée VISIBLE sous sa forme `{clé}` plutôt que rendue
 * en chaîne vide : un trou dans une phrase se remarque, une valeur manquante
 * silencieuse ne se remarque pas.
 */
export function fillTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
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
/**
 * Choix de la langue du point de vue du SERVEUR, à partir de ce dont il dispose :
 * un cookie posé par un choix explicite, puis l'en-tête `Accept-Language`.
 *
 * Pure et sans dépendance à Next : c'est ce qui la rend testable, et c'est la même
 * fonction qui décide côté serveur et côté client, pour qu'ils ne puissent pas
 * diverger — la divergence étant précisément le défaut corrigé ici.
 *
 * `Accept-Language` est lu dans l'ordre de préférence déclaré, avec ses facteurs
 * de qualité : `fr;q=0.9, en;q=1.0` doit donner `en`, pas `fr`.
 */
export function resolveLocale(
  cookieValue: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (isLocale(cookieValue)) return cookieValue;

  if (acceptLanguage) {
    const ranked = acceptLanguage
      .split(',')
      .map((part) => {
        const [tag = '', ...params] = part.trim().split(';');
        const qParam = params.find((p) => p.trim().startsWith('q='));
        const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
        return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 };
      })
      .filter((entry) => entry.tag.length > 0 && entry.q > 0)
      .sort((a, b) => b.q - a.q);

    for (const { tag } of ranked) {
      if (tag === '*') break; // « n'importe laquelle » : on retombe sur le défaut
      const base = tag.slice(0, 2);
      if (isLocale(base)) return base;
    }
  }

  return DEFAULT_LOCALE;
}

export function detectLocale(saved: string | null | undefined, navLang: string | null | undefined): Locale {
  if (isLocale(saved)) return saved;
  if (navLang && navLang.slice(0, 2).toLowerCase() === 'en') return 'en';
  return DEFAULT_LOCALE;
}
