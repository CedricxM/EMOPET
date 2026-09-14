import test from 'node:test';
import assert from 'node:assert/strict';

import { getControlledMapboxToken, normalizeMapboxPublicToken } from '../mapbox-rights';
import {
  isMapboxProductionUseAuthorized,
  MAPBOX_PRODUCTION_AUTHORITY,
  type MapboxReleaseAuthority,
} from '../mapbox-service-authority';

const reviewedAuthority: MapboxReleaseAuthority = {
  disposition: 'GO',
  evidenceRevision: 'DATA-LIC-G5-REVIEW-001',
  reviewedAt: '2026-09-14T12:00:00.000Z',
  reviewerRole: 'qualified-reviewer',
  accountAuthorityEvidence: 'controlled://mapbox/account-authority',
  billingAuthorityEvidence: 'controlled://mapbox/billing-authority',
  termsReceipt: 'controlled://mapbox/terms-receipt',
  tokenCustodyEvidence: 'controlled://mapbox/token-custody',
  renderedAttributionEvidence: 'controlled://mapbox/rendered-attribution',
  privacyReviewEvidence: 'controlled://mapbox/privacy-review',
  tokenScope: 'PUBLIC_BROWSER_TOKEN_ONLY',
  reason: 'Synthetic test authority only.',
};

test('DATA-LIC-G5: checked-in Mapbox release authority remains fail-closed', () => {
  assert.equal(MAPBOX_PRODUCTION_AUTHORITY.disposition, 'HOLD');
  assert.equal(isMapboxProductionUseAuthorized(), false);
  assert.equal(getControlledMapboxToken('pk.public-test-token', 'GO'), null);
});

test('DATA-LIC-G5: reviewed Mapbox authority requires the complete controlled evidence set', () => {
  assert.equal(isMapboxProductionUseAuthorized(reviewedAuthority), true);

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
    assert.equal(isMapboxProductionUseAuthorized({ ...reviewedAuthority, ...mutation }), false);
  }
});

test('DATA-LIC-G5: Mapbox activation needs reviewed authority, a public token and exact GO gate', () => {
  assert.equal(getControlledMapboxToken(undefined, undefined, reviewedAuthority), null);
  assert.equal(getControlledMapboxToken('pk.public-test-token', undefined, reviewedAuthority), null);
  assert.equal(getControlledMapboxToken('pk.public-test-token', '1', reviewedAuthority), null);
  assert.equal(getControlledMapboxToken('pk.public-test-token', 'go', reviewedAuthority), null);
  assert.equal(getControlledMapboxToken('pk.public-test-token', 'true', reviewedAuthority), null);
  assert.equal(getControlledMapboxToken('', 'GO', reviewedAuthority), null);
  assert.equal(getControlledMapboxToken('public-test-token', 'GO', reviewedAuthority), null);
  assert.equal(getControlledMapboxToken('sk.secret-test-token', 'GO', reviewedAuthority), null);
  assert.equal(
    getControlledMapboxToken('pk.public-test-token', 'GO', reviewedAuthority),
    'pk.public-test-token',
  );
});

test('DATA-LIC-G5: public-token normalization cannot weaken the authority boundary', () => {
  assert.equal(normalizeMapboxPublicToken('  pk.public-test-token  '), 'pk.public-test-token');
  assert.equal(normalizeMapboxPublicToken('  sk.secret-test-token  '), null);
  assert.equal(normalizeMapboxPublicToken('public-test-token'), null);
  assert.equal(getControlledMapboxToken('  pk.public-test-token  ', ' GO ', reviewedAuthority), null);
});
