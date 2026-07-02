/**
 * Configuration & feature flags de la couche API.
 *
 * RÈGLE : aucune clé en dur. Tout vient de l'environnement. Un provider n'est
 * appelable que si son flag est explicitement activé (défaut : OFF) ET, s'il
 * requiert une authentification, que ses variables d'env sont présentes.
 */

/** Lit un booléen d'environnement (1/true/yes/on → true). Défaut configurable. */
export function readBoolEnv(key: string, fallback = false): boolean {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  return /^(1|true|yes|on)$/i.test(raw.trim());
}

/** Lit une variable d'env non vide, sinon `undefined` (jamais de chaîne vide). */
export function readEnv(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v ? v : undefined;
}

/** Le flag d'activation du provider est-il à true ? (défaut OFF, opt-in explicite). */
export function isFlagEnabled(flagKey: string): boolean {
  return readBoolEnv(flagKey, false);
}

/** Toutes les variables d'env requises sont-elles présentes et non vides ? */
export function hasRequiredEnv(keys: readonly string[]): boolean {
  return keys.every((k) => (process.env[k] ?? '').trim().length > 0);
}

/**
 * Un provider est-il réellement activable ?
 * - flag activé ;
 * - si auth requise : toutes les clés présentes.
 * Ne lève pas : renvoie un booléen + raison pour journalisation.
 */
export function resolveActivation(input: {
  flagKey: string;
  requiresAuth: boolean;
  envKeys: readonly string[];
}): { activable: boolean; reason: 'ok' | 'flag_off' | 'missing_env' } {
  if (!isFlagEnabled(input.flagKey)) return { activable: false, reason: 'flag_off' };
  if (input.requiresAuth && !hasRequiredEnv(input.envKeys)) {
    return { activable: false, reason: 'missing_env' };
  }
  return { activable: true, reason: 'ok' };
}
