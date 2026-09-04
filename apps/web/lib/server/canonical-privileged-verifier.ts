import {
  assertPrivilegedTokenKeyConfig,
  authorizePrivilegedAccessToken,
  type PrivilegedTokenKeyConfig,
} from '@emopet/privileged-auth';

import type { PrivilegedAuthorizationVerifier } from './privileged-request';

export interface CanonicalPrivilegedVerifierOptions {
  keyProvider: () => PrivilegedTokenKeyConfig;
  now?: () => Date;
}

export function createCanonicalPrivilegedAuthorizationVerifier(
  options: CanonicalPrivilegedVerifierOptions,
): PrivilegedAuthorizationVerifier {
  return Object.freeze({
    async authorize({ token, action }) {
      const key = options.keyProvider();
      assertPrivilegedTokenKeyConfig(key);

      const result = await authorizePrivilegedAccessToken({
        token,
        action,
        key,
        now: options.now?.(),
      });

      if (result.status !== 'AUTHORIZED') {
        return { status: 'DENIED' as const };
      }

      return {
        status: 'AUTHORIZED' as const,
        subject: result.subject,
        action,
      };
    },
  });
}

function readPrivilegedKeyFromEnvironment(): PrivilegedTokenKeyConfig {
  return {
    secret: process.env['PRIVILEGED_JWT_SECRET'] ?? '',
    ordinaryJwtSecret: process.env['JWT_SECRET'] ?? null,
  };
}

/**
 * Server-only adapter selected by #177. Configuration errors intentionally throw
 * through the verifier boundary so authorizePrivilegedRequest maps them to
 * UNAVAILABLE/503; invalid or unauthorized bearer tokens remain DENIED/401.
 */
export const canonicalPrivilegedAuthorizationVerifier =
  createCanonicalPrivilegedAuthorizationVerifier({
    keyProvider: readPrivilegedKeyFromEnvironment,
  });
