import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateBretagneCaninePilotEvidence,
  validateBretagneCaninePilotEvidenceFiles,
} from './bretagne-canine-pilot-evidence.mjs';

const NOW = Date.parse('2026-10-01T15:00:00Z');

function candidateRegister(status = 'CANDIDATE_NOT_CONTACTED') {
  return {
    schemaVersion: 'emopet-bretagne-canine-pilot-candidates-v1',
    allowedStatuses: [
      'CANDIDATE_NOT_CONTACTED',
      'OUTREACH_SENT',
      'RESPONSE_RECEIVED',
      'PILOT_SCOPE_DISCUSSION',
      'LETTER_OF_INTEREST_RECEIVED',
      'DECLINED',
      'DEFERRED',
    ],
    candidates: [
      {
        candidateId: 'club-test',
        organisationName: 'Club test',
        relationshipStatus: status,
        publicSources: ['https://example.org/club-test'],
        partnershipClaimAllowed: false,
        contactDataStored: false,
      },
    ],
  };
}

function evidenceRegister(receipts = []) {
  return {
    schemaVersion: 'emopet-bretagne-canine-pilot-evidence-v1',
    receipts,
  };
}

function receipt(overrides = {}) {
  return {
    receiptId: 'receipt-001',
    candidateId: 'club-test',
    status: 'OUTREACH_SENT',
    evidenceType: 'OUTBOUND_MESSAGE',
    occurredAt: '2026-10-01T10:00:00Z',
    evidenceRef: 'CONTROLLED_COMM_REF_001',
    summary: 'Bounded outreach sent to the exact organisation.',
    containsPersonalData: false,
    partnershipClaimAllowed: false,
    ...overrides,
  };
}

test('current repository canine candidate register passes with empty evidence receipts', async () => {
  assert.deepEqual(
    await validateBretagneCaninePilotEvidenceFiles(undefined, undefined, NOW),
    [],
  );
});

test('candidate status cannot advance to OUTREACH_SENT without matching evidence', () => {
  const errors = validateBretagneCaninePilotEvidence(
    candidateRegister('OUTREACH_SENT'),
    evidenceRegister(),
    NOW,
  );

  assert.ok(
    errors.some((error) =>
      error.includes('OUTREACH_SENT requires a matching OUTBOUND_MESSAGE receipt'),
    ),
  );
});

test('matching bounded outreach receipt permits OUTREACH_SENT status', () => {
  assert.deepEqual(
    validateBretagneCaninePilotEvidence(
      candidateRegister('OUTREACH_SENT'),
      evidenceRegister([receipt()]),
      NOW,
    ),
    [],
  );
});

test('response, pilot discussion, LOI, decline and defer states require distinct evidence types', () => {
  const cases = [
    ['RESPONSE_RECEIVED', 'INBOUND_MESSAGE'],
    ['PILOT_SCOPE_DISCUSSION', 'PILOT_DISCUSSION_NOTE'],
    ['LETTER_OF_INTEREST_RECEIVED', 'LETTER_OF_INTEREST'],
    ['DECLINED', 'DECLINE'],
    ['DEFERRED', 'INTERNAL_DEFER_DECISION'],
  ];

  for (const [status, evidenceType] of cases) {
    const errors = validateBretagneCaninePilotEvidence(
      candidateRegister(status),
      evidenceRegister([
        receipt({
          status,
          evidenceType,
          receiptId: 'receipt-' + status.toLowerCase(),
        }),
      ]),
      NOW,
    );
    assert.deepEqual(errors, [], status);
  }
});

test('not-contacted status cannot coexist with communication evidence', () => {
  const errors = validateBretagneCaninePilotEvidence(
    candidateRegister('CANDIDATE_NOT_CONTACTED'),
    evidenceRegister([receipt()]),
    NOW,
  );

  assert.ok(
    errors.some((error) =>
      error.includes('CANDIDATE_NOT_CONTACTED but evidence receipts already exist'),
    ),
  );
});

test('evidence receipts fail closed on private/contact inflation and future timestamps', () => {
  const errors = validateBretagneCaninePilotEvidence(
    candidateRegister('OUTREACH_SENT'),
    evidenceRegister([
      receipt({
        occurredAt: '2027-01-01T00:00:00Z',
        containsPersonalData: true,
        partnershipClaimAllowed: true,
      }),
    ]),
    NOW,
  );

  assert.ok(errors.some((error) => error.includes('occurredAt')));
  assert.ok(errors.some((error) => error.includes('containsPersonalData')));
  assert.ok(errors.some((error) => error.includes('partnershipClaimAllowed')));
});

test('candidate registry stays HTTPS-only and partnership-safe', () => {
  const register = candidateRegister();
  register.candidates[0].publicSources = ['http://example.org/insecure'];
  register.candidates[0].partnershipClaimAllowed = true;

  const errors = validateBretagneCaninePilotEvidence(
    register,
    evidenceRegister(),
    NOW,
  );

  assert.ok(errors.some((error) => error.includes('HTTPS-only')));
  assert.ok(errors.some((error) => error.includes('partnershipClaimAllowed')));
});
