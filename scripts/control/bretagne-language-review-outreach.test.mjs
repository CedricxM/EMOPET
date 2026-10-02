import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  validateBretagneLanguageReviewOutreach,
  validateBretagneLanguageReviewOutreachFiles,
} from './bretagne-language-review-outreach.mjs';

const NOW = Date.parse('2026-10-02T10:00:00Z');

function register(status = 'CANDIDATE_NOT_CONTACTED', preparation = 'DRAFT_PREPARED') {
  return {
    schemaVersion: 'emopet-bretagne-language-review-outreach-v1',
    currentPacketRevision: 'bretagne-language-review-packet-v1-2026-10-01',
    allowedRelationshipStatuses: [
      'CANDIDATE_NOT_CONTACTED',
      'OUTREACH_SENT',
      'RESPONSE_RECEIVED',
      'REVIEW_SCOPE_DISCUSSION',
      'REVIEW_SCOPE_AGREED',
      'DECLINED',
      'DEFERRED',
    ],
    allowedPreparationStatuses: ['NOT_PREPARED', 'DRAFT_PREPARED'],
    candidates: [
      {
        candidateId: 'oplb-termbret',
        organisationName: 'Office public de la langue bretonne / TermBret',
        reviewDomain: 'breton_language_terminology',
        relationshipStatus: status,
        preparationStatus: preparation,
        proposedReviewItems: ['bretagne_companion_identity'],
        publicSources: ['https://www.fr.brezhoneg.bzh/'],
        partnershipClaimAllowed: false,
        reviewerClaimAllowed: false,
        contactDataStored: false,
      },
    ],
  };
}

function evidence(receipts = []) {
  return {
    schemaVersion: 'emopet-bretagne-language-review-outreach-evidence-v1',
    receipts,
  };
}

function receipt(overrides = {}) {
  return {
    receiptId: 'receipt-001',
    candidateId: 'oplb-termbret',
    status: 'OUTREACH_SENT',
    evidenceType: 'OUTBOUND_MESSAGE',
    occurredAt: '2026-10-02T08:30:00Z',
    evidenceRef: 'CONTROLLED_OUTBOUND_REF',
    packetRevision: 'bretagne-language-review-packet-v1-2026-10-01',
    reviewItemIds: ['bretagne_companion_identity'],
    summary: 'Bounded language-review request sent to the exact institution.',
    containsPersonalData: false,
    partnershipClaimAllowed: false,
    reviewerClaimAllowed: false,
    ...overrides,
  };
}

test('current repository language-review candidates remain valid not-contacted drafts', async () => {
  assert.deepEqual(
    await validateBretagneLanguageReviewOutreachFiles(undefined, undefined, NOW),
    [],
  );
});

test('prepared draft is not evidence of OUTREACH_SENT', () => {
  const errors = validateBretagneLanguageReviewOutreach(
    register('OUTREACH_SENT', 'DRAFT_PREPARED'),
    evidence(),
    NOW,
  );

  assert.ok(
    errors.some((error) =>
      error.includes('DRAFT_PREPARED cannot justify relationship state OUTREACH_SENT'),
    ),
  );
  assert.ok(
    errors.some((error) =>
      error.includes('OUTREACH_SENT requires matching OUTBOUND_MESSAGE receipt'),
    ),
  );
});

test('exact outbound receipt can justify OUTREACH_SENT without partnership or reviewer claims', () => {
  const errors = validateBretagneLanguageReviewOutreach(
    register('OUTREACH_SENT', 'DRAFT_PREPARED'),
    evidence([receipt()]),
    NOW,
  );

  assert.deepEqual(errors, []);
});

test('response and review-scope states require distinct evidence types', () => {
  const cases = [
    ['RESPONSE_RECEIVED', 'INBOUND_MESSAGE'],
    ['REVIEW_SCOPE_DISCUSSION', 'REVIEW_SCOPE_DISCUSSION_NOTE'],
    ['REVIEW_SCOPE_AGREED', 'REVIEW_SCOPE_AGREEMENT'],
    ['DECLINED', 'DECLINE'],
    ['DEFERRED', 'INTERNAL_DEFER_DECISION'],
  ];

  for (const [status, evidenceType] of cases) {
    const errors = validateBretagneLanguageReviewOutreach(
      register(status, 'DRAFT_PREPARED'),
      evidence([
        receipt({
          receiptId: 'receipt-' + status.toLowerCase(),
          status,
          evidenceType,
        }),
      ]),
      NOW,
    );
    assert.deepEqual(errors, [], status);
  }
});

