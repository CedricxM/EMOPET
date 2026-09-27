import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { evaluateCbarqInstrumentUse } from '../dist/api/services/cbarq-instrument-authority.js';

const authorityUrl = new URL('../../config/science/cbarq-instrument-authority.json', import.meta.url);
const authority = JSON.parse(await readFile(authorityUrl, 'utf8'));

const baseRequest = {
  capability: 'PRODUCT_DISPLAY',
  languageCode: 'fr-FR',
  instrumentVersion: 'penn-current',
  formVariantKey: 'full-current',
  administrationProtocolVersion: 'admin-v1',
};

function fullyAuthorizedFixture() {
  return {
    ...structuredClone(authority),
    instrumentOwner: 'fixture-owner',
    instrumentVersion: 'penn-current',
    authorityStatus: 'AUTHORIZED',
    languages: [{
      languageCode: 'fr-FR',
      translationRevision: 'fixture-fr-rev-1',
      translationSource: 'fixture-authority',
      status: 'AUTHORIZED',
    }],
    formVariants: [{
      variantKey: 'full-current',
      state: 'FULL_AUTHORIZED',
    }, {
      variantKey: 'fr-2025-efa-63',
      state: 'UNREVIEWED',
      disposition: 'NOT_AUTHORIZED_SHORT_FORM',
    }],
    scoring: {
      version: 'score-v1',
      methodReference: 'fixture://scoring',
      status: 'AUTHORIZED',
    },
    administrationProtocol: {
      version: 'admin-v1',
      status: 'AUTHORIZED',
    },
    licence: {
      status: 'AUTHORIZED',
      reference: 'fixture://licence',
      effectiveAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2027-01-01T00:00:00.000Z',
    },
    permissions: {
      productDisplay: 'AUTHORIZED',
      researchUse: 'AUTHORIZED',
      itemLevelStorage: 'AUTHORIZED',
      scoring: 'AUTHORIZED',
      repeatedAdministration: 'AUTHORIZED',
      derivativeDisplays: 'AUTHORIZED',
      exportPublication: 'AUTHORIZED',
    },
  };
}

test('CBARQ-INSTRUMENT-01 checked-in authority fails closed for production use', () => {
  const result = evaluateCbarqInstrumentUse(
    authority,
    baseRequest,
    Date.parse('2026-09-23T20:00:00.000Z'),
  );
  assert.deepEqual(result, {
    allowed: false,
    status: 'UNAVAILABLE',
    reason: 'AUTHORITY_NOT_ESTABLISHED',
  });
  assert.equal(authority.licence.status, 'NOT_ESTABLISHED');
  assert.equal(authority.formVariants.find((row) => row.variantKey === 'fr-2025-efa-63').disposition,
    'NOT_AUTHORIZED_SHORT_FORM');
});

test('CBARQ-INSTRUMENT-01 exact authorized fixture permits only matching authority', () => {
  const fixture = fullyAuthorizedFixture();
  const now = Date.parse('2026-09-23T20:00:00.000Z');

  assert.deepEqual(evaluateCbarqInstrumentUse(fixture, baseRequest, now), {
    allowed: true,
    status: 'AUTHORIZED',
    reason: 'EXACT_AUTHORITY_MATCH',
  });

  assert.equal(
    evaluateCbarqInstrumentUse(fixture, { ...baseRequest, instrumentVersion: 'wrong' }, now).allowed,
    false,
  );
  assert.equal(
    evaluateCbarqInstrumentUse(fixture, { ...baseRequest, languageCode: 'en-US' }, now).allowed,
    false,
  );
  assert.equal(
    evaluateCbarqInstrumentUse(fixture, {
      ...baseRequest,
      formVariantKey: 'fr-2025-efa-63',
    }, now).allowed,
    false,
  );

  const scoringRequest = {
    ...baseRequest,
    capability: 'SCORING',
    scoringVersion: 'score-v1',
  };
  assert.equal(evaluateCbarqInstrumentUse(fixture, scoringRequest, now).allowed, true);
  assert.equal(
    evaluateCbarqInstrumentUse(fixture, { ...scoringRequest, scoringVersion: 'score-v2' }, now).allowed,
    false,
  );
});

test('CBARQ-INSTRUMENT-01 licence, permission and lifecycle uncertainty always deny', () => {
  const now = Date.parse('2026-09-23T20:00:00.000Z');

  const noPermission = fullyAuthorizedFixture();
  noPermission.permissions.productDisplay = 'UNREVIEWED';
  assert.equal(evaluateCbarqInstrumentUse(noPermission, baseRequest, now).allowed, false);

  const expired = fullyAuthorizedFixture();
  expired.licence.expiresAt = '2026-09-23T19:59:59.000Z';
  assert.deepEqual(evaluateCbarqInstrumentUse(expired, baseRequest, now), {
    allowed: false,
    status: 'DENIED',
    reason: 'LICENCE_EXPIRED',
  });

  const noAdmin = fullyAuthorizedFixture();
  noAdmin.administrationProtocol.status = 'UNREVIEWED';
  assert.deepEqual(evaluateCbarqInstrumentUse(noAdmin, baseRequest, now), {
    allowed: false,
    status: 'DENIED',
    reason: 'ADMIN_PROTOCOL_NOT_AUTHORIZED',
  });
});
