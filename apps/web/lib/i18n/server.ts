import { cookies, headers } from 'next/headers';
import { resolveLocale } from './translate';
import type { Locale } from './translate';

/** Nom du cookie qui porte le choix explicite de langue. */
export const LOCALE_COOKIE = 'emopet-locale';

/**
 * Langue à utiliser pour le RENDU SERVEUR.
 *
 * Avant, le serveur rendait toujours `DEFAULT_LOCALE` et le client basculait
 * après montage : un visiteur non francophone voyait apparaître du français,
 * puis l'interface changeait de langue sous ses yeux, l'attribut `lang` restant
 * faux jusqu'à l'hydratation.
 *
 * COÛT ASSUMÉ : lire un cookie ou un en-tête fait sortir les pages du rendu
 * statique — elles deviennent dynamiques. C'est inhérent : une page mise en
 * cache pour tout le monde ne peut pas être dans la langue de chacun. Le chiffre
 * exact est relevé dans la PR ; il n'est pas caché ici.
 */
export async function getServerLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveLocale(
    cookieStore.get(LOCALE_COOKIE)?.value ?? null,
    headerStore.get('accept-language'),
  );
}
