import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BRETAGNE_OPEN_DATA_ALLOWLIST,
  evaluateBretagneOpenDataDatasetRights,
  getBretagneOpenDataDataset,
  prepareBretagneOpenDataMetadataRequest,
  prepareBretagneOpenDataRecordsRequest,
} from '../bretagneOpenDataAllowlist';

test('Bretagne open-data allow-list is explicit and dataset-scoped', () => {
  assert.ok(BRETAGNE_OPEN_DATA_ALLOWLIST.length >= 1);

  const dataset = getBretagneOpenDataDataset(
    'reserves-naturelles-regionales-de-bretagne',
  );
  assert.ok(dataset);
  assert.equal(dataset.producer, 'Région Bretagne');
  assert.match(dataset.licence, /Licence Ouverte/i);
  assert.deepEqual(dataset.domains, ['territorial_context']);
  assert.deepEqual(dataset.allowedRecordFields, []);
  assert.equal(dataset.status, 'METADATA_REVIEWED_FIELDS_OPEN');
});

test('metadata lookup works only for allow-listed datasets', () => {
  const request = prepareBretagneOpenDataMetadataRequest(
    'reserves-naturelles-regionales-de-bretagne',
  );
  assert.equal(request.ready, true);
  if (!request.ready) return;

  assert.equal(
    request.url,
    'https://data.bretagne.bzh/api/explore/v2.1/catalog/datasets/reserves-naturelles-regionales-de-bretagne',
  );
  assert.deepEqual(request.fields, []);

  assert.deepEqual(
    prepareBretagneOpenDataMetadataRequest('not-reviewed-dataset'),
    { ready: false, reason: 'dataset_not_allowlisted' },
  );
});

test('record retrieval remains blocked until status and fields are explicitly approved', () => {
  assert.deepEqual(
    prepareBretagneOpenDataRecordsRequest(
      'reserves-naturelles-regionales-de-bretagne',
    ),
    { ready: false, reason: 'dataset_not_release_ready' },
  );
});

test('dataset IDs cannot escape the Opendatasoft dataset path', () => {
  for (const datasetId of [
    '../catalog',
    'https://evil.example',
    'reserves naturelles',
    '',
    'A'.repeat(200),
  ]) {
    assert.deepEqual(prepareBretagneOpenDataMetadataRequest(datasetId), {
      ready: false,
      reason: 'dataset_not_allowlisted',
    });
  }
});

test('nature-reserve dataset purpose never implies dog access or dog-friendliness', () => {
  const dataset = getBretagneOpenDataDataset(
    'reserves-naturelles-regionales-de-bretagne',
  );
  assert.ok(dataset);

  const normalized = dataset.purpose.toLowerCase();
  assert.match(normalized, /never infer dog access/);
  assert.match(normalized, /dog-friendliness/);
});


test('dataset-scoped rights do not treat the whole portal as one blanket licence', () => {
  const current = getBretagneOpenDataDataset(
    'reserves-naturelles-regionales-de-bretagne',
  );
  assert.ok(current);

  const releaseReady = {
    ...current,
    allowedRecordFields: ['nom', 'geometry'],
    status: 'RELEASE_READY' as const,
    schemaEvidence: {
      receiptId: 'schema-fixture-001',
      datasetId: current.datasetId,
      metadataUrl:
        'https://data.bretagne.bzh/api/explore/v2.1/catalog/datasets/' +
        current.datasetId,
      observedAt: '2026-09-30T09:00:00Z',
      recheckAt: '2026-10-15T00:00:00Z',
      immutableSourceVersion: current.datasetId + '@fixture-version',
      observedFields: ['nom', 'geometry'],
      approvedFields: ['nom', 'geometry'],
      evidenceRef: 'docs/control/FIXTURE_ONLY.md',
      reviewerRole: 'test reviewer',
      evidenceState: 'PRIMARY_API_SCHEMA_CONFIRMED' as const,
    },
    rightsEvidence: {
      authorityRevision: 'bretagne-open-data-dataset-rights-fixture-v1',
      immutableSourceVersion:
        'reserves-naturelles-regionales-de-bretagne@fixture-version',
      receiptPath: 'docs/control/FIXTURE_ONLY.md',
      attributionText: 'Région Bretagne',
      permittedUseSummary:
        'Synthetic test fixture: selected territorial metadata under dataset-level open licence.',
      reviewedAt: '2026-09-30T10:00:00Z',
      reviewerRole: 'test reviewer',
      recheckAt: '2026-10-15T00:00:00Z',
      evidenceState: 'SOURCE_CONFIRMED' as const,
      disposition: 'GO' as const,
    },
  };

  const verdict = evaluateBretagneOpenDataDatasetRights(
    releaseReady,
    Date.parse('2026-10-01T12:00:00Z'),
  );

  assert.equal(verdict.ingestionPermitted, true);
  assert.deepEqual(verdict.blockers, []);
});

