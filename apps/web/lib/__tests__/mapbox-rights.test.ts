import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { getControlledMapboxToken, normalizeMapboxPublicToken } from '../mapbox-rights';
import {
  isMapboxProductionUseAuthorized,
  MAPBOX_PRODUCTION_AUTHORITY,
  type MapboxReleaseAuthority,
} from '../mapbox-service-authority';

const communityMapUrl = new URL('../../components/bretagne-map/CommunityMap.tsx', import.meta.url);
const mapboxMapUrl = new URL('../../components/bretagne-map/MapboxMap.tsx', import.meta.url);

const REVIEWED_AUTHORITY: MapboxReleaseAuthority = {
  disposition: 'GO',
  evidenceRevision: 'DATA-LIC-G5-TEST-001',
  reviewedAt: '2026-09-22T10:00:00.000Z',
  reviewerRole: 'TEST_REVIEWER',
  accountAuthorityEvidence: 'controlled://mapbox/account-authority',
  billingAuthorityEvidence: 'controlled://mapbox/billing-authority',
  termsReceipt: 'controlled://mapbox/terms-receipt',
  tokenCustodyEvidence: 'controlled://mapbox/token-custody',
  renderedAttributionEvidence: 'controlled://mapbox/rendered-attribution',
  privacyReviewEvidence: 'controlled://mapbox/privacy-review',
  tokenScope: 'PUBLIC_BROWSER_TOKEN_ONLY',
  reason: 'Synthetic test authority only.',
};

test('DATA-LIC-G5: checked-in Mapbox authority remains HOLD', () => {
  assert.equal(MAPBOX_PRODUCTION_AUTHORITY.disposition, 'HOLD');
  assert.equal(isMapboxProductionUseAuthorized(), false);
  assert.equal(getControlledMapboxToken('pk.public-test-token', 'GO'), null);
});

test('DATA-LIC-G5: synthetic reviewed authority requires every controlled evidence field', () => {
  assert.equal(isMapboxProductionUseAuthorized(REVIEWED_AUTHORITY), true);

  for (const mutation of [
    { disposition: 'HOLD' as const },
    { evidenceRevision: null },
    { reviewerRole: null },
    { accountAuthorityEvidence: null },
    { billingAuthorityEvidence: null },
    { termsReceipt: null },
    { tokenCustodyEvidence: null },
    { renderedAttributionEvidence: null },
    { privacyReviewEvidence: null },
    { tokenScope: 'OPEN' as const },
  ]) {
    assert.equal(isMapboxProductionUseAuthorized({ ...REVIEWED_AUTHORITY, ...mutation }), false);
  }
});

test('DATA-LIC-G5: activation requires exact GO, complete authority and a public browser token', () => {
  assert.equal(getControlledMapboxToken(undefined, undefined, REVIEWED_AUTHORITY), null);
  assert.equal(getControlledMapboxToken('pk.public-test-token', undefined, REVIEWED_AUTHORITY), null);
  assert.equal(getControlledMapboxToken('pk.public-test-token', 'go', REVIEWED_AUTHORITY), null);
  assert.equal(getControlledMapboxToken('pk.public-test-token', ' GO ', REVIEWED_AUTHORITY), null);
  assert.equal(getControlledMapboxToken('sk.secret-test-token', 'GO', REVIEWED_AUTHORITY), null);
  assert.equal(getControlledMapboxToken('not-a-mapbox-token', 'GO', REVIEWED_AUTHORITY), null);
  assert.equal(
    getControlledMapboxToken('  pk.public-test-token  ', 'GO', REVIEWED_AUTHORITY),
    'pk.public-test-token',
  );
});

test('DATA-LIC-G5: public-token normalization rejects blank, secret and arbitrary tokens', () => {
  assert.equal(normalizeMapboxPublicToken(undefined), null);
  assert.equal(normalizeMapboxPublicToken('   '), null);
  assert.equal(normalizeMapboxPublicToken('sk.secret-test-token'), null);
  assert.equal(normalizeMapboxPublicToken('public-test-token'), null);
  assert.equal(normalizeMapboxPublicToken(' pk.public-test-token '), 'pk.public-test-token');
});

test('map consumers use the controlled helper rather than raw token truthiness', async () => {
  const [communitySource, mapboxSource] = await Promise.all([
    readFile(communityMapUrl, 'utf8'),
    readFile(mapboxMapUrl, 'utf8'),
  ]);

  assert.match(communitySource, /getControlledMapboxToken\(\)\s*!==\s*null/);
  assert.doesNotMatch(communitySource, /resolveMapboxToken/);
  assert.match(mapboxSource, /const token = getControlledMapboxToken\(\)/);
  assert.match(mapboxSource, /attributionControl:\s*true/);
});
