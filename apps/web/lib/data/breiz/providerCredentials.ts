import { isFlagEnabled, readEnv } from '../../api/config';

export type BreizCredentialProvider = 'sirene' | 'datatourisme';

export interface BreizProviderAuthContract {
  provider: BreizCredentialProvider;
  flagKey: string;
  envKey: string;
  headerName: string;
}

export type BreizProviderAuthResolution =
  | {
      ready: false;
      reason: 'flag_off' | 'missing_env';
      contract: BreizProviderAuthContract;
      headers: Readonly<Record<string, never>>;
    }
  | {
      ready: true;
      reason: 'ok';
      contract: BreizProviderAuthContract;
      headers: Readonly<Record<string, string>>;
    };

export const BREIZ_PROVIDER_AUTH_CONTRACTS: Readonly<
  Record<BreizCredentialProvider, BreizProviderAuthContract>
> = {
  sirene: {
    provider: 'sirene',
    flagKey: 'API_INSEE_SIRENE_ENABLED',
    envKey: 'INSEE_API_KEY',
    headerName: 'X-INSEE-Api-Key-Integration',
  },
  datatourisme: {
    provider: 'datatourisme',
    flagKey: 'API_DATATOURISME_ENABLED',
    envKey: 'DATATOURISME_API_KEY',
    headerName: 'X-API-Key',
  },
};

/**
 * Resolve credentials without ever enabling a provider by the mere presence of
 * a secret. Both an explicit feature flag and a non-empty credential are
 * required. This helper does not authorize data reuse; source-rights gates
 * remain independent and fail-closed.
 */
export function resolveBreizProviderAuth(
  provider: BreizCredentialProvider,
): BreizProviderAuthResolution {
  const contract = BREIZ_PROVIDER_AUTH_CONTRACTS[provider];

  if (!isFlagEnabled(contract.flagKey)) {
    return { ready: false, reason: 'flag_off', contract, headers: {} };
  }

  const credential = readEnv(contract.envKey);
  if (!credential) {
    return { ready: false, reason: 'missing_env', contract, headers: {} };
  }

  return {
    ready: true,
    reason: 'ok',
    contract,
    headers: Object.freeze({ [contract.headerName]: credential }),
  };
}
