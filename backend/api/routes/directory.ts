import { Hono } from 'hono';

export const directory = new Hono();

const DIRECTORY_VERIFICATION_HOLD = {
  error: 'directory_verification_hold',
  status: 'HOLD' as const,
  gate: 'DATA-LIC-G3' as const,
  authoritative: false,
  reason: 'row_level_provenance_and_verification_not_established',
};

function holdDirectory(c: Parameters<Parameters<typeof directory.get>[1]>[0]) {
  return c.json(DIRECTORY_VERIFICATION_HOLD, 503);
}

/**
 * The Lorient directory seed remains under DATA-LIC-G3 HOLD.
 * Do not expose row-level entries, ratings, verification flags or category counts
 * as a verified/product directory until provenance and permitted-use evidence are reviewed.
 */
directory.get('/search', holdDirectory);
directory.get('/categories', holdDirectory);
directory.get('/:id', holdDirectory);
