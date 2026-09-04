const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type PrivilegedMutationOriginDecision =
  | { status: 'ALLOWED' }
  | { status: 'NOT_APPLICABLE' }
  | {
      status: 'DENIED';
      reason:
        | 'invalid_expected_origin'
        | 'unsupported_method'
        | 'missing_origin'
        | 'invalid_origin'
        | 'origin_mismatch'
        | 'fetch_site_mismatch';
    };

export function parsePrivilegedWebOrigin(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password || url.search || url.hash) return null;
  if (url.pathname !== '/') return null;

  return url.origin;
}

function exactRequestOrigin(value: string | null): string | null {
  if (!value || value === 'null') return null;
  const origin = parsePrivilegedWebOrigin(value);
  if (!origin) return null;

  // Browser Origin headers are serialized as an origin without a trailing slash.
  // Reject path-like or alternate textual forms instead of normalizing them into
  // an authorization success.
  return value === origin ? origin : null;
}

/**
 * Same-origin precondition for future cookie-authenticated privileged mutations.
 * This helper is intentionally independent from authentication/RBAC and does not
 * treat Referer as authorization evidence.
 */
export function evaluatePrivilegedMutationOrigin(input: {
  request: Request;
  expectedOrigin: string;
}): PrivilegedMutationOriginDecision {
  const expectedOrigin = parsePrivilegedWebOrigin(input.expectedOrigin);
  if (!expectedOrigin) {
    return { status: 'DENIED', reason: 'invalid_expected_origin' };
  }

  const method = input.request.method.toUpperCase();
  if (SAFE_METHODS.has(method)) return { status: 'NOT_APPLICABLE' };
  if (!MUTATION_METHODS.has(method)) {
    return { status: 'DENIED', reason: 'unsupported_method' };
  }

  const originHeader = input.request.headers.get('origin');
  if (!originHeader) return { status: 'DENIED', reason: 'missing_origin' };

  const requestOrigin = exactRequestOrigin(originHeader);
  if (!requestOrigin) return { status: 'DENIED', reason: 'invalid_origin' };
  if (requestOrigin !== expectedOrigin) {
    return { status: 'DENIED', reason: 'origin_mismatch' };
  }

  const fetchSite = input.request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') {
    return { status: 'DENIED', reason: 'fetch_site_mismatch' };
  }

  return { status: 'ALLOWED' };
}
