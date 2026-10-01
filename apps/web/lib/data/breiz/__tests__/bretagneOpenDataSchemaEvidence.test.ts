import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateBretagneOpenDataSchemaEvidence,
  type BretagneOpenDataSchemaEvidence,
} from '../bretagneOpenDataSchemaEvidence';

const NOW = Date.parse('2026-10-01T12:00:00Z');

function evidence(
  overrides: Partial<BretagneOpenDataSchemaEvidence> = {},
): BretagneOpenDataSchemaEvidence {
  return {
    receiptId: 'schema-fixture-001',
    datasetId: 'dataset-fixture',
    metadataUrl:
      'https://data.bretagne.bzh/api/explore/v2.1/catalog/datasets/dataset-fixture',
    observedAt: '2026-10-01T10:00:00Z',
    recheckAt: '2026-10-02T10:00:00Z',
    immutableSourceVersion: 'dataset-fixture@source-version-001',
    observedFields: ['name', 'latitude', 'longitude'],
    approvedFields: ['name', 'latitude', 'longitude'],
    evidenceRef: 'docs/control/FIXTURE_ONLY.md',
    reviewerRole: 'test reviewer',
    evidenceState: 'PRIMARY_API_SCHEMA_CONFIRMED',
    ...overrides,
  };
}

test('primary exact schema evidence permits the approved field set', () => {
  const verdict = evaluateBretagneOpenDataSchemaEvidence(
    {
      datasetId: 'dataset-fixture',
      allowedRecordFields: ['name', 'latitude', 'longitude'],
      schemaEvidence: evidence(),
    },
    NOW,
  );

  assert.equal(verdict.schemaUsable, true);
  assert.deepEqual(verdict.blockers, []);
});

test('missing schema evidence fails closed', () => {
  const verdict = evaluateBretagneOpenDataSchemaEvidence(
    {
      datasetId: 'dataset-fixture',
      allowedRecordFields: ['name'],
    },
    NOW,
  );

  assert.equal(verdict.schemaUsable, false);
  assert.deepEqual(verdict.blockers, ['NO_SCHEMA_EVIDENCE']);
});

test('secondary observation cannot become release evidence', () => {
  const verdict = evaluateBretagneOpenDataSchemaEvidence(
    {
      datasetId: 'dataset-fixture',
      allowedRecordFields: ['latitude', 'longitude'],
      schemaEvidence: evidence({
        evidenceState: 'SECONDARY_OBSERVATION_ONLY',
        approvedFields: ['latitude', 'longitude'],
      }),
    },
    NOW,
  );

  assert.equal(verdict.schemaUsable, false);
  assert.ok(verdict.blockers.includes('NOT_PRIMARY_API_EVIDENCE'));
});

test('approved fields must be observed and exactly match descriptor fields', () => {
  const verdict = evaluateBretagneOpenDataSchemaEvidence(
    {
      datasetId: 'dataset-fixture',
      allowedRecordFields: ['name', 'latitude'],
      schemaEvidence: evidence({
        approvedFields: ['name', 'longitude', 'invented_field'],
      }),
    },
    NOW,
  );

  assert.equal(verdict.schemaUsable, false);
  assert.ok(verdict.blockers.includes('APPROVED_FIELD_NOT_OBSERVED'));
  assert.ok(verdict.blockers.includes('DESCRIPTOR_FIELDS_MISMATCH'));
});

test('schema receipt binds exact official metadata endpoint and non-expired review', () => {
  const verdict = evaluateBretagneOpenDataSchemaEvidence(
    {
      datasetId: 'dataset-fixture',
      allowedRecordFields: ['name'],
      schemaEvidence: evidence({
        metadataUrl:
          'https://example.org/api/explore/v2.1/catalog/datasets/dataset-fixture',
        approvedFields: ['name'],
        recheckAt: '2026-10-01T11:00:00Z',
      }),
    },
    NOW,
  );

  assert.equal(verdict.schemaUsable, false);
  assert.ok(verdict.blockers.includes('INVALID_METADATA_URL'));
  assert.ok(
    verdict.blockers.includes('INVALID_OR_EXPIRED_SCHEMA_REVIEW'),
  );
});
