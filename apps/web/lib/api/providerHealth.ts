/**
 * Suivi d’état par provider. Compte les échecs consécutifs et désactive
 * temporairement un provider après un seuil (cooldown), pour basculer sur un
 * repli sans marteler une source en panne. En mémoire (process) — remplaçable.
 */

import type { ProviderHealthResult } from './types';

export interface ProviderHealthOptions {
  /** Échecs consécutifs avant désactivation temporaire (def. 3). */
  failureThreshold?: number;
  /** Durée de désactivation après seuil (def. 5 min). */
  cooldownMs?: number;
}

interface HealthState {
  consecutiveFailures: number;
  disabledUntil: number;
  last?: ProviderHealthResult;
}

export interface ProviderHealthSnapshotEntry {
  failures: number;
  temporarilyDisabled: boolean;
  last?: ProviderHealthResult;
}

export class ProviderHealthRegistry {
  private readonly states = new Map<string, HealthState>();
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  constructor(opts: ProviderHealthOptions = {}) {
    this.failureThreshold = opts.failureThreshold ?? 3;
    this.cooldownMs = opts.cooldownMs ?? 5 * 60_000;
  }

  private ensure(provider: string): HealthState {
    let s = this.states.get(provider);
    if (!s) {
      s = { consecutiveFailures: 0, disabledUntil: 0 };
      this.states.set(provider, s);
    }
    return s;
  }

  recordSuccess(result: ProviderHealthResult): void {
    const s = this.ensure(result.provider);
    s.consecutiveFailures = 0;
    s.disabledUntil = 0;
    s.last = result;
  }

  recordFailure(result: ProviderHealthResult, now = Date.now()): void {
    const s = this.ensure(result.provider);
    s.consecutiveFailures += 1;
    s.last = result;
    if (s.consecutiveFailures >= this.failureThreshold) {
      s.disabledUntil = now + this.cooldownMs;
    }
  }

  /** Le provider est-il en cooldown (à éviter au profit d'un repli) ? */
  isTemporarilyDisabled(provider: string, now = Date.now()): boolean {
    const s = this.states.get(provider);
    return !!s && s.disabledUntil > now;
  }

  get(provider: string): ProviderHealthResult | undefined {
    return this.states.get(provider)?.last;
  }

  snapshot(now = Date.now()): Record<string, ProviderHealthSnapshotEntry> {
    const out: Record<string, ProviderHealthSnapshotEntry> = {};
    for (const [provider, s] of this.states) {
      out[provider] = {
        failures: s.consecutiveFailures,
        temporarilyDisabled: s.disabledUntil > now,
        last: s.last,
      };
    }
    return out;
  }
}

/** Registre d’état partagé par défaut. */
export const providerHealth = new ProviderHealthRegistry();
