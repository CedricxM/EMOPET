import { createHash } from 'node:crypto';

import {
  refreshOwnerSession,
  type OwnerSessionBackendOptions,
  type OwnerSessionBackendResult,
} from './owner-session-provider';

const inFlightRefreshes = new Map<string, Promise<OwnerSessionBackendResult>>();

function refreshFlightKey(refreshTokenValue: unknown): string | null {
  if (typeof refreshTokenValue !== 'string') return null;
  const token = refreshTokenValue.trim();
  if (!token) return null;
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Coalesces concurrent refreshes that reach the same web runtime instance.
 *
 * This deliberately does not claim distributed authority: separate serverless
 * workers do not share this Map. Gate 5C therefore remains OPEN for
 * multi-instance coordination before UI cutover.
 */
export function refreshOwnerSessionSingleFlight(
  refreshTokenValue: unknown,
  options: OwnerSessionBackendOptions = {},
): Promise<OwnerSessionBackendResult> {
  const key = refreshFlightKey(refreshTokenValue);
  if (!key) {
    return refreshOwnerSession(refreshTokenValue, options);
  }

  const existing = inFlightRefreshes.get(key);
  if (existing) return existing;

  const flight = refreshOwnerSession(refreshTokenValue, options);
  inFlightRefreshes.set(key, flight);

  void flight.finally(() => {
    if (inFlightRefreshes.get(key) === flight) {
      inFlightRefreshes.delete(key);
    }
  });

  return flight;
}

export function ownerRefreshSingleFlightInFlightCountForTests(): number {
  return inFlightRefreshes.size;
}
