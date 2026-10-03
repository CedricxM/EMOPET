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
  assert.equal(dataset.schemaEvidence, undefined);
  assert.equal(dataset.fieldApprovalEvidence, undefined);
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
      evidenceAuthority: 'PRIMARY_API_SCHEMA' as const,
      evidenceRef: 'docs/control/FIXTURE_ONLY.md',
      reviewerRole: 'test reviewer',
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
    fieldApprovalEvidence: {
      approvedFields: ['nom', 'geometry'],
      sourceVersion: 'dataset-version-2026-10-01T12:00:00Z',
      schemaFingerprint: 'sha256:fixture-schema',
      reviewerRole: 'test product/data reviewer',
      reviewerRef: 'CONTROLLED_FIELD_REVIEWER_REF',
      reviewedAt: '2026-10-01T12:02:00Z',
      reviewReceipt: 'CONTROLLED_FIELD_APPROVAL_RECEIPT',
      purposeBoundary: 'Synthetic territorial-context fixture only.',
    },
    rightsEvidence: {
      authorityRevision: 'bretagne-open-data-dataset-rights-fixture-v2',
      immutableSourceVersion: 'dataset-version-2026-10-01T12:00:00Z',
      receiptPath: 'data/registry/receipts/FIXTURE_ONLY.json',
      attributionText: 'Région Bretagne — Licence Ouverte 2.0',
      permittedUseSummary:
        'Synthetic test fixture: selected territorial metadata under dataset-level open licence.',
      allowedProductUses: ['INGESTION'] as const,
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
      allowedProductUses: ['INGESTION'] as const,
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
      evidenceAuthority: 'PRIMARY_API_SCHEMA' as const,
      evidenceRef: 'docs/control/FIXTURE_ONLY.md',
      reviewerRole: 'test reviewer',
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
      allowedProductUses: ['INGESTION'] as const,
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

test('dataset GO evidence without INGESTION scope remains blocked', () => {
  const current = getBretagneOpenDataDataset(
    'reserves-naturelles-regionales-de-bretagne',
  );
  assert.ok(current);

  const scoped = {
    ...current,
    allowedRecordFields: ['nom'],
    status: 'RELEASE_READY' as const,
    schemaEvidence: {
      evidenceAuthority: 'PRIMARY_API_SCHEMA' as const,
      evidenceRef: 'docs/control/FIXTURE_ONLY.md',
      reviewerRole: 'test reviewer',
      observedAt: '2026-10-01T12:00:00Z',
      sourceVersion: 'dataset-v1',
      schemaFingerprint: 'sha256:fixture-schema',
      recordCount: 11,
      fields: ['nom'],
      sourceUrl:
        'https://data.bretagne.bzh/api/explore/v2.1/catalog/datasets/reserves-naturelles-regionales-de-bretagne',
    },
    fieldApprovalEvidence: {
      approvedFields: ['nom'],
      sourceVersion: 'dataset-v1',
      schemaFingerprint: 'sha256:fixture-schema',
      reviewerRole: 'test product/data reviewer',
      reviewerRef: 'CONTROLLED_REVIEWER',
      reviewedAt: '2026-10-01T12:01:00Z',
      reviewReceipt: 'CONTROLLED_FIELD_RECEIPT',
      purposeBoundary: 'Synthetic territorial-context fixture only.',
    },
    rightsEvidence: {
      authorityRevision: 'fixture-v2',
      immutableSourceVersion: 'dataset-v1',
      receiptPath: 'data/registry/receipts/FIXTURE_ONLY.json',
      attributionText: 'Région Bretagne',
      permittedUseSummary: 'Synthetic public-only fixture.',
      allowedProductUses: ['PUBLIC_ANSWER_WITH_SOURCE'] as const,
      reviewedAt: '2026-10-01T12:05:00Z',
      reviewerRole: 'test reviewer',
      recheckAt: '2026-10-02T12:00:00Z',
      evidenceState: 'SOURCE_CONFIRMED' as const,
      disposition: 'GO' as const,
    },
  };

  const verdict = evaluateBretagneOpenDataDatasetRights(
    scoped,
    Date.parse('2026-10-01T13:00:00Z'),
  );

  assert.equal(verdict.ingestionPermitted, false);
  assert.ok(verdict.blockers.includes('DATASET_RIGHTS_SCOPE_NOT_INGESTION'));
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
      evidenceAuthority: 'PRIMARY_API_SCHEMA' as const,
      evidenceRef: 'docs/control/FIXTURE_ONLY.md',
      reviewerRole: 'test reviewer',
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
      allowedProductUses: ['INGESTION'] as const,
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

test('secondary or off-origin schema observations cannot authorize release', () => {
  const current = getBretagneOpenDataDataset(
    'reserves-naturelles-regionales-de-bretagne',
  );
  assert.ok(current);

  const secondary = {
    ...current,
    allowedRecordFields: ['nom'],
    status: 'RELEASE_READY' as const,
    schemaEvidence: {
      evidenceAuthority: 'SECONDARY_OBSERVATION' as const,
      evidenceRef: 'docs/control/SECONDARY_FIXTURE_ONLY.md',
      reviewerRole: 'test reviewer',
      observedAt: '2026-10-01T12:00:00Z',
      sourceVersion: 'dataset-v1',
      schemaFingerprint: 'sha256:fixture-schema',
      recordCount: 11,
      fields: ['nom'],
      sourceUrl:
        'https://www.data.gouv.fr/fr/datasets/reserves-naturelles-regionales-de-bretagne/',
    },
    rightsEvidence: {
      authorityRevision: 'fixture-v2',
      immutableSourceVersion: 'dataset-v1',
      receiptPath: 'data/registry/receipts/FIXTURE_ONLY.json',
      attributionText: 'Région Bretagne',
      permittedUseSummary: 'Synthetic test fixture only.',
      allowedProductUses: ['INGESTION'] as const,
      reviewedAt: '2026-10-01T12:05:00Z',
      reviewerRole: 'test reviewer',
      recheckAt: '2026-10-02T12:00:00Z',
      evidenceState: 'SOURCE_CONFIRMED' as const,
      disposition: 'GO' as const,
    },
  };

  const verdict = evaluateBretagneOpenDataDatasetRights(
    secondary,
    Date.parse('2026-10-01T13:00:00Z'),
  );

  assert.equal(verdict.ingestionPermitted, false);
  assert.ok(verdict.blockers.includes('SCHEMA_EVIDENCE_NOT_PRIMARY'));
  assert.ok(verdict.blockers.includes('SCHEMA_SOURCE_URL_INVALID'));
});

test('schema evidence requires a controlled pointer and reviewer role', () => {
  const current = getBretagneOpenDataDataset(
    'reserves-naturelles-regionales-de-bretagne',
  );
  assert.ok(current);

  const noReceipt = {
    ...current,
    allowedRecordFields: ['nom'],
    status: 'RELEASE_READY' as const,
    schemaEvidence: {
      evidenceAuthority: 'PRIMARY_API_SCHEMA' as const,
      evidenceRef: '',
      reviewerRole: '',
      observedAt: '2026-10-01T12:00:00Z',
      sourceVersion: 'dataset-v1',
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
      allowedProductUses: ['INGESTION'] as const,
      reviewedAt: '2026-10-01T12:05:00Z',
      reviewerRole: 'test reviewer',
      recheckAt: '2026-10-02T12:00:00Z',
      evidenceState: 'SOURCE_CONFIRMED' as const,
      disposition: 'GO' as const,
    },
  };

  const verdict = evaluateBretagneOpenDataDatasetRights(
    noReceipt,
    Date.parse('2026-10-01T13:00:00Z'),
  );

  assert.equal(verdict.ingestionPermitted, false);
  assert.ok(verdict.blockers.includes('SCHEMA_EVIDENCE_RECEIPT_INVALID'));
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
  assert.ok(verdict.blockers.includes('NO_FIELD_APPROVAL_EVIDENCE'));
  assert.ok(verdict.blockers.includes('NO_SCHEMA_EVIDENCE'));
  assert.ok(verdict.blockers.includes('NO_DATASET_RIGHTS_EVIDENCE'));
});


test('field approval must match the exact approved field list and schema fingerprint', () => {
  const current = getBretagneOpenDataDataset(
    'reserves-naturelles-regionales-de-bretagne',
  );
  assert.ok(current);

  const mismatch = {
    ...current,
    allowedRecordFields: ['nom', 'geo_point_2d'],
    status: 'RELEASE_READY' as const,
    schemaEvidence: {
      evidenceAuthority: 'PRIMARY_API_SCHEMA' as const,
      evidenceRef: 'docs/control/FIXTURE_ONLY.md',
      reviewerRole: 'test reviewer',
      observedAt: '2026-10-01T12:00:00Z',
      sourceVersion: 'dataset-v1',
      schemaFingerprint: 'sha256:schema-v1',
      recordCount: 11,
      fields: ['id', 'nom', 'geo_point_2d'],
      sourceUrl:
        'https://data.bretagne.bzh/api/explore/v2.1/catalog/datasets/reserves-naturelles-regionales-de-bretagne',
    },
    fieldApprovalEvidence: {
      approvedFields: ['nom'],
      sourceVersion: 'dataset-v1',
      schemaFingerprint: 'sha256:different-schema',
      reviewerRole: 'test product/data reviewer',
      reviewerRef: 'CONTROLLED_REVIEWER',
      reviewedAt: '2026-10-01T12:01:00Z',
      reviewReceipt: 'CONTROLLED_FIELD_RECEIPT',
      purposeBoundary: 'Synthetic territorial-context fixture only.',
    },
  };

  const verdict = evaluateBretagneOpenDataDatasetRights(
    mismatch,
    Date.parse('2026-10-01T13:00:00Z'),
  );

  assert.equal(verdict.ingestionPermitted, false);
  assert.ok(verdict.blockers.includes('FIELD_APPROVAL_FIELDS_MISMATCH'));
  assert.ok(verdict.blockers.includes('FIELD_APPROVAL_SCHEMA_MISMATCH'));
});

test('field approval rejects blank evidence and future review dates', () => {
  const current = getBretagneOpenDataDataset(
    'reserves-naturelles-regionales-de-bretagne',
  );
  assert.ok(current);

  const broken = {
    ...current,
    allowedRecordFields: ['nom'],
    status: 'RELEASE_READY' as const,
    fieldApprovalEvidence: {
      approvedFields: ['nom'],
      sourceVersion: '',
      schemaFingerprint: '',
      reviewerRole: '',
      reviewerRef: '',
      reviewedAt: '2027-01-01T00:00:00Z',
      reviewReceipt: '',
      purposeBoundary: '',
    },
  };

  const verdict = evaluateBretagneOpenDataDatasetRights(
    broken,
    Date.parse('2026-10-01T13:00:00Z'),
  );

  assert.equal(verdict.ingestionPermitted, false);
  assert.ok(verdict.blockers.includes('FIELD_APPROVAL_EVIDENCE_INVALID'));
});
