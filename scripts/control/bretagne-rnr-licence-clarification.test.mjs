import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateBretagneRnrLicenceClarification,
  validateBretagneRnrLicenceClarificationFiles,
} from './bretagne-rnr-licence-clarification.mjs';

const SOURCE_VERSION =
  'sha256:65ff0d253fd1a1bddd6ce05389fe4b35c8946cfbcd8787c9d5afaee092506cd0';

function schemaEvidence() {
  return { sourceVersion: SOURCE_VERSION };
}

function holdRegister() {
  return {
    schemaVersion: 'emopet-bretagne-rnr-licence-clarification-v1',
    datasetId: 'reserves-naturelles-regionales-de-bretagne',
    sourceVersion: SOURCE_VERSION,
    schemaEvidencePath:
      'data/registry/schema-evidence/reserves-naturelles-regionales-de-bretagne-65ff0d253fd1.json',
    reconciliationState: 'HOLD_AUTHORITATIVE_CLARIFICATION_REQUIRED',
    runtimeRightsDisposition: 'HOLD',
    releaseAllowed: false,
    observations: [
      {
        observationId: 'PRIMARY_API_METADATA',
        source: 'https://data.bretagne.bzh/api/explore/v2.1/catalog/datasets/reserves-naturelles-regionales-de-bretagne',
        observedValue: 'Licence ouverte',
        versionConclusion: 'UNRESOLVED',
      },
      {
        observationId: 'CANONICAL_ETALAB_PAGE',
        source: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence',
        observedValue: 'Licence Ouverte 2.0',
        versionConclusion: '2.0',
      },
      {
        observationId: 'DATAGOUV_MIRROR',
        source: 'https://www.data.gouv.fr/datasets/reserves-naturelles-regionales-de-bretagne-2',
        observedValue: 'Licence Ouverte / Open Licence version 2.0',
        versionConclusion: '2.0',
      },
      {
        observationId: 'LEGACY_PDF_IDENTIFICATION',
        source: 'https://commons.wikimedia.org/wiki/File:Licence_Ouverte_1.0_(Fran%C3%A7ais).pdf',
        observedValue: 'Legacy Etalab PDF identified as Licence Ouverte 1.0',
        versionConclusion: '1.0',
      },
    ],
    clarificationRequest: {
      targetAuthority: 'Région Bretagne / publisher of the exact dataset',
      messageSent: false,
      requiredAnswers: ['a', 'b', 'c', 'd'],
    },
    authoritativeConfirmation: null,
  };
}

test('current repository clarification register remains a valid HOLD', async () => {
  assert.deepEqual(await validateBretagneRnrLicenceClarificationFiles(), []);
});

test('source version must bind the durable schema evidence', () => {
  const register = holdRegister();
  register.sourceVersion = 'sha256:different';

  const errors = validateBretagneRnrLicenceClarification(
    register,
    schemaEvidence(),
  );

  assert.ok(
    errors.some((error) => error.includes('sourceVersion must equal')),
  );
});

test('the 1.0 legacy observation and 2.0 canonical observation cannot be collapsed', () => {
  const register = holdRegister();
  register.observations.find(
    (item) => item.observationId === 'LEGACY_PDF_IDENTIFICATION',
  ).versionConclusion = '2.0';

  const errors = validateBretagneRnrLicenceClarification(
    register,
    schemaEvidence(),
  );

  assert.ok(errors.some((error) => error.includes('legacy PDF observation')));
});

test('GO is impossible without primary-publisher confirmation', () => {
  const register = holdRegister();
  register.runtimeRightsDisposition = 'GO';
  register.reconciliationState = 'CONFIRMED';
  register.releaseAllowed = true;

  const errors = validateBretagneRnrLicenceClarification(
    register,
    schemaEvidence(),
  );

  assert.ok(errors.some((error) => error.includes('authoritativeConfirmation')));
});

test('synthetic fully-bound primary confirmation can satisfy the gate', () => {
  const register = holdRegister();
  register.runtimeRightsDisposition = 'GO';
  register.reconciliationState = 'CONFIRMED';
  register.releaseAllowed = true;
  register.authoritativeConfirmation = {
    authorityType: 'PRIMARY_PUBLISHER_CONFIRMATION',
    evidenceRef: 'CONTROLLED_FIXTURE_ONLY',
    confirmedAt: '2026-10-01T16:45:00Z',
    confirmedByRole: 'dataset publisher fixture',
    applicableLicenceVersion: '2.0',
    attributionRequirement: 'publisher + last update date fixture',
    appliesToSourceVersion: SOURCE_VERSION,
  };

  assert.deepEqual(
    validateBretagneRnrLicenceClarification(register, schemaEvidence()),
    [],
  );
});
