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

function clearRefreshFlight(
  key: string,
  flight: Promise<OwnerSessionBackendResult>,
): void {
  if (inFlightRefreshes.get(key) === flight) {
    inFlightRefreshes.delete(key);
  }
}

/**
 * Coalesces identical concurrent refresh rotations that reach the same web
 * runtime instance.
 *
 * Important boundary: this Map is process-local. Separate serverless workers
 * do not share it, so this is NOT distributed refresh coordination and does
 * not by itself authorize Gate 5C UI cutover.
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

  // Use explicit success + failure cleanup instead of dropping the Promise
  // returned by finally(), which could surface an unhandled rejected Promise
  // if this boundary ever begins propagating failures.
  void flight.then(
    () => clearRefreshFlight(key, flight),
    () => clearRefreshFlight(key, flight),
  );

  return flight;
}

export function ownerRefreshSingleFlightInFlightCountForTests(): number {
  return inFlightRefreshes.size;
}
