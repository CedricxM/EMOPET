import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const proposal = JSON.parse(
  await readFile(
    new URL('../../config/world/world-progression-lifecycle-proposal-v1.json', import.meta.url),
    'utf8',
  ),
);
const persistenceGate = JSON.parse(
  await readFile(
    new URL('../../config/world/world-progression-persistence-gate-v1.json', import.meta.url),
    'utf8',
  ),
);
const privacyCandidate = JSON.parse(
  await readFile(
    new URL('../../config/world/world-progression-privacy-candidate-v1.json', import.meta.url),
    'utf8',
  ),
);

test('lifecycle proposal covers exactly the planned durable World tables', () => {
  const expected = Object.keys(persistenceGate.plannedTables).sort();
  const fromProposal = proposal.tables.map((row) => row.table).sort();
  const fromCandidate = privacyCandidate.relations.map((row) => row.table).sort();

  assert.deepEqual(fromProposal, expected);
  assert.deepEqual(fromProposal, fromCandidate);
});

test('proposal remains explicitly non-authoritative and does not unlock persistence', () => {
  assert.equal(
    proposal.status,
    'PRODUCT_TECHNICAL_PROPOSAL_NOT_PRIVACY_LEGAL_AUTHORITY',
  );
  assert.equal(proposal.productionAuthority, false);
  assert.equal(proposal.legalPrivacySignoff, false);
  assert.equal(proposal.migrationAuthorized, false);

  for (const value of Object.values(proposal.claims)) {
    assert.equal(value, false);
  }

  assert.equal(
    persistenceGate.status,
    'BLOCKED_PENDING_PRIVACY_TOPOLOGY_RECONCILIATION',
  );
  assert.equal(persistenceGate.productionAuthority, false);
});

test('technical candidate keeps first-slice World state account-bound and exportable', () => {
  assert.deepEqual(proposal.lifecycleProposal.activeRetention, {
    mode: 'WHILE_ACTIVE_ACCOUNT',
  });
  assert.deepEqual(proposal.lifecycleProposal.accountErasure, {
    proposedDisposition: 'DELETE',
    trigger: 'VALIDATED_ACCOUNT_ERASURE',
    archive: 'NONE_BY_DEFAULT',
    purgeEvidenceRequired: true,
  });
  assert.equal(proposal.lifecycleProposal.ownerExport.proposedDisposition, 'INCLUDE');
  assert.equal(proposal.lifecycleProposal.ownerExport.scope, 'OWNER_ACCOUNT_EXPORT');
  assert.equal(proposal.lifecycleProposal.ownerExport.includeProvenance, true);
  assert.equal(proposal.lifecycleProposal.ownerExport.includeInventory, true);
  assert.equal(proposal.lifecycleProposal.ownerExport.includeResourceSpends, true);

  for (const row of proposal.tables) {
    assert.equal(row.ownerColumn, 'owner_id');
    assert.equal(row.proposedErasure, 'DELETE');
    assert.equal(row.proposedExport, 'INCLUDE');
    assert.equal(row.proposedRetention, 'WHILE_ACTIVE_ACCOUNT');
  }
});

test('proposal invents no fixed post-account retention duration', () => {
  assert.equal(
    proposal.lifecycleProposal.retention.proposedDisposition,
    'NO_SEPARATE_POST_ACCOUNT_RETENTION_BY_DEFAULT',
  );
  assert.equal(proposal.lifecycleProposal.retention.fixedDurationDays, null);
  assert.equal(
    proposal.lifecycleProposal.retention.holdException,
    'ONLY_EXPLICIT_SEPARATE_LEGAL_SECURITY_RIGHTS_AUTHORITY',
  );
});

test('proposal assumes no non-SQL copy only as a hypothesis that still requires proof', () => {
  assert.equal(
    proposal.lifecycleProposal.nonSqlCopies.proposedDisposition,
    'NONE_EXPECTED_IN_G1B2',
  );
  assert.equal(proposal.lifecycleProposal.nonSqlCopies.verificationRequired, true);
});

test('proposal does not introduce dog/Care/ELI retention language into World progression', () => {
  const text = JSON.stringify(proposal).toLowerCase();
  for (const forbidden of [
    'dog telemetry',
    'care score',
    'eli score',
    'health score',
    'relationship score',
  ]) {
    assert.equal(text.includes(forbidden), false);
  }

  assert.match(text, /owner product state/);
});

test('promotion requirements preserve every active G1B.2 gate', () => {
  const requirements = proposal.promotionRequirements.join(' ').toLowerCase();

  for (const required of [
    'privacy',
    'lineage',
    'erasure topology',
    'erasure disposition',
    'retention schedule',
    'export policy',
    'subject discovery',
    'residue verification',
    'non-sql',
    'postgresql migration',
  ]) {
    assert.match(requirements, new RegExp(required));
  }
});
