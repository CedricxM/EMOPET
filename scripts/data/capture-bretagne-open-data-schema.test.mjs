import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildBretagneSchemaSnapshot,
  captureBretagneSchemaEvidence,
} from './capture-bretagne-open-data-schema.mjs';

const DATASET_ID = 'reserves-naturelles-regionales-de-bretagne';

function fixtureMetadata({
  fields = [
    { name: 'nom', type: 'text', label: 'Nom', annotations: {} },
    { name: 'geometry', type: 'geo_shape', label: 'Géométrie', annotations: {} },
  ],
  recordsCount = 11,
} = {}) {
  return {
    dataset_id: DATASET_ID,
    dataset_uid: 'da_fixture',
    fields,
    metas: {
      default: {
        records_count: recordsCount,
        title: 'Réserves naturelles régionales de Bretagne',
        publisher: 'Région Bretagne',
        license: 'Licence Ouverte / Open Licence',
        license_url: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence',
        modified: '2026-10-01T12:00:00+00:00',
        metadata_processed: '2026-10-01T12:01:00+00:00',
        data_processed: '2026-10-01T12:00:30+00:00',
      },
    },
  };
}

test('builds deterministic schema evidence without release authority', () => {
  const input = {
    datasetId: DATASET_ID,
    metadata: fixtureMetadata(),
    recordsProbe: { total_count: 11, results: [] },
    observedAt: '2026-10-01T13:00:00Z',
    metadataUrl: 'https://example.test/metadata',
    recordsProbeUrl: 'https://example.test/records?limit=0',
  };

  const first = buildBretagneSchemaSnapshot(input);
  const reordered = buildBretagneSchemaSnapshot({
    ...input,
    metadata: fixtureMetadata({
      fields: [...fixtureMetadata().fields].reverse(),
    }),
  });

  assert.equal(first.countConsistent, true);
  assert.equal(first.dataset.recordCount, 11);
  assert.equal(first.dataset.metadataRecordCount, 11);
  assert.deepEqual(first.schemaEvidenceCandidate.fields, ['geometry', 'nom']);
  assert.match(first.schemaFingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.match(first.sourceVersion, /^sha256:[a-f0-9]{64}$/);
  assert.equal(first.schemaFingerprint, reordered.schemaFingerprint);
  assert.equal(first.sourceVersion, reordered.sourceVersion);
  assert.equal(first.reviewBoundary.releaseReady, false);
  assert.equal(first.reviewBoundary.rightsDisposition, null);
});

test('detects an in-flight record-count mismatch', () => {
  const snapshot = buildBretagneSchemaSnapshot({
    datasetId: DATASET_ID,
    metadata: fixtureMetadata({ recordsCount: 10 }),
    recordsProbe: { total_count: 11, results: [] },
    observedAt: '2026-10-01T13:00:00Z',
    metadataUrl: 'https://example.test/metadata',
    recordsProbeUrl: 'https://example.test/records?limit=0',
  });

  assert.equal(snapshot.countConsistent, false);
  assert.equal(snapshot.dataset.metadataRecordCount, 10);
  assert.equal(snapshot.dataset.recordCount, 11);
});

test('rejects unreviewed dataset identifiers before any network request', async () => {
  let calls = 0;
  await assert.rejects(
    captureBretagneSchemaEvidence({
      datasetId: 'some-random-public-dataset',
      fetchImpl: async () => {
        calls += 1;
        throw new Error('network should not be reached');
      },
    }),
    /not controlled for schema capture/,
  );
  assert.equal(calls, 0);
});

test('zero-row live probe never persists a record payload', async () => {
  const calls = [];
  const responses = [
    fixtureMetadata(),
    { total_count: 11, results: [] },
  ];

  const snapshot = await captureBretagneSchemaEvidence({
    datasetId: DATASET_ID,
    observedAt: '2026-10-01T13:00:00Z',
    fetchImpl: async (url) => {
      calls.push(String(url));
      const payload = responses.shift();
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => payload,
      };
    },
  });

  assert.equal(calls.length, 2);
  assert.match(calls[1], /\/records\?limit=0$/);
  assert.equal(snapshot.dataset.recordCount, 11);
  assert.equal('results' in snapshot, false);
});

test('refuses a records probe that unexpectedly contains row data', () => {
  assert.throws(
    () =>
      buildBretagneSchemaSnapshot({
        datasetId: DATASET_ID,
        metadata: fixtureMetadata(),
        recordsProbe: { total_count: 11, results: [{ nom: 'should-not-persist' }] },
        observedAt: '2026-10-01T13:00:00Z',
        metadataUrl: 'https://example.test/metadata',
        recordsProbeUrl: 'https://example.test/records?limit=0',
      }),
    /unexpectedly returned record payloads/,
  );
});
