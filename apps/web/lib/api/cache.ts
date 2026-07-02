/**
 * Cache TTL par catégorie. En mémoire (process) — remplaçable par Redis/KV sans
 * changer l'interface. Les catégories sensibles (modération, sécurité) ont un TTL
 * nul : elles ne sont JAMAIS mises en cache.
 */

export type CacheCategory =
  | 'weather_current'
  | 'weather_forecast'
  | 'air_quality'
  | 'geocoding'
  | 'holidays'
  | 'dog_breed'
  | 'translation'
  | 'open_data'
  | 'moderation'
  | 'security'
  | 'default';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

/** TTL recommandés (ms). 0 = jamais caché. */
export const CACHE_TTL_MS: Record<CacheCategory, number> = {
  weather_current: 15 * MIN,
  weather_forecast: 60 * MIN,
  air_quality: 30 * MIN,
  geocoding: 30 * DAY,
  holidays: 30 * DAY,
  dog_breed: 30 * DAY,
  translation: 7 * DAY,
  open_data: DAY,
  moderation: 0,
  security: 0,
  default: 5 * MIN,
};

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache {
  private readonly store = new Map<string, Entry<unknown>>();

  get<T>(key: string, now = Date.now()): T | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (e.expiresAt <= now) {
      this.store.delete(key);
      return undefined;
    }
    return e.value as T;
  }

  /** Met en cache selon le TTL de la catégorie. Catégorie à TTL 0 → no-op. */
  set<T>(key: string, value: T, category: CacheCategory = 'default', now = Date.now()): void {
    const ttl = CACHE_TTL_MS[category] ?? CACHE_TTL_MS.default;
    if (ttl <= 0) return;
    this.store.set(key, { value, expiresAt: now + ttl });
  }

  has(key: string, now = Date.now()): boolean {
    return this.get(key, now) !== undefined;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

/** Instance partagée par défaut. */
export const apiCache = new TtlCache();
