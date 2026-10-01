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
  assert.deepEqual(dataset.allowedRecordFields, [
    'id',
    'nom',
    'geo_point_2d',
    'surface',
    'date_creation',
  ]);
  assert.equal(dataset.status, 'METADATA_REVIEWED_FIELDS_OPEN');
  assert.ok(dataset.schemaEvidence);
  assert.equal(dataset.schemaEvidence.recordCount, 11);
  assert.equal(
    dataset.schemaEvidence.schemaFingerprint,
    'sha256:c1c150f210e79b85c31525863b6ee92dd7d96a504c61fc0456c38e38355eb9dd',
  );
  for (const field of dataset.allowedRecordFields) {
    assert.ok(dataset.schemaEvidence.fields.includes(field), field);
  }
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

test('record retrieval remains blocked until dataset status and rights are promoted', () => {
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

test('release-ready fixture requires fresh schema and rights bound to the same version', () => {
  const current = getBretagneOpenDataDataset(
    'reserves-naturelles-regionales-de-bretagne',
  );
  assert.ok(current);

  const releaseReady = {
    ...current,
    allowedRecordFields: ['nom', 'geometry'],
    status: 'RELEASE_READY' as const,
    schemaEvidence: {
      observedAt: '2026-10-01T12:00:00Z',
      sourceVersion: 'dataset-version-2026-10-01T12:00:00Z',
      schemaFingerprint: 'sha256:fixture-schema',
      recordCount: 11,
      fields: ['nom', 'geometry', 'other'],
      sourceUrl:
        'https://data.bretagne.bzh/api/explore/v2.1/catalog/datasets/reserves-naturelles-regionales-de-bretagne',
      metadataProcessedAt: '2026-10-01T11:55:00Z',
      dataProcessedAt: '2026-10-01T11:55:00Z',
    },
    rightsEvidence: {
      authorityRevision: 'bretagne-open-data-dataset-rights-fixture-v2',
      immutableSourceVersion: 'dataset-version-2026-10-01T12:00:00Z',
      receiptPath: 'data/registry/receipts/FIXTURE_ONLY.json',
      attributionText: 'Région Bretagne — Licence Ouverte 2.0',
      permittedUseSummary:
        'Synthetic test fixture: selected territorial metadata under dataset-level open licence.',
      reviewedAt: '2026-10-01T12:05:00Z',
      reviewerRole: 'test reviewer',
      recheckAt: '2026-10-02T12:00:00Z',
      evidenceState: 'SOURCE_CONFIRMED' as const,
      disposition: 'GO' as const,
    },
  };

  const verdict = evaluateBretagneOpenDataDatasetRights(
    releaseReady,
    Date.parse('2026-10-01T13:00:00Z'),
  );

  assert.equal(verdict.ingestionPermitted, true);
  assert.deepEqual(verdict.blockers, []);
});

test('release-ready fixture stays blocked without exact live schema evidence', () => {
  const current = getBretagneOpenDataDataset(
    'reserves-naturelles-regionales-de-bretagne',
  );
  assert.ok(current);

  const releaseReadyWithoutSchema = {
    ...current,
    allowedRecordFields: ['nom'],
    status: 'RELEASE_READY' as const,
    rightsEvidence: {
      authorityRevision: 'fixture-v2',
      immutableSourceVersion: 'dataset-version',
      receiptPath: 'data/registry/receipts/FIXTURE_ONLY.json',
      attributionText: 'Région Bretagne',
      permittedUseSummary: 'Synthetic test fixture only.',
      reviewedAt: '2026-10-01T12:00:00Z',
      reviewerRole: 'test reviewer',
      recheckAt: '2026-10-02T12:00:00Z',
      evidenceState: 'SOURCE_CONFIRMED' as const,
      disposition: 'GO' as const,
    },
  };

  const verdict = evaluateBretagneOpenDataDatasetRights(
    releaseReadyWithoutSchema,
    Date.parse('2026-10-01T13:00:00Z'),
  );

  assert.equal(verdict.ingestionPermitted, false);
  assert.ok(verdict.blockers.includes('NO_SCHEMA_EVIDENCE'));
});

test('schema evidence must be fresh and contain every approved field', () => {
  const current = getBretagneOpenDataDataset(
    'reserves-naturelles-regionales-de-bretagne',
  );
  assert.ok(current);

  const broken = {
    ...current,
    allowedRecordFields: ['nom', 'geometry'],
    status: 'RELEASE_READY' as const,
    schemaEvidence: {
      observedAt: '2026-09-29T10:00:00Z',
      sourceVersion: 'dataset-v1',
      schemaFingerprint: 'sha256:fixture-schema',
      recordCount: 10,
      fields: ['nom'],
      sourceUrl:
        'https://data.bretagne.bzh/api/explore/v2.1/catalog/datasets/reserves-naturelles-regionales-de-bretagne',
    },
    rightsEvidence: {
      authorityRevision: 'fixture-v2',
      immutableSourceVersion: 'dataset-v1',
      receiptPath: 'data/registry/receipts/FIXTURE_ONLY.json',
      attributionText: 'Région Bretagne',
      permittedUseSummary: 'Synthetic test fixture only.',
      reviewedAt: '2026-10-01T10:00:00Z',
      reviewerRole: 'test reviewer',
      recheckAt: '2026-10-02T12:00:00Z',
      evidenceState: 'SOURCE_CONFIRMED' as const,
      disposition: 'GO' as const,
    },
  };

  const verdict = evaluateBretagneOpenDataDatasetRights(
    broken,
    Date.parse('2026-10-01T13:00:00Z'),
  );

  assert.equal(verdict.ingestionPermitted, false);
  assert.ok(verdict.blockers.includes('SCHEMA_EVIDENCE_INVALID_OR_STALE'));
  assert.ok(verdict.blockers.includes('APPROVED_FIELDS_NOT_IN_SCHEMA'));
});

test('rights receipt cannot authorize a different schema/source version', () => {
  const current = getBretagneOpenDataDataset(
    'reserves-naturelles-regionales-de-bretagne',
  );
  assert.ok(current);

  const mismatch = {
    ...current,
    allowedRecordFields: ['nom'],
    status: 'RELEASE_READY' as const,
    schemaEvidence: {
      observedAt: '2026-10-01T12:00:00Z',
      sourceVersion: 'dataset-v2',
      schemaFingerprint: 'sha256:fixture-schema',
      recordCount: 11,
      fields: ['nom'],
      sourceUrl:
        'https://data.bretagne.bzh/api/explore/v2.1/catalog/datasets/reserves-naturelles-regionales-de-bretagne',
    },
    rightsEvidence: {
      authorityRevision: 'fixture-v2',
      immutableSourceVersion: 'dataset-v1',
      receiptPath: 'data/registry/receipts/FIXTURE_ONLY.json',
      attributionText: 'Région Bretagne',
      permittedUseSummary: 'Synthetic test fixture only.',
      reviewedAt: '2026-10-01T12:05:00Z',
      reviewerRole: 'test reviewer',
      recheckAt: '2026-10-02T12:00:00Z',
      evidenceState: 'SOURCE_CONFIRMED' as const,
      disposition: 'GO' as const,
    },
  };

  const verdict = evaluateBretagneOpenDataDatasetRights(
    mismatch,
    Date.parse('2026-10-01T13:00:00Z'),
  );

  assert.equal(verdict.ingestionPermitted, false);
  assert.ok(verdict.blockers.includes('RIGHTS_VERSION_SCHEMA_MISMATCH'));
});

test('current first dataset has fields + schema but remains blocked at metadata-review state', () => {
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
  assert.ok(!verdict.blockers.includes('NO_APPROVED_FIELDS'));
  assert.ok(!verdict.blockers.includes('NO_SCHEMA_EVIDENCE'));
  assert.ok(verdict.blockers.includes('NO_DATASET_RIGHTS_EVIDENCE'));
});