test('not-contacted state rejects outbound/inbound communication evidence', () => {
  const errors = validateBretagneLanguageReviewOutreach(
    register(),
    evidence([receipt()]),
    NOW,
  );

  assert.ok(
    errors.some((error) =>
      error.includes('CANDIDATE_NOT_CONTACTED cannot coexist with evidence receipts'),
    ),
  );
});

test('evidence must stay non-personal and cannot create partnership/reviewer claims', () => {
  const errors = validateBretagneLanguageReviewOutreach(
    register('OUTREACH_SENT'),
    evidence([
      receipt({
        containsPersonalData: true,
        partnershipClaimAllowed: true,
        reviewerClaimAllowed: true,
      }),
    ]),
    NOW,
  );

  assert.ok(errors.some((error) => error.includes('containsPersonalData')));
  assert.ok(errors.some((error) => error.includes('partnershipClaimAllowed')));
  assert.ok(errors.some((error) => error.includes('reviewerClaimAllowed')));
});

test('candidate register requires HTTPS public sources and no implicit reviewer status', () => {
  const current = register();
  current.candidates[0].publicSources = ['http://example.org'];
  current.candidates[0].reviewerClaimAllowed = true;

  const errors = validateBretagneLanguageReviewOutreach(
    current,
    evidence(),
    NOW,
  );

  assert.ok(errors.some((error) => error.includes('HTTPS-only')));
  assert.ok(errors.some((error) => error.includes('reviewerClaimAllowed')));
});


test('packet-bound outreach evidence must bind the current packet revision', () => {
  const errors = validateBretagneLanguageReviewOutreach(
    register('OUTREACH_SENT'),
    evidence([
      receipt({
        packetRevision: 'older-language-review-packet',
      }),
    ]),
    NOW,
  );

  assert.ok(
    errors.some((error) =>
      error.includes('packetRevision must match currentPacketRevision'),
    ),
  );
});

test('packet-bound outreach evidence cannot silently add review items outside the candidate scope', () => {
  const errors = validateBretagneLanguageReviewOutreach(
    register('REVIEW_SCOPE_AGREED'),
    evidence([
      receipt({
        status: 'REVIEW_SCOPE_AGREED',
        evidenceType: 'REVIEW_SCOPE_AGREEMENT',
        reviewItemIds: [
          'bretagne_companion_identity',
          'bretagne_unrequested_term',
        ],
      }),
    ]),
    NOW,
  );

  assert.ok(
    errors.some((error) =>
      error.includes(
        'review item bretagne_unrequested_term is outside candidate proposedReviewItems',
      ),
    ),
  );
});

test('packet-bound evidence requires unique non-empty review item ids', () => {
  const errors = validateBretagneLanguageReviewOutreach(
    register('OUTREACH_SENT'),
    evidence([
      receipt({
        reviewItemIds: [
          'bretagne_companion_identity',
          'bretagne_companion_identity',
        ],
      }),
    ]),
    NOW,
  );

  assert.ok(
    errors.some((error) =>
      error.includes('reviewItemIds must be unique non-empty strings'),
    ),
  );
});


test('outreach packet revision stays aligned with runtime review packet authority', async () => {
  const [registerRaw, packetSource] = await Promise.all([
    readFile(
      'config/partnerships/bretagne-language-review-outreach-v1.json',
      'utf8',
    ),
    readFile(
      'apps/web/lib/regional/bretagne-language-review-packet.ts',
      'utf8',
    ),
  ]);

  const current = JSON.parse(registerRaw);
  assert.equal(typeof current.currentPacketRevision, 'string');
  assert.ok(current.currentPacketRevision.length > 0);
  assert.ok(
    packetSource.includes(
      `'${current.currentPacketRevision}' as const`,
    ),
    'outreach currentPacketRevision must match the runtime language-review packet revision',
  );
});
