import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const readiness = JSON.parse(
  readFileSync(
    new URL('../../../../config/world/world-gate5c-web-activation-readiness-v1.json', import.meta.url),
    'utf8',
  ),
);

async function collect(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      out.push(...await collect(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

test('Gate 5C remains fail-closed after Owner auth readiness until cutover exists', () => {
  assert.equal(readiness.status, 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY');
  assert.equal(readiness.activated, false);
  assert.equal(readiness.prerequisites.gate5bReadContinuityMerged, true);
  assert.equal(readiness.prerequisites.explicitBearerTokenProvider, true);
  assert.equal(readiness.prerequisites.explicitCoarseRegionProvider, true);
  assert.equal(readiness.prerequisites.uiCutoverDecisionRecorded, false);
  assert.equal(readiness.activationRule, 'ALL_PREREQUISITES_TRUE');
  assert.deepEqual(readiness.ownerSessionProvider, {
    authority: 'CANONICAL_BACKEND_OWNER_AUTH',
    backendOriginEnv: 'EMOPET_INTERNAL_BACKEND_URL',
    browserCredentialTransport: 'HTTP_ONLY_STRICT_SAME_SITE_COOKIES',
    accessTokenExposedToBrowserJs: false,
    refreshTokenExposedToBrowserJs: false,
    localStorageUsed: false,
    sessionStorageUsed: false,
    ownerIdAcceptedFromBrowser: false,
    refreshRotation: 'EXPLICIT_SAME_ORIGIN_POST',
    loginRoute: 'POST /api/owner-session/login',
    refreshRoute: 'POST /api/owner-session/refresh',
    logoutRoute: 'POST /api/owner-session/logout',
    worldReadBff: 'GET /api/world-gamification/session',
    automaticRefreshOnWorldGet: false,
    concurrentRefreshSingleFlightRequiredBeforeUiCutover: true,
    worldUiActivated: false,
  });
  assert.deepEqual(readiness.regionProvider, {
    explicitCoarseRegionInput: true,
    catalogBounded: true,
    acceptsCoordinates: false,
    readsGeolocationApi: false,
    persistsSelection: false,
    automaticSwitch: false,
  });
});

test('Gate 5C forbids unsafe activation fallbacks', () => {
  assert.deepEqual(readiness.forbiddenFallbacks, [
    'LOCAL_STORAGE_PROGRESSION_AUTHORITY',
    'SESSION_STORAGE_PROGRESSION_AUTHORITY',
    'CALLER_SUPPLIED_OWNER_ID',
    'PRECISE_LOCATION_DERIVED_REGION',
    'ANONYMOUS_PROGRESSION_READ',
  ]);
});

test('World UI still does not activate the Gate 5A client', async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const webRoot = path.resolve(here, '../..');
  for (const rootName of ['app', 'components']) {
    for (const file of await collect(path.join(webRoot, rootName))) {
      const source = await readFile(file, 'utf8');
      assert.equal(
        source.includes('world-gamification-read'),
        false,
        `${file} activates World read before Gate 5C readiness`,
      );
    }
  }
});
