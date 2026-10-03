import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  BRETAGNE_RNR_DATASET_ID,
  BRETAGNE_RNR_OUTBOUND_RECEIPT_SCHEMA_VERSION,
  BRETAGNE_RNR_OUTREACH_PACKET_GIT_BLOB_SHA,
  BRETAGNE_RNR_OUTREACH_PACKET_PATH,
  BRETAGNE_RNR_OUTREACH_SUBJECT,
  BRETAGNE_RNR_RECIPIENT_ADDRESS,
  BRETAGNE_RNR_RECIPIENT_AUTHORITY_ROLE,
  BRETAGNE_RNR_SOURCE_VERSION,
  evaluateBretagneRnrOutboundMessageReceipt,
} from '../bretagneRnrOutboundMessageEvidence';

const REPO_ROOT = fileURLToPath(new URL('../../../../../../', import.meta.url));
const REGISTER_PATH = resolve(
  REPO_ROOT,
  'data/registry/receipts/bretagne-rnr-licence-clarification-v1.json',
);
const SCHEMA_PATH = resolve(
  REPO_ROOT,
  'data/registry/schemas/bretagne-rnr-outbound-message-receipt-v1.schema.json',
);

const NOW = Date.parse('2026-10-02T18:00:00Z');

function fixture() {
  return {
    schemaVersion: BRETAGNE_RNR_OUTBOUND_RECEIPT_SCHEMA_VERSION,
    evidenceType: 'OUTBOUND_MESSAGE',
    datasetId: BRETAGNE_RNR_DATASET_ID,
    sourceVersion: BRETAGNE_RNR_SOURCE_VERSION,
    outreachPacketPath: BRETAGNE_RNR_OUTREACH_PACKET_PATH,
    outreachPacketGitBlobSha: BRETAGNE_RNR_OUTREACH_PACKET_GIT_BLOB_SHA,
    recipientAuthorityRole: BRETAGNE_RNR_RECIPIENT_AUTHORITY_ROLE,
    recipientAddress: BRETAGNE_RNR_RECIPIENT_ADDRESS,
    transportClass: 'EMAIL',
    providerReferenceDigest:
      'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    subject: BRETAGNE_RNR_OUTREACH_SUBJECT,
    sentAt: '2026-10-02T17:00:00Z',
    capturedAt: '2026-10-02T17:01:00Z',
    senderRole: 'EMOPET authorised outreach sender',
    reviewerRole: 'EMOPET data-rights reviewer',
    reviewedAt: '2026-10-02T17:05:00Z',
    receiptPath:
      'data/registry/receipts/bretagne-rnr-outbound-message-aaaaaaaaaaaa.json',
    messageBodyStoredInRepository: false,
    privateContactDataStoredInRepository: false,
    responseReceivedClaimed: false,
    partnershipClaimed: false,
    rightsPromoted: false,
  } as const;
}

test('valid outbound receipt creates only a manual message-state patch candidate', () => {
  const result = evaluateBretagneRnrOutboundMessageReceipt(fixture(), NOW);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.ok(result.registerPatchCandidate);
  assert.equal(result.registerPatchCandidate.canApplyAutomatically, false);
  assert.equal(
    result.registerPatchCandidate.unchangedBoundaries.runtimeRightsDisposition,
    'HOLD',
  );
  assert.equal(result.registerPatchCandidate.unchangedBoundaries.releaseAllowed, false);
  assert.equal(
    result.registerPatchCandidate.unchangedBoundaries.fieldApprovalUnchanged,
    true,
  );
  assert.equal(
    result.registerPatchCandidate.unchangedBoundaries.schemaEvidenceUnchanged,
    true,
  );
  assert.equal(
    result.registerPatchCandidate.unchangedBoundaries.partnershipStatusUnchanged,
    true,
  );
  assert.deepEqual(result.registerPatchCandidate.patchOperations, [
    {
      op: 'replace',
      path: '/clarificationRequest/messageSent',
      value: true,
    },
    {
      op: 'add',
      path: '/clarificationRequest/messageEvidenceRef',
      value: fixture().receiptPath,
    },
  ]);
});

test('current controlled register is still unsent and rights remain HOLD', async () => {
  const register = JSON.parse(await readFile(REGISTER_PATH, 'utf8'));

  assert.equal(register.datasetId, BRETAGNE_RNR_DATASET_ID);
  assert.equal(register.sourceVersion, BRETAGNE_RNR_SOURCE_VERSION);
  assert.equal(register.clarificationRequest.messageSent, false);
  assert.equal(register.clarificationRequest.messageEvidenceRef, undefined);
  assert.equal(register.runtimeRightsDisposition, 'HOLD');
  assert.equal(register.releaseAllowed, false);
  assert.equal(register.authoritativeConfirmation, null);
});

test('receipt is bound to the exact reviewed outreach packet git blob', () => {
  const gitBlobSha = execFileSync(
    'git',
    ['rev-parse', `HEAD:${BRETAGNE_RNR_OUTREACH_PACKET_PATH}`],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    },
  ).trim();

  assert.equal(gitBlobSha, BRETAGNE_RNR_OUTREACH_PACKET_GIT_BLOB_SHA);
});