test('dataset-scoped rights stay blocked without exact dataset evidence', () => {
  const current = getBretagneOpenDataDataset(
    'reserves-naturelles-regionales-de-bretagne',
  );
  assert.ok(current);

  const releaseReadyWithoutReceipt = {
    ...current,
    allowedRecordFields: ['nom'],
    status: 'RELEASE_READY' as const,
  };

  const verdict = evaluateBretagneOpenDataDatasetRights(
    releaseReadyWithoutReceipt,
    Date.parse('2026-10-01T12:00:00Z'),
  );

  assert.equal(verdict.ingestionPermitted, false);
  assert.ok(verdict.blockers.includes('NO_DATASET_RIGHTS_EVIDENCE'));
  assert.ok(verdict.blockers.includes('NO_PRIMARY_SCHEMA_EVIDENCE'));
});

test('dataset rights reject a release-ready descriptor without primary schema evidence', () => {
  const current = getBretagneOpenDataDataset(
    'reserves-naturelles-regionales-de-bretagne',
  );
  assert.ok(current);

  const rightsOnly = {
    ...current,
    allowedRecordFields: ['nom'],
    status: 'RELEASE_READY' as const,
    rightsEvidence: {
      authorityRevision: 'fixture-v1',
      immutableSourceVersion: 'fixture-source-version',
      receiptPath: 'docs/control/FIXTURE_ONLY.md',
      attributionText: 'Région Bretagne',
      permittedUseSummary: 'Synthetic test fixture only.',
      reviewedAt: '2026-09-30T10:00:00Z',
      reviewerRole: 'test reviewer',
      recheckAt: '2026-10-15T00:00:00Z',
      evidenceState: 'SOURCE_CONFIRMED' as const,
      disposition: 'GO' as const,
    },
  };

  const verdict = evaluateBretagneOpenDataDatasetRights(
    rightsOnly,
    Date.parse('2026-10-01T12:00:00Z'),
  );

  assert.equal(verdict.ingestionPermitted, false);
  assert.ok(verdict.blockers.includes('NO_PRIMARY_SCHEMA_EVIDENCE'));
});

test('dataset rights reject expired receipts and missing dataset licence', () => {
  const current = getBretagneOpenDataDataset(
    'reserves-naturelles-regionales-de-bretagne',
  );
  assert.ok(current);

  const broken = {
    ...current,
    licence: '',
    allowedRecordFields: ['nom'],
    status: 'RELEASE_READY' as const,
    rightsEvidence: {
      authorityRevision: 'fixture-v1',
      immutableSourceVersion: 'fixture-source-version',
      receiptPath: 'docs/control/FIXTURE_ONLY.md',
      attributionText: 'Région Bretagne',
      permittedUseSummary: 'Synthetic test fixture only.',
      reviewedAt: '2026-09-30T10:00:00Z',
      reviewerRole: 'test reviewer',
      recheckAt: '2026-10-01T10:00:00Z',
      evidenceState: 'SOURCE_CONFIRMED' as const,
      disposition: 'GO' as const,
    },
  };

  const verdict = evaluateBretagneOpenDataDatasetRights(
    broken,
    Date.parse('2026-10-01T12:00:00Z'),
  );

  assert.equal(verdict.ingestionPermitted, false);
  assert.ok(verdict.blockers.includes('NO_DATASET_LICENCE'));
  assert.ok(
    verdict.blockers.includes('DATASET_RIGHTS_EVIDENCE_INVALID_OR_EXPIRED'),
  );
});

test('current first dataset remains blocked at metadata-review state', () => {
  const current = getBretagneOpenDataDataset(
    'reserves-naturelles-regionales-de-bretagne',
  );
  assert.ok(current);

  const verdict = evaluateBretagneOpenDataDatasetRights(
    current,
    Date.parse('2026-10-01T12:00:00Z'),
  );

  assert.equal(verdict.ingestionPermitted, false);
  assert.ok(verdict.blockers.includes('DATASET_NOT_RELEASE_READY'));
  assert.ok(verdict.blockers.includes('NO_APPROVED_FIELDS'));
  assert.ok(verdict.blockers.includes('NO_DATASET_RIGHTS_EVIDENCE'));
});
