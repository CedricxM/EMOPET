import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BRETAGNE_OPEN_DATA_ALLOWLIST,
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
