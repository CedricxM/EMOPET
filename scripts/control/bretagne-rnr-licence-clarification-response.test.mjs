import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BRETAGNE_RNR_LICENCE_DECISION_REVISION,
  BRETAGNE_RNR_LICENCE_RESPONSE_REVISION,
  evaluateBretagneRnrLicenceClarificationResponse,
  evaluateBretagneRnrLicenceDecision,
  fingerprintBretagneRnrLicenceProposal,
} from './bretagne-rnr-licence-clarification-response.mjs';
import {
  validateBretagneRnrLicenceClarification,
} from './bretagne-rnr-licence-clarification.mjs';

const NOW = Date.parse('2026-10-02T09:30:00Z');
const SOURCE_VERSION =
  'sha256:65ff0d253fd1a1bddd6ce05389fe4b35c8946cfbcd8787c9d5afaee092506cd0';

function register() {
  return {
    schemaVersion: 'emopet-bretagne-rnr-licence-clarification-v1',
    datasetId: 'reserves-naturelles-regionales-de-bretagne',
    sourceVersion: SOURCE_VERSION,
    schemaEvidencePath:
      'data/registry/schema-evidence/reserves-naturelles-regionales-de-bretagne-65ff0d253fd1.json',
    reconciliationState: 'HOLD_AUTHORITATIVE_CLARIFICATION_REQUIRED',
    runtimeRightsDisposition: 'HOLD',
    releaseAllowed: false,
    observations: [
      {
        observationId: 'PRIMARY_API_METADATA',
        source:
          'https://data.bretagne.bzh/api/explore/v2.1/catalog/datasets/reserves-naturelles-regionales-de-bretagne',
        observedValue: 'Licence ouverte',
        versionConclusion: 'UNRESOLVED',
      },
      {
        observationId: 'CANONICAL_ETALAB_PAGE',
        source: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence',
        observedValue: 'Licence Ouverte 2.0',
        versionConclusion: '2.0',
      },
      {
        observationId: 'DATAGOUV_MIRROR',
        source:
          'https://www.data.gouv.fr/datasets/reserves-naturelles-regionales-de-bretagne-2',
        observedValue: 'Licence Ouverte / Open Licence version 2.0',
        versionConclusion: '2.0',
      },
      {
        observationId: 'LEGACY_PDF_IDENTIFICATION',
        source:
          'https://commons.wikimedia.org/wiki/File:Licence_Ouverte_1.0_(Fran%C3%A7ais).pdf',
        observedValue: 'Legacy Etalab PDF identified as Licence Ouverte 1.0',
        versionConclusion: '1.0',
      },
    ],
    clarificationRequest: {
      targetAuthority: 'Région Bretagne / publisher of the exact dataset',
      messageSent: false,
      requiredAnswers: ['a', 'b', 'c', 'd'],
    },
    authoritativeConfirmation: null,
  };
}

function response(overrides = {}) {
  return {
    responseRevision: BRETAGNE_RNR_LICENCE_RESPONSE_REVISION,
    datasetId: 'reserves-naturelles-regionales-de-bretagne',
    sourceVersion: SOURCE_VERSION,
    evidenceKind: 'PRIMARY_PUBLISHER_REPLY',
    authorityType: 'PRIMARY_PUBLISHER_CONFIRMATION',
    authorityEvidenceRef: 'CONTROLLED_PRIMARY_PUBLISHER_REPLY',
    authorityRole: 'dataset publisher / open-data authority',
    authorityRef: 'CONTROLLED_AUTHORITY_REF',
    confirmedAt: '2026-10-02T08:30:00Z',
    applicableLicenceVersion: '2.0',
    legacyPdfStatus: 'STALE_METADATA',
    attributionRequirement:
      'Mention Région Bretagne and the source dataset.',
    lastUpdateDisplayRequirement:
      'Display the reused-information last-update date.',
    additionalPortalOrServiceConditions: 'NONE_CONFIRMED',
    automaticApplyAllowed: false,
    ...overrides,
  };
}

