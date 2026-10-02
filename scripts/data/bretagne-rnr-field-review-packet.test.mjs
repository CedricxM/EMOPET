import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  BRETAGNE_RNR_FIELD_REVIEW_PACKET_REVISION,
  DEFAULT_SCHEMA_RECEIPT_PATH,
  buildBretagneRnrFieldReviewPacket,
  buildBretagneRnrFieldReviewPacketFromFile,
  validateBretagneRnrFieldReviewSource,
} from './bretagne-rnr-field-review-packet.mjs';

test('current durable RNR schema receipt builds a bounded human-review packet', async () => {
  const packet = await buildBretagneRnrFieldReviewPacketFromFile();

  assert.equal(
    packet.packetRevision,
    BRETAGNE_RNR_FIELD_REVIEW_PACKET_REVISION,
  );
  assert.equal(packet.status, 'DRAFT_HUMAN_REVIEW_REQUIRED');
  assert.equal(packet.responseTemplate.automaticApplyAllowed, false);

  assert.deepEqual(
    packet.candidateFields.map((field) => field.name),
    ['id', 'nom', 'geo_point_2d'],
  );

  assert.match(packet.purposeBoundary, /Do not authorize dog-access/);
  assert.equal(packet.sourceState.runtimeIngestionPermitted, false);
  assert.equal(packet.sourceState.releaseDisposition, 'HOLD');
});

test('packet is bound to the current schema source version and fingerprint', async () => {
  const raw = JSON.parse(
    await readFile(DEFAULT_SCHEMA_RECEIPT_PATH, 'utf8'),
  );
  const packet = buildBretagneRnrFieldReviewPacket(raw);

  assert.equal(packet.sourceVersion, raw.sourceVersion);
  assert.equal(packet.schemaFingerprint, raw.schemaFingerprint);
  assert.equal(packet.datasetId, raw.datasetId);
  assert.equal(packet.schemaEvidencePath, DEFAULT_SCHEMA_RECEIPT_PATH);
});

test('candidate fields must exist in the live schema and remain CANDIDATE', async () => {
  const raw = JSON.parse(
    await readFile(DEFAULT_SCHEMA_RECEIPT_PATH, 'utf8'),
  );

  const missingField = {
    ...raw,
    candidateMinimumFields: [
      ...raw.candidateMinimumFields,
      {
        name: 'invented_field',
        state: 'CANDIDATE',
        reason: 'Synthetic invalid fixture.',
      },
    ],
  };

  const errors = validateBretagneRnrFieldReviewSource(missingField);
  assert.ok(
    errors.some((error) =>
      error.includes('invented_field: candidate not present in live schema inventory'),
    ),
  );

  const promotedWithoutReview = {
    ...raw,
    candidateMinimumFields: raw.candidateMinimumFields.map((field, index) =>
      index === 0 ? { ...field, state: 'APPROVED' } : field,
    ),
  };

  assert.ok(
    validateBretagneRnrFieldReviewSource(promotedWithoutReview).some((error) =>
      error.includes('candidate state must remain CANDIDATE'),
    ),
  );
});

test('candidate and deferred field sets cannot overlap or duplicate', async () => {
  const raw = JSON.parse(
    await readFile(DEFAULT_SCHEMA_RECEIPT_PATH, 'utf8'),
  );

  const overlap = {
    ...raw,
    deferredFields: [
      ...raw.deferredFields,
      {
        fields: ['nom', 'description'],
        reason: 'Synthetic overlap fixture.',
      },
    ],
  };

  const errors = validateBretagneRnrFieldReviewSource(overlap);
  assert.ok(
    errors.some((error) =>
      error.includes('deferred field names must not be duplicated'),
    ),
  );
  assert.ok(
    errors.some((error) =>
      error.includes('nom: field cannot be both candidate and deferred'),
    ),
  );
});

test('review packet refuses a source receipt that already claims release authority', async () => {
  const raw = JSON.parse(
    await readFile(DEFAULT_SCHEMA_RECEIPT_PATH, 'utf8'),
  );

  const invalid = {
    ...raw,
    releaseDisposition: 'GO',
    runtimeIngestionPermitted: true,
  };

  const errors = validateBretagneRnrFieldReviewSource(invalid);

  assert.ok(
    errors.includes(
      'runtimeIngestionPermitted must remain false before field approval',
    ),
  );
  assert.ok(
    errors.includes('releaseDisposition must remain HOLD before field approval'),
  );
});

test('review packet requests explicit disposition and evidence for every candidate', async () => {
  const packet = await buildBretagneRnrFieldReviewPacketFromFile();

  for (const field of packet.candidateFields) {
    assert.deepEqual(field.requestedDisposition, [
      'APPROVE',
      'REJECT',
      'APPROVE_WITH_CONDITIONS',
    ]);
  }

  assert.ok(
    packet.responseTemplate.requiredFields.includes('evidence_reference'),
  );
  assert.ok(
    packet.responseTemplate.requiredFields.includes('approved_fields'),
  );
  assert.ok(
    packet.responseTemplate.requiredFields.includes(
      'purpose_boundary_confirmation',
    ),
  );
});
