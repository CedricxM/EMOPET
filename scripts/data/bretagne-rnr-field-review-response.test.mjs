import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BRETAGNE_RNR_FIELD_REVIEW_RESPONSE_REVISION,
  evaluateBretagneRnrFieldReviewResponse,
} from './bretagne-rnr-field-review-response.mjs';
import {
  BRETAGNE_RNR_FIELD_REVIEW_PACKET_REVISION,
  buildBretagneRnrFieldReviewPacketFromFile,
} from './bretagne-rnr-field-review-packet.mjs';

const NOW = Date.parse('2026-10-02T00:30:00Z');

async function packet() {
  return buildBretagneRnrFieldReviewPacketFromFile();
}

async function response(overrides = {}) {
  const current = await packet();
  return {
    responseRevision: BRETAGNE_RNR_FIELD_REVIEW_RESPONSE_REVISION,
    packetRevision: BRETAGNE_RNR_FIELD_REVIEW_PACKET_REVISION,
    datasetId: current.datasetId,
    sourceVersion: current.sourceVersion,
    schemaFingerprint: current.schemaFingerprint,
    disposition: 'APPROVE',
    reviewerRole: 'product/data reviewer',
    reviewerRef: 'CONTROLLED_REVIEWER_REF',
    reviewedAt: '2026-10-02T00:00:00Z',
    evidenceReference: 'CONTROLLED_FIELD_REVIEW_RECEIPT',
    approvedFields: ['id', 'nom', 'geo_point_2d'],
    purposeBoundaryConfirmed: true,
    conditionsOrRestrictions: '',
    attributionOrNotes: 'No additional note.',
    automaticApplyAllowed: false,
    ...overrides,
  };
}

test('exact approved response creates a human-code-review-only proposal', async () => {
  const currentPacket = await packet();
  const result = evaluateBretagneRnrFieldReviewResponse(
    await response(),
    currentPacket,
    NOW,
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.ok(result.proposal);
  assert.equal(result.proposal.canApplyAutomatically, false);
  assert.equal(
    result.proposal.proposalStatus,
    'HUMAN_CODE_REVIEW_REQUIRED',
  );
  assert.deepEqual(result.proposal.approvedFields, [
    'id',
    'nom',
    'geo_point_2d',
  ]);
  assert.equal(result.proposal.sourceVersion, currentPacket.sourceVersion);
  assert.equal(
    result.proposal.schemaFingerprint,
    currentPacket.schemaFingerprint,
  );
});

test('response fails closed when packet/source/schema binding drifts', async () => {
  const currentPacket = await packet();
  const invalid = await response({
    packetRevision: 'old-packet',
    sourceVersion: 'old-source-version',
    schemaFingerprint: 'sha256:old-schema',
  });

  const result = evaluateBretagneRnrFieldReviewResponse(
    invalid,
    currentPacket,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.equal(result.proposal, null);
  assert.ok(result.errors.includes('packetRevision mismatch'));
  assert.ok(result.errors.includes('sourceVersion mismatch'));
  assert.ok(result.errors.includes('schemaFingerprint mismatch'));
});

test('approved fields must be unique and come only from candidate set', async () => {
  const currentPacket = await packet();
  const invalid = await response({
    approvedFields: ['nom', 'nom', 'description'],
  });

  const result = evaluateBretagneRnrFieldReviewResponse(
    invalid,
    currentPacket,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('approvedFields must be unique'));
  assert.ok(
    result.errors.includes(
      'approvedFields must be a subset of packet candidate fields',
    ),
  );
});

test('conditional approval requires explicit conditions', async () => {
  const currentPacket = await packet();
  const invalid = await response({
    disposition: 'APPROVE_WITH_CONDITIONS',
    conditionsOrRestrictions: '   ',
  });

  const result = evaluateBretagneRnrFieldReviewResponse(
    invalid,
    currentPacket,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes(
      'conditional approval requires conditionsOrRestrictions',
    ),
  );
});

test('rejection is valid evidence but cannot create an approval proposal', async () => {
  const currentPacket = await packet();
  const rejected = await response({
    disposition: 'REJECT',
    approvedFields: [],
    conditionsOrRestrictions:
      'Candidate field set should be revised before approval.',
  });

  const result = evaluateBretagneRnrFieldReviewResponse(
    rejected,
    currentPacket,
    NOW,
  );

  assert.equal(result.valid, true);
  assert.equal(result.proposal, null);
});

test('rejection cannot smuggle approved fields', async () => {
  const currentPacket = await packet();
  const invalid = await response({
    disposition: 'REJECT',
    approvedFields: ['nom'],
  });

  const result = evaluateBretagneRnrFieldReviewResponse(
    invalid,
    currentPacket,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes('rejection must not carry approved fields'),
  );
});

test('future review timestamps and missing evidence fail closed', async () => {
  const currentPacket = await packet();
  const invalid = await response({
    reviewedAt: '2027-01-01T00:00:00Z',
    evidenceReference: '',
    reviewerRole: '',
    reviewerRef: '',
  });

  const result = evaluateBretagneRnrFieldReviewResponse(
    invalid,
    currentPacket,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes('reviewedAt must be valid and non-future'),
  );
  assert.ok(result.errors.includes('evidenceReference required'));
  assert.ok(result.errors.includes('reviewerRole required'));
  assert.ok(result.errors.includes('reviewerRef required'));
});

test('purpose boundary confirmation is mandatory', async () => {
  const currentPacket = await packet();
  const invalid = await response({
    purposeBoundaryConfirmed: false,
  });

  const result = evaluateBretagneRnrFieldReviewResponse(
    invalid,
    currentPacket,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes('purposeBoundaryConfirmed must be true'),
  );
});

test('automatic apply can never be enabled by response data', async () => {
  const currentPacket = await packet();
  const invalid = await response({
    automaticApplyAllowed: true,
  });

  const result = evaluateBretagneRnrFieldReviewResponse(
    invalid,
    currentPacket,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes('automaticApplyAllowed must never be true'),
  );
});
