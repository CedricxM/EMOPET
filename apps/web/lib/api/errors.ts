/**
 * Erreurs typées de la couche API EMOPET. Permettent à l'arbitrage et au suivi de
 * suivi provider de réagir précisément (repli, backoff, désactivation temporaire) sans
 * jamais laisser une erreur provider devenir une conclusion EMOPET.
 */

export type ProviderErrorCode =
  | 'unavailable'
  | 'timeout'
  | 'auth'
  | 'rate_limit'
  | 'invalid_response'
  | 'privacy_blocked'
  | 'commercial_risk';

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly provider: string;
  /** Une nouvelle tentative (backoff) a un sens. */
  readonly retryable: boolean;

  constructor(code: ProviderErrorCode, provider: string, message: string, retryable = false) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.provider = provider;
    this.retryable = retryable;
  }
}

export class ProviderUnavailableError extends ProviderError {
  constructor(provider: string, message = 'Provider indisponible.') {
    super('unavailable', provider, message, true);
    this.name = 'ProviderUnavailableError';
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(provider: string, message = 'Délai dépassé.') {
    super('timeout', provider, message, true);
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderAuthError extends ProviderError {
  constructor(provider: string, message = 'Authentification provider invalide ou manquante.') {
    super('auth', provider, message, false);
    this.name = 'ProviderAuthError';
  }
}

export class ProviderRateLimitError extends ProviderError {
  readonly retryAfterMs?: number;
  constructor(provider: string, retryAfterMs?: number, message = 'Quota provider atteint.') {
    super('rate_limit', provider, message, true);
    this.name = 'ProviderRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class ProviderInvalidResponseError extends ProviderError {
  constructor(provider: string, message = 'Réponse provider invalide ou inattendue.') {
    super('invalid_response', provider, message, false);
    this.name = 'ProviderInvalidResponseError';
  }
}

/** Levée quand l'appel violerait la politique de confidentialité (ex. IP geoloc off). */
export class ProviderPrivacyBlockedError extends ProviderError {
  constructor(provider: string, message = 'Appel bloqué par la politique de confidentialité.') {
    super('privacy_blocked', provider, message, false);
    this.name = 'ProviderPrivacyBlockedError';
  }
}

/** Levée quand l'usage commercial du provider n’est pas validé pour la production. */
export class ProviderCommercialUseRiskError extends ProviderError {
  constructor(provider: string, message = 'Usage commercial non validé pour ce provider.') {
    super('commercial_risk', provider, message, false);
    this.name = 'ProviderCommercialUseRiskError';
  }
}

export function isProviderError(err: unknown): err is ProviderError {
  return err instanceof ProviderError;
}
