import { LORIENT_DIRECTORY } from './local-directory-lorient.js';

/**
 * The historical Lorient seed is not production directory authority.
 *
 * #116 found row-level provenance, ratings and verification evidence incomplete.
 * This wrapper allows an explicit development/demo seed while stripping the
 * unsupported claims most likely to be misread as verified product data.
 */
export const LOCAL_DIRECTORY_SEED_AUTHORITY = 'UNVERIFIED_DEMO_ONLY' as const;

export function getSanitizedDemoLocalDirectorySeed() {
  return LORIENT_DIRECTORY.map((entry) => ({
    ...entry,
    ratingAvg: null,
    ratingCount: 0,
    verified: false,
    source: 'demo_unverified',
    sourceId: null,
  }));
}

export function isDemoLocalDirectorySeedAllowed(): boolean {
  return process.env['EMOPET_ALLOW_DEMO_LOCAL_DIRECTORY_SEED'] === '1';
}
