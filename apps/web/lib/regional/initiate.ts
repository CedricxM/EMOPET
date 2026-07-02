/**
 * Usage « Initier » (Section 2 + PATCH 3).
 *
 * Règle CONSERVATRICE : dans le doute, on n'initie pas. Une initiative mal
 * calibrée nuit plus qu'une absence d'initiative. `shouldInitiate` est une
 * fonction pure testable ; les seuils sont des constantes configurables.
 */

/** Minutes d'inactivité requises avant toute initiative. */
export const INITIATE_IDLE_MINUTES = 10;

export interface InitiateContext {
  /** Minutes depuis la dernière question de l'utilisateur dans la session. */
  idleMinutes: number;
  /** Une entrée géo/culture a-t-elle déjà été évoquée dans la conversation ? */
  hasEvokedRegionalEntry: boolean;
  /** Existe-t-il au moins une entrée régionale VERIFIED pertinente au contexte ? */
  hasRelevantVerifiedEntry: boolean;
  /** Préférence utilisateur : messages d'initiative activés (défaut true). */
  initiativeEnabled: boolean;
}

/**
 * Renvoie true seulement si TOUTES les conditions sont réunies.
 * Si une seule manque, l'assistant n'initie pas.
 */
export function shouldInitiate(ctx: InitiateContext): boolean {
  return (
    ctx.initiativeEnabled === true &&
    ctx.idleMinutes >= INITIATE_IDLE_MINUTES &&
    ctx.hasEvokedRegionalEntry === false &&
    ctx.hasRelevantVerifiedEntry === true
  );
}

/** Préférence par défaut (activée, mais désactivable — respect de l'attention). */
export const DEFAULT_INITIATIVE_ENABLED = true;