function decision(proposal, overrides = {}) {
  return {
    decisionRevision: BRETAGNE_RNR_LICENCE_DECISION_REVISION,
    proposalRevision: proposal.proposalRevision,
    proposalFingerprint: fingerprintBretagneRnrLicenceProposal(proposal),
    datasetId: proposal.datasetId,
    sourceVersion: proposal.sourceVersion,
    decision: 'ACCEPT',
    codeReviewerRole: 'maintainer / data-rights reviewer',
    codeReviewerRef: 'CONTROLLED_CODE_REVIEWER_REF',
    decidedAt: '2026-10-02T09:00:00Z',
    decisionEvidenceReference: 'CONTROLLED_CODE_REVIEW_RECEIPT',
    fieldApprovalUnchangedConfirmed: true,
    schemaEvidenceUnchangedConfirmed: true,
    runtimeIngestionStillBlockedConfirmed: true,
    partnershipStatusUnchangedConfirmed: true,
    automaticApplyAllowed: false,
    notes: 'Reviewed only as licence-clarification evidence.',
    ...overrides,
  };
}

test('exact primary-publisher response yields only a human-code-review proposal', () => {
  const current = register();
  const result = evaluateBretagneRnrLicenceClarificationResponse(
    response(),
    current,
    NOW,
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.ok(result.proposal);
  assert.equal(result.proposal.proposalStatus, 'HUMAN_CODE_REVIEW_REQUIRED');
  assert.equal(result.proposal.canApplyAutomatically, false);
  assert.equal(result.proposal.sourceRightsOnly, true);
  assert.equal(result.proposal.fieldApprovalUnchanged, true);
  assert.equal(result.proposal.runtimeIngestionUnchanged, true);
});

test('response fails closed on dataset/source/authority/date drift', () => {
  const result = evaluateBretagneRnrLicenceClarificationResponse(
    response({
      datasetId: 'different-dataset',
      sourceVersion: 'sha256:different',
      authorityType: 'SECONDARY_PUBLIC_CATALOGUE',
      confirmedAt: '2027-01-01T00:00:00Z',
    }),
    register(),
    NOW,
  );

  assert.equal(result.valid, false);
  assert.equal(result.proposal, null);
  assert.ok(result.errors.includes('datasetId mismatch'));
  assert.ok(result.errors.includes('sourceVersion mismatch'));
  assert.ok(
    result.errors.includes(
      'authorityType must be PRIMARY_PUBLISHER_CONFIRMATION',
    ),
  );
  assert.ok(result.errors.includes('confirmedAt must be valid and non-future'));
});

test('response must resolve licence version, legacy pointer and bounded reuse conditions', () => {
  const result = evaluateBretagneRnrLicenceClarificationResponse(
    response({
      applicableLicenceVersion: '3.0',
      legacyPdfStatus: 'UNRESOLVED',
      attributionRequirement: '',
      lastUpdateDisplayRequirement: '',
      additionalPortalOrServiceConditions: '',
    }),
    register(),
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes(
      'applicableLicenceVersion must be 1.0 or 2.0',
    ),
  );
  assert.ok(
    result.errors.includes(
      'legacyPdfStatus must resolve the legacy pointer',
    ),
  );
  assert.ok(result.errors.includes('attributionRequirement required'));
  assert.ok(result.errors.includes('lastUpdateDisplayRequirement required'));
  assert.ok(
    result.errors.includes(
      'additionalPortalOrServiceConditions required',
    ),
  );
});

test('human ACCEPT yields only a manual clarification-register patch candidate', () => {
  const current = register();
  const reviewed = evaluateBretagneRnrLicenceClarificationResponse(
    response(),
    current,
    NOW,
  );
  assert.ok(reviewed.proposal);

  const result = evaluateBretagneRnrLicenceDecision(
    decision(reviewed.proposal),
    reviewed.proposal,
    current,
    NOW,
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.ok(result.registerPatchCandidate);
  assert.equal(
    result.registerPatchCandidate.candidateStatus,
    'MANUAL_RUNTIME_PATCH_REQUIRED',
  );
  assert.equal(result.registerPatchCandidate.canApplyAutomatically, false);
  assert.equal(result.registerPatchCandidate.runtimeIngestionAllowed, false);
  assert.equal(result.registerPatchCandidate.fieldApprovalChangeAllowed, false);
  assert.equal(result.registerPatchCandidate.partnershipClaimAllowed, false);
  assert.equal(
    result.registerPatchCandidate.registerPatch.runtimeRightsDisposition,
    'GO',
  );
  assert.equal(
    result.registerPatchCandidate.registerPatch.authoritativeConfirmation
      .appliesToSourceVersion,
    SOURCE_VERSION,
  );
});

test('proposal drift invalidates code-review decision fingerprint', () => {
  const current = register();
  const reviewed = evaluateBretagneRnrLicenceClarificationResponse(
    response(),
    current,
    NOW,
  );
  assert.ok(reviewed.proposal);

  const d = decision(reviewed.proposal);
  const changed = {
    ...reviewed.proposal,
    attributionRequirement: 'Different attribution after review.',
  };

  const result = evaluateBretagneRnrLicenceDecision(
    d,
    changed,
    current,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.equal(result.registerPatchCandidate, null);
  assert.ok(result.errors.includes('proposalFingerprint mismatch'));
});

test('ACCEPT must preserve field/schema/runtime/partnership boundaries', () => {
  const current = register();
  const reviewed = evaluateBretagneRnrLicenceClarificationResponse(
    response(),
    current,
    NOW,
  );
  assert.ok(reviewed.proposal);

  const result = evaluateBretagneRnrLicenceDecision(
    decision(reviewed.proposal, {
      fieldApprovalUnchangedConfirmed: false,
      schemaEvidenceUnchangedConfirmed: false,
      runtimeIngestionStillBlockedConfirmed: false,
      partnershipStatusUnchangedConfirmed: false,
    }),
    reviewed.proposal,
    current,
    NOW,
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes(
      'fieldApprovalUnchangedConfirmed must be true for ACCEPT',
    ),
  );
  assert.ok(
    result.errors.includes(
      'schemaEvidenceUnchangedConfirmed must be true for ACCEPT',
    ),
  );
  assert.ok(
    result.errors.includes(
      'runtimeIngestionStillBlockedConfirmed must be true for ACCEPT',
    ),
  );
  assert.ok(
    result.errors.includes(
      'partnershipStatusUnchangedConfirmed must be true for ACCEPT',
    ),
  );
});

test('REJECT and REQUEST_CHANGES never create register patch candidates', () => {
  const current = register();
  const reviewed = evaluateBretagneRnrLicenceClarificationResponse(
    response(),
    current,
    NOW,
  );
  assert.ok(reviewed.proposal);

  const rejected = evaluateBretagneRnrLicenceDecision(
    decision(reviewed.proposal, { decision: 'REJECT' }),
    reviewed.proposal,
    current,
    NOW,
  );
  assert.equal(rejected.valid, true);
  assert.equal(rejected.registerPatchCandidate, null);

  const changes = evaluateBretagneRnrLicenceDecision(
    decision(reviewed.proposal, {
      decision: 'REQUEST_CHANGES',
      notes: 'Clarify whether additional API service conditions exist.',
      fieldApprovalUnchangedConfirmed: false,
      schemaEvidenceUnchangedConfirmed: false,
      runtimeIngestionStillBlockedConfirmed: false,
      partnershipStatusUnchangedConfirmed: false,
    }),
    reviewed.proposal,
    current,
    NOW,
  );
  assert.equal(changes.valid, true);
  assert.equal(changes.registerPatchCandidate, null);
});

test('synthetic accepted patch can satisfy clarification gate without enabling runtime ingestion', () => {
  const current = register();
  const reviewed = evaluateBretagneRnrLicenceClarificationResponse(
    response(),
    current,
    NOW,
  );
  assert.ok(reviewed.proposal);
  const decided = evaluateBretagneRnrLicenceDecision(
    decision(reviewed.proposal),
    reviewed.proposal,
    current,
    NOW,
  );
  assert.ok(decided.registerPatchCandidate);

  const patched = {
    ...current,
    ...decided.registerPatchCandidate.registerPatch,
    clarificationRequest: {
      ...current.clarificationRequest,
      messageSent: true,
      messageEvidenceRef:
        reviewed.proposal.authorityEvidenceRef,
    },
  };

  assert.deepEqual(
    validateBretagneRnrLicenceClarification(
      patched,
      { sourceVersion: SOURCE_VERSION },
    ),
    [],
  );

  assert.equal(decided.registerPatchCandidate.runtimeIngestionAllowed, false);
});

test('clarification gate accepts evidence-backed sent outreach but rejects unproven sent state', () => {
  const proven = register();
  proven.clarificationRequest.messageSent = true;
  proven.clarificationRequest.messageEvidenceRef =
    'CONTROLLED_OUTREACH_EVIDENCE';

  assert.deepEqual(
    validateBretagneRnrLicenceClarification(
      proven,
      { sourceVersion: SOURCE_VERSION },
    ),
    [],
  );

  const unproven = register();
  unproven.clarificationRequest.messageSent = true;

  const errors = validateBretagneRnrLicenceClarification(
    unproven,
    { sourceVersion: SOURCE_VERSION },
  );
  assert.ok(
    errors.includes('messageSent true requires messageEvidenceRef'),
  );
});
