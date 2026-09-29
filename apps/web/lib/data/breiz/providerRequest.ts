import { resolveBreizProviderAuth } from './providerCredentials';

export type BreizPreparedProviderRequest =
  | {
      ready: false;
      reason: 'flag_off' | 'missing_env' | 'invalid_input';
    }
  | {
      ready: true;
      reason: 'ok';
      url: string;
      headers: Readonly<Record<string, string>>;
    };

const SIRENE_BASE = 'https://api.insee.fr/api-sirene/3.11';
const DATATOURISME_BASE = 'https://api.datatourisme.fr/v1';

const SIRET_RE = /^\d{14}$/;
const INSEE_CODE_RE = /^\d{5}$/;

export function prepareSireneEstablishmentRequest(
  siretInput: string,
): BreizPreparedProviderRequest {
  const siret = siretInput.trim();
  if (!SIRET_RE.test(siret)) {
    return { ready: false, reason: 'invalid_input' };
  }

  const auth = resolveBreizProviderAuth('sirene');
  if (!auth.ready) {
    return { ready: false, reason: auth.reason };
  }

  return {
    ready: true,
    reason: 'ok',
    url: `${SIRENE_BASE}/siret/${siret}`,
    headers: auth.headers,
  };
}

export interface DatatourismeCatalogQuery {
  search?: string;
  insee?: string;
  lang?: string;
  page?: number;
  pageSize?: number;
  geoDistance?: string;
}

/**
 * Prepare a DATAtourisme catalogue request without performing network I/O.
 *
 * The API key is sent only through X-API-Key, never through api_key in the URL.
 * The current provider cap is 100 objects per page. Direct page-number access
 * is documented only within the first 10,000 results; deeper traversal must
 * follow the response meta.next link in a future networked connector.
 */
export function prepareDatatourismeCatalogRequest(
  input: DatatourismeCatalogQuery = {},
): BreizPreparedProviderRequest {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 20;

  if (
    !Number.isSafeInteger(page)
    || page < 1
    || !Number.isSafeInteger(pageSize)
    || pageSize < 1
    || pageSize > 100
    || ((page - 1) * pageSize) >= 10_000
  ) {
    return { ready: false, reason: 'invalid_input' };
  }

  if (input.insee !== undefined && !INSEE_CODE_RE.test(input.insee.trim())) {
    return { ready: false, reason: 'invalid_input' };
  }

  const auth = resolveBreizProviderAuth('datatourisme');
  if (!auth.ready) {
    return { ready: false, reason: auth.reason };
  }

  const url = new URL(`${DATATOURISME_BASE}/catalog`);
  url.searchParams.set('page', String(page));
  url.searchParams.set('page_size', String(pageSize));
  url.searchParams.set('lang', (input.lang?.trim() || 'fr'));

  const search = input.search?.trim();
  if (search) url.searchParams.set('search', search);

  const insee = input.insee?.trim();
  if (insee) url.searchParams.set('insee', insee);

  const geoDistance = input.geoDistance?.trim();
  if (geoDistance) url.searchParams.set('geo_distance', geoDistance);

  return {
    ready: true,
    reason: 'ok',
    url: url.toString(),
    headers: auth.headers,
  };
}
