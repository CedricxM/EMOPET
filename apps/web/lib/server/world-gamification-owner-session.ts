import {
  fetchWorldGamificationReadSnapshot,
  WorldGamificationClientError,
  type WorldGamificationReadSnapshot,
} from '../world-gamification-read';
import { resolveExplicitWorldCoarseRegion } from '../world-coarse-region';
import {
  refreshOwnerSession,
  resolveOwnerBackendOrigin,
  type OwnerSessionBackendOptions,
  type OwnerSessionTokens,
} from './owner-session-provider';

export type OwnerWorldGamificationReadResult =
  | {
      status: 'OK';
      snapshot: WorldGamificationReadSnapshot;
      rotatedTokens: OwnerSessionTokens | null;
    }
  | { status: 'DENIED' }
  | { status: 'UNAVAILABLE' };

function accessTokenValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  if (token.length < 16 || token.length > 8_192 || /\s/.test(token)) return null;
  return token;
}

async function readSnapshot(
  accessToken: string,
  regionCode: string,
  backendOrigin: string,
  fetchImpl: typeof fetch,
): Promise<WorldGamificationReadSnapshot> {
  return fetchWorldGamificationReadSnapshot({
    accessToken,
    regionCode,
    apiBaseUrl: backendOrigin,
    fetchImpl,
  });
}

export async function readWorldGamificationForOwnerSession(
  input: {
    accessToken?: unknown;
    refreshToken?: unknown;
    regionCode?: unknown;
  },
  options: OwnerSessionBackendOptions = {},
): Promise<OwnerWorldGamificationReadResult> {
  const env = options.env ?? process.env;
  const backendOrigin = resolveOwnerBackendOrigin(env);
  if (!backendOrigin) return { status: 'UNAVAILABLE' };

  const fetchImpl = options.fetchImpl ?? fetch;
  const regionCode = resolveExplicitWorldCoarseRegion(input.regionCode);
  const accessToken = accessTokenValue(input.accessToken);

  if (accessToken) {
    try {
      return {
        status: 'OK',
        snapshot: await readSnapshot(accessToken, regionCode, backendOrigin, fetchImpl),
        rotatedTokens: null,
      };
    } catch (error) {
      if (
        !(error instanceof WorldGamificationClientError)
        || error.code !== 'WORLD_GAMIFICATION_CLIENT_AUTH_REQUIRED'
      ) {
        return { status: 'UNAVAILABLE' };
      }
    }
  }

  const refreshed = await refreshOwnerSession(input.refreshToken, options);
  if (refreshed.status === 'DENIED') return { status: 'DENIED' };
  if (refreshed.status !== 'AUTHENTICATED') return { status: 'UNAVAILABLE' };

  try {
    return {
      status: 'OK',
      snapshot: await readSnapshot(
        refreshed.tokens.accessToken,
        regionCode,
        backendOrigin,
        fetchImpl,
      ),
      rotatedTokens: refreshed.tokens,
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
