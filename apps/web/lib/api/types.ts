/**
 * Couche API EMOPET — types unifiés (provider matrix + signaux de contexte).
 *
 * Principe directeur : une API externe est un SIGNAL, jamais une VÉRITÉ. Aucune
 * réponse brute ne traverse la logique métier : tout est normalisé en
 * `ContextSignal`, puis arbitré en `ArbitratedSignal`. EMOPET reste NON MÉDICAL —
 * le contexte explique des conditions externes possibles, jamais l'état de l'animal.
 *
 * Aucune clé d'API n'apparaît ici : un provider ne décrit que les NOMS de ses
 * variables d'environnement (`envKeys`), jamais leurs valeurs.
 */

export type ProviderCategory =
  | 'weather'
  | 'air_quality'
  | 'geocoding'
  | 'open_data'
  | 'dog_knowledge'
  | 'calendar'
  | 'translation'
  | 'email_validation'
  | 'moderation'
  | 'ai'
  | 'transport'
  | 'logistics';

/** État opérationnel d'un provider dans l'agrégation. */
export type ProviderStatus = 'active' | 'fallback' | 'experimental' | 'disabled' | 'scaffold';

/** Recommandation d'intégration (matrice provider). */
export type RecommendedStatus =
  | 'active_now'
  | 'fallback'
  | 'premium_candidate'
  | 'experimental'
  | 'scaffold_now'
  | 'disabled_by_default'
  | 'rejected';

export type RiskLevel = 'none' | 'low' | 'medium' | 'high';
/** Échelle de valeur produit pour EMOPET. */
export type ValueLevel = 'low' | 'medium' | 'high';

export type LocationPrecision = 'exact' | 'city' | 'region' | 'approximate' | 'unknown';
export type Freshness = 'fresh' | 'acceptable' | 'stale' | 'unknown';
export type SourceType = 'measured' | 'modeled' | 'forecast' | 'estimated' | 'user_provided' | 'unknown';

export interface SignalLocation {
  lat?: number;
  lon?: number;
  city?: string;
  country?: string;
  precision?: LocationPrecision;
}

/**
 * Réponse externe NORMALISÉE. Jamais le payload brut du provider.
 * `value` est `unknown` par défaut — un adaptateur typé peut préciser `T`.
 */
export interface ContextSignal<T = unknown> {
  id: string;
  category: string;
  provider: string;
  value: T;
  unit?: string;
  /** Horodatage de l'évènement mesuré/modélisé (ISO 8601). */
  timestamp: string;
  /** Horodatage de réception côté EMOPET (ISO 8601). */
  receivedAt: string;
  location?: SignalLocation;
  freshness: Freshness;
  /** Confiance 0..1 (qualité source + fraîcheur + précision). */
  confidence: number;
  sourceType: SourceType;
  /** Référence opaque vers le payload brut (audit), jamais le payload lui-même. */
  rawPayloadRef?: string;
  warnings?: string[];
}

/** Statut d'un signal après arbitrage multi-providers. */
export type ArbitratedStatus =
  | 'confirmed'
  | 'consensus'
  | 'fallback_used'
  | 'stale'
  | 'conflicting_sources'
  | 'insufficient_data'
  | 'provider_error'
  | 'outlier_removed'
  | 'not_available';

/** Trace d'audit : ce que chaque provider a apporté à l'arbitrage. */
export interface ProvenanceEntry {
  provider: string;
  value: unknown;
  unit?: string;
  weight: number;
  freshness: Freshness;
  usedInConsensus: boolean;
  outlier?: boolean;
}

export interface ArbitratedSignal<T = unknown> {
  category: string;
  status: ArbitratedStatus;
  /** `null` quand le contexte est indisponible/incertain (jamais forcé). */
  value: T | null;
  unit?: string;
  confidence: number;
  /** Recommandation prudente, NON médicale. */
  recommendation?: string;
  provenance: ProvenanceEntry[];
  warnings: string[];
  arbitratedAt: string;
}

/**
 * Descripteur exposé par chaque adaptateur — alimente la matrice provider,
 * les feature flags et l'arbitrage. Aucune valeur secrète, seulement des noms.
 */
export interface ProviderDescriptor {
  providerName: string;
  category: ProviderCategory;
  requiresAuth: boolean;
  /** NOMS des variables d'env requises (jamais les valeurs). */
  envKeys: string[];
  baseUrl: string;
  freeTierNotes: string;
  commercialUseRisk: RiskLevel;
  privacyRisk: RiskLevel;
  rateLimitRisk: RiskLevel;
  implementationComplexity: RiskLevel;
  productValueForEMOPET: ValueLevel;
  status: ProviderStatus;
  recommended: RecommendedStatus;
  /** Feature flag d'activation, ex. `API_OPEN_METEO_ENABLED`. */
  flagKey: string;
  /** Provider de repli (par `providerName`) si celui-ci échoue. */
  fallbackProvider?: string;
}

export interface ProviderHealthResult {
  provider: string;
  ok: boolean;
  status: ProviderStatus;
  latencyMs?: number;
  checkedAt: string;
  error?: string;
}

/**
 * Forme commune minimale d'un adaptateur. Les méthodes `fetch*` spécifiques à
 * une catégorie sont déclarées dans des interfaces dédiées qui étendent celle-ci
 * (ex. `WeatherAdapter`). Tout adaptateur expose : descriptor, normalisation
 * (interne aux fetch*), healthCheck et une réponse mockée déterministe.
 */
export interface ProviderAdapter {
  readonly descriptor: ProviderDescriptor;
  healthCheck(signal?: AbortSignal): Promise<ProviderHealthResult>;
  /** Réponse mockée déterministe (tests + mode hors-ligne). */
  mockResponse(): ContextSignal[];
}
