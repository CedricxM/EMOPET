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

test('proposal treats no non-SQL G1B.2 copy as a hypothesis while acknowledging legacy browser gamification state', async () => {
  const nonSql = proposal.lifecycleProposal.nonSqlCopies;
  assert.equal(nonSql.proposedDisposition, 'NONE_EXPECTED_IN_G1B2');
  assert.equal(nonSql.verificationRequired, true);
  assert.equal(nonSql.legacyGamificationSurfaceObserved, true);
  assert.equal(nonSql.legacyPath, 'apps/web/lib/gamification.ts');
  assert.equal(nonSql.legacyMechanism, 'localStorage');
  assert.equal(
    nonSql.legacyTreatmentRequired,
    'RETIRE_MIGRATE_OR_EXPLICITLY_EXCLUDE_FROM_G1B2_AUTHORITY',
  );

  const source = await readFile(
    new URL('../../apps/web/lib/gamification.ts', import.meta.url),
    'utf8',
  );
  assert.match(source, /localStorage\.getItem/);
  assert.match(source, /localStorage\.setItem/);
});

test('operational lifecycle fields do not introduce dog/Care/ELI retention semantics', () => {
  const operational = JSON.stringify({
    lifecycleProposal: proposal.lifecycleProposal,
    tables: proposal.tables,
  }).toLowerCase();

  for (const forbidden of [
    'dog telemetry',
    'care score',
    'eli score',
    'health score',
    'relationship score',
  ]) {
    assert.equal(operational.includes(forbidden), false);
  }

  const rationale = proposal.rationale.join(' ').toLowerCase();
  assert.match(rationale, /owner product state/);
  assert.match(rationale, /not dog telemetry/);
});

test('proposal observes the durable foundation without promoting it', () => {
  assert.deepEqual(proposal.implementationObservation, {
    migration: 'backend/db/migrations/0046_world_gamification_persistence.sql',
    ledgerStore: 'backend/api/services/world-progression-postgres.ts',
    buildService: 'backend/api/services/world-build-postgres.ts',
    schemaAndStorePresent: true,
    activeHttpRoute: false,
    privacyLifecyclePromoted: false,
  });
  assert.equal(proposal.migrationAuthorized, false);
  assert.equal(proposal.productionAuthority, false);
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
    'durable postgresql',
    'production write activation',
  ]) {
    assert.match(requirements, new RegExp(required));
  }
});
