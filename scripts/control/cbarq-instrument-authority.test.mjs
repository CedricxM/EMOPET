import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluateCbarqInstrumentAuthority } from './cbarq-instrument-authority.mjs';

const configUrl = new URL('../../config/science/cbarq-instrument-authority.json', import.meta.url);

test('checked-in C-BARQ authority fails closed for every production/research use', async () => {
  const config = JSON.parse(await readFile(configUrl, 'utf8'));

  assert.equal(config.status, 'NO_PRODUCTION_INSTRUMENT_AUTHORITY');
  assert.equal(config.formVariant, 'UNREVIEWED');
  assert.equal(config.licenceAuthorityReference, null);
  assert.equal(config.shortFormDisposition, 'NOT_AUTHORIZED_SHORT_FORM');
  assert.equal(config.protectedItemWordingIncluded, false);

  for (const requestedUse of [
    'product_display',
    'product_scoring',
    'item_level_storage',
    'repeated_longitudinal',
    'derivative_display',
    'research_administration',
    'publication_export',
  ]) {
    const result = evaluateCbarqInstrumentAuthority(config, requestedUse);
    assert.equal(result.allowed, false, requestedUse + ' must fail closed without authority');
  }
});

test('explicit licence alone is insufficient when provenance/use authority is incomplete', () => {
  const incomplete = {
    instrumentCode: 'cbarq',
    instrumentVersion: 'candidate',
    languageCode: 'fr-FR',
    translationRevision: null,
    formVariant: 'FULL_AUTHORIZED',
    licenceAuthorityReference: 'licence://example',
    allowedUse: { productDisplay: true },
    shortFormDisposition: 'NOT_AUTHORIZED_SHORT_FORM',
  };

  assert.deepEqual(
    evaluateCbarqInstrumentAuthority(incomplete, 'product_display'),
    { allowed: false, reason: 'instrument_provenance_incomplete' },
  );
});

test('an explicit fully-versioned authority can permit only the requested authorized use', () => {
  const authorized = {
    instrumentCode: 'cbarq',
    instrumentVersion: 'licensed-version',
    languageCode: 'fr-FR',
    translationRevision: 'licensed-translation',
    formVariant: 'FULL_AUTHORIZED',
    licenceAuthorityReference: 'licence://controlled-reference',
    allowedUse: {
      productDisplay: true,
      productScoring: false,
    },
    shortFormDisposition: 'NOT_AUTHORIZED_SHORT_FORM',
  };

  assert.equal(evaluateCbarqInstrumentAuthority(authorized, 'product_display').allowed, true);
  assert.equal(evaluateCbarqInstrumentAuthority(authorized, 'product_scoring').allowed, false);
});

test('63-item EFA retained set cannot silently become an authorized short form', () => {
  const invalidShort = {
    instrumentCode: 'cbarq',
    instrumentVersion: 'candidate',
    languageCode: 'fr-FR',
    translationRevision: 'candidate',
    formVariant: 'AUTHORIZED_SHORT_FORM',
    licenceAuthorityReference: 'licence://controlled-reference',
    allowedUse: { productDisplay: true },
    shortFormDisposition: 'NOT_AUTHORIZED_SHORT_FORM',
  };

  assert.deepEqual(
    evaluateCbarqInstrumentAuthority(invalidShort, 'product_display'),
    { allowed: false, reason: 'short_form_authority_mismatch' },
  );
});
