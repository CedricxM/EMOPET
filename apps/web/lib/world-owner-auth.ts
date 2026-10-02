import {
  fetchWorldGamificationReadSnapshot,
  type WorldGamificationReadSnapshot,
} from './world-gamification-read';

const MIN_ACCESS_TOKEN_LENGTH = 16;
const MAX_ACCESS_TOKEN_LENGTH = 8_192;

export class WorldOwnerAuthAdapterError extends Error {
  constructor(
    readonly code:
      | 'WORLD_OWNER_AUTH_ACCESS_TOKEN_REQUIRED'
      | 'WORLD_OWNER_AUTH_ACCESS_TOKEN_INVALID',
  ) {
    super(code);
    this.name = 'WorldOwnerAuthAdapterError';
  }
}

function normalizeAccessToken(value: unknown): string {
  if (typeof value !== 'string') {
    throw new WorldOwnerAuthAdapterError('WORLD_OWNER_AUTH_ACCESS_TOKEN_REQUIRED');
  }

  const token = value.trim();
  if (!token) {
    throw new WorldOwnerAuthAdapterError('WORLD_OWNER_AUTH_ACCESS_TOKEN_REQUIRED');
  }
  if (
    token.length < MIN_ACCESS_TOKEN_LENGTH
    || token.length > MAX_ACCESS_TOKEN_LENGTH
    || /[\r\n\s]/.test(token)
  ) {
    throw new WorldOwnerAuthAdapterError('WORLD_OWNER_AUTH_ACCESS_TOKEN_INVALID');
  }
  return token;
}

/**
 * Owner-auth adapter for the controlled World read path.
 *
 * The access token must already have been issued by the canonical backend auth
 * flow. This module never accepts an Owner id, never mints or refreshes tokens,
 * and never persists credentials. Identity remains derived by backend
 * authMiddleware from the verified Bearer token.
 */
export async function fetchWorldGamificationForOwnerSession(input: {
  accessToken: string;
  regionCode?: string | null;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<WorldGamificationReadSnapshot> {
  return fetchWorldGamificationReadSnapshot({
    accessToken: normalizeAccessToken(input.accessToken),
    regionCode: input.regionCode,
    apiBaseUrl: input.apiBaseUrl,
    fetchImpl: input.fetchImpl,
  });
}
