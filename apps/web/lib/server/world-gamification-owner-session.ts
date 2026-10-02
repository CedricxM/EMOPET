import {
  fetchWorldGamificationReadSnapshot,
  WorldGamificationClientError,
  type WorldGamificationReadSnapshot,
} from '../world-gamification-read';
import { resolveExplicitWorldCoarseRegion } from '../world-coarse-region';
import {
  resolveOwnerBackendOrigin,
  type OwnerSessionBackendOptions,
} from './owner-session-provider';

export type OwnerWorldGamificationReadResult =
  | {
      status: 'OK';
      snapshot: WorldGamificationReadSnapshot;
    }
  | { status: 'DENIED' }
  | { status: 'UNAVAILABLE' };

function accessTokenValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  if (token.length < 16 || token.length > 8_192 || /\s/.test(token)) return null;
  return token;
}

/**
 * Read-only World bridge for an already-issued Owner access token.
 *
 * This path NEVER rotates a refresh credential. Refresh is a separate
 * same-origin POST mutation so concurrent GETs cannot accidentally consume the
 * same one-time refresh token and trigger backend reuse detection.
 */
export async function readWorldGamificationForOwnerSession(
  input: {
    accessToken?: unknown;
    regionCode?: unknown;
  },
  options: OwnerSessionBackendOptions = {},
): Promise<OwnerWorldGamificationReadResult> {
  const env = options.env ?? process.env;
  const backendOrigin = resolveOwnerBackendOrigin(env);
  if (!backendOrigin) return { status: 'UNAVAILABLE' };

  const accessToken = accessTokenValue(input.accessToken);
  if (!accessToken) return { status: 'DENIED' };

  const regionCode = resolveExplicitWorldCoarseRegion(input.regionCode);
  try {
    return {
      status: 'OK',
      snapshot: await fetchWorldGamificationReadSnapshot({
        accessToken,
        regionCode,
        apiBaseUrl: backendOrigin,
        fetchImpl: options.fetchImpl ?? fetch,
      }),
    };
  } catch (error) {
    if (
      error instanceof WorldGamificationClientError
      && error.code === 'WORLD_GAMIFICATION_CLIENT_AUTH_REQUIRED'
    ) {
      return { status: 'DENIED' };
    }
    return { status: 'UNAVAILABLE' };
  }
}
