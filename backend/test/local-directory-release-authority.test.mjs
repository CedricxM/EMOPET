import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../api/routes/directory.ts', import.meta.url);
const authorityUrl = new URL('../db/seeds/local-directory-release-authority.ts', import.meta.url);

test('DATA-LIC-G3: production directory release cannot be authorized by an environment variable alone', async () => {
  const route = await readFile(routeUrl, 'utf8');
  const authority = await readFile(authorityUrl, 'utf8');

  assert.match(route, /EMOPET_LOCAL_DIRECTORY_RELEASE_GATE/);
  assert.match(route, /isLocalDirectoryProductionReleaseAuthorized\(\)/);
  assert.match(
    route,
    /EMOPET_LOCAL_DIRECTORY_RELEASE_GATE'\]\s*===\s*'GO'[\s\S]*isLocalDirectoryProductionReleaseAuthorized\(\)/,
  );

  assert.match(authority, /disposition:\s*'HOLD'/);
  assert.match(authority, /evidenceRevision:\s*null/);
  assert.match(authority, /reviewedAt:\s*null/);
  assert.match(authority, /reviewerRole:\s*null/);
  assert.match(authority, /authority\.disposition\s*!==\s*'GO'/);
  assert.match(authority, /!authority\.evidenceRevision\?\.trim\(\)/);
  assert.match(authority, /!authority\.reviewerRole\?\.trim\(\)/);
  assert.match(authority, /reviewedAt\s*>\s*Date\.now\(\)/);
});

test('DATA-LIC-G3: demo path remains explicitly non-production and strips unsupported claims', async () => {
  const route = await readFile(routeUrl, 'utf8');

  assert.match(route, /process\.env\['NODE_ENV'\]\s*!==\s*'production'/);
  assert.match(route, /EMOPET_LOCAL_DIRECTORY_DEMO'\]\s*===\s*'1'/);
  assert.match(route, /ratingAvg:\s*null/);
  assert.match(route, /ratingCount:\s*0/);
  assert.match(route, /verified:\s*false/);
  assert.match(route, /source:\s*'demo_unverified'/);
  assert.match(route, /sourceId:\s*null/);
  assert.match(route, /dataStatus:\s*'UNVERIFIED_DEMO'/);
});