test('machine-readable JSON schema preserves the same authority constants', async () => {
  const schema = JSON.parse(await readFile(SCHEMA_PATH, 'utf8'));

  assert.equal(
    schema.properties.schemaVersion.const,
    BRETAGNE_RNR_OUTBOUND_RECEIPT_SCHEMA_VERSION,
  );
  assert.equal(schema.properties.datasetId.const, BRETAGNE_RNR_DATASET_ID);
  assert.equal(schema.properties.sourceVersion.const, BRETAGNE_RNR_SOURCE_VERSION);
  assert.equal(
    schema.properties.outreachPacketGitBlobSha.const,
    BRETAGNE_RNR_OUTREACH_PACKET_GIT_BLOB_SHA,
  );
  assert.equal(
    schema.properties.recipientAddress.const,
    BRETAGNE_RNR_RECIPIENT_ADDRESS,
  );
  assert.equal(schema.properties.subject.const, BRETAGNE_RNR_OUTREACH_SUBJECT);
  assert.equal(schema.additionalProperties, false);
});

test('wrong recipient, source version or outreach packet stays blocked', () => {
  for (const mutation of [
    { recipientAddress: 'someone@example.com' },
    { sourceVersion: 'sha256:' + 'b'.repeat(64) },
    { outreachPacketGitBlobSha: 'b'.repeat(40) },
  ]) {
    const result = evaluateBretagneRnrOutboundMessageReceipt(
      { ...fixture(), ...mutation },
      NOW,
    );
    assert.equal(result.valid, false);
    assert.equal(result.registerPatchCandidate, null);
  }
});

test('raw/private message material is rejected as an unexpected field', () => {
  for (const extra of [
    { messageBody: 'full email body' },
    { rawMime: 'MIME-Version: 1.0' },
    { oauthToken: 'secret' },
    { senderEmail: 'private@example.com' },
    { providerMessageId: 'raw-provider-id' },
    { screenshotPath: 'private/inbox.png' },
  ]) {
    const result = evaluateBretagneRnrOutboundMessageReceipt(
      { ...fixture(), ...extra },
      NOW,
    );

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.startsWith('unexpected field ')));
  }
});

test('provider reference must be a privacy-preserving SHA-256 digest', () => {
  for (const providerReferenceDigest of [
    '',
    'gmail-message-id-123',
    'sha256:abc',
    'SHA256:' + 'a'.repeat(64),
  ]) {
    const result = evaluateBretagneRnrOutboundMessageReceipt(
      { ...fixture(), providerReferenceDigest },
      NOW,
    );
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.includes(
        'providerReferenceDigest must be sha256:<64 lowercase hex>',
      ),
    );
  }
});

test('timestamps must be ordered and non-future', () => {
  const future = evaluateBretagneRnrOutboundMessageReceipt(
    { ...fixture(), sentAt: '2026-10-02T19:00:00Z' },
    NOW,
  );
  assert.equal(future.valid, false);
  assert.ok(
    future.errors.includes('sentAt must be a valid non-future timestamp'),
  );

  const capturedBeforeSend = evaluateBretagneRnrOutboundMessageReceipt(
    {
      ...fixture(),
      sentAt: '2026-10-02T17:10:00Z',
      capturedAt: '2026-10-02T17:09:00Z',
    },
    NOW,
  );
  assert.equal(capturedBeforeSend.valid, false);
  assert.ok(capturedBeforeSend.errors.includes('capturedAt must not predate sentAt'));

  const reviewedBeforeCapture = evaluateBretagneRnrOutboundMessageReceipt(
    {
      ...fixture(),
      capturedAt: '2026-10-02T17:10:00Z',
      reviewedAt: '2026-10-02T17:09:00Z',
    },
    NOW,
  );
  assert.equal(reviewedBeforeCapture.valid, false);
  assert.ok(
    reviewedBeforeCapture.errors.includes('reviewedAt must not predate capturedAt'),
  );
});

test('receipt cannot smuggle response, partnership or rights promotion claims', () => {
  for (const field of [
    'messageBodyStoredInRepository',
    'privateContactDataStoredInRepository',
    'responseReceivedClaimed',
    'partnershipClaimed',
    'rightsPromoted',
  ] as const) {
    const result = evaluateBretagneRnrOutboundMessageReceipt(
      { ...fixture(), [field]: true },
      NOW,
    );

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes(`${field} must remain false`));
  }
});

test('sender and reviewer are role labels, not private email addresses', () => {
  for (const mutation of [
    { senderRole: 'cedric@example.com' },
    { reviewerRole: 'reviewer@example.com' },
  ]) {
    const result = evaluateBretagneRnrOutboundMessageReceipt(
      { ...fixture(), ...mutation },
      NOW,
    );

    assert.equal(result.valid, false);
    assert.equal(result.registerPatchCandidate, null);
  }
});
