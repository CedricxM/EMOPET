import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

const release = readJson('config/release/production-release-evidence-contract-v1.json');
const migration = readJson('config/release/production-db-migration-authority-v1.json');
const p0Workflow = readFileSync(
  resolve(root, '.github', 'workflows', 'p0-db-baseline.yml'),
  'utf8',
);
const securityWorkflow = readFileSync(
  resolve(root, '.github', 'workflows', 'security-supply-chain.yml'),
  'utf8',
);

function includesAll(values, expected, label) {
  assert.ok(Array.isArray(values), `${label} must be an array`);
  for (const value of expected) {
    assert.ok(values.includes(value), `${label} is missing ${value}`);
  }
}

test('production release contract remains non-authorizing by default', () => {
  assert.equal(
    release.schemaVersion,
    'emopet-production-release-evidence-contract-v1',
  );
  assert.match(release.status, /NO_PRODUCTION_RELEASE_AUTHORITY/);
  assert.equal(release.issue, 831);
  assert.equal(release.claimsProductionReleaseAuthority, false);
  assert.equal(release.claimsDeploymentExecuted, false);
  assert.equal(release.claimsEnvironmentConfigured, false);

  assert.deepEqual(release.receiptState.allowed, [
    'DRAFT_UNVERIFIED',
    'REVIEWED_HOLD',
    'REVIEWED_GO',
    'SUPERSEDED',
  ]);
  assert.equal(release.receiptState.templateDefault, 'DRAFT_UNVERIFIED');
  assert.equal(
    release.receiptState.productionPromotionAllowedOnlyWhen,
    'REVIEWED_GO',
  );

  assert.equal(
    release.releaseReceiptTemplate.releaseState,
    'DRAFT_UNVERIFIED',
  );
  assert.equal(release.releaseReceiptTemplate.commitSha, null);
  assert.equal(release.releaseReceiptTemplate.releasedAt, null);
  assert.equal(release.releaseReceiptTemplate.environment.name, null);
  assert.equal(release.releaseReceiptTemplate.releaseOwner.role, null);
  assert.equal(
    release.releaseReceiptTemplate.databaseMigration.disposition,
    'UNVERIFIED',
  );
  assert.equal(
    release.releaseReceiptTemplate.transportSecurity.disposition,
    'UNVERIFIED',
  );
  assert.equal(
    release.releaseReceiptTemplate.backupRestore.disposition,
    'UNVERIFIED',
  );
});

test('production release receipt cannot drop immutable identity or readiness evidence', () => {
  includesAll(
    release.requiredReceiptFields,
    [
      'releaseId',
      'releaseState',
      'commitSha',
      'artifact.identity',
      'artifact.sha256',
      'sbom.cycloneDxRef',
      'sbom.spdxRef',
      'dependencyDisposition.status',
      'dependencyDisposition.evidenceRef',
      'attestation.status',
      'attestation.evidenceRef',
      'environment.name',
      'environment.authorityRef',
      'releaseOwner.role',
      'releaseOwner.reviewRef',
      'databaseMigration.disposition',
      'databaseMigration.evidenceRef',
      'transportSecurity.disposition',
      'transportSecurity.evidenceRef',
      'backupRestore.disposition',
      'backupRestore.evidenceRef',
      'releasedAt',
    ],
    'release.requiredReceiptFields',
  );

  const rules = release.failClosedRules.join('\n');
  assert.match(rules, /green P0 DB baseline validation run/i);
  assert.match(rules, /not.*production.*migration authority/i);
  assert.match(rules, /UNVERIFIED transport-security or backup\/restore/i);
  assert.match(rules, /keeps production authority OPEN/i);
  assert.match(rules, /Missing artifact digest, commit SHA, SBOM/i);
});

test('production database migration contract remains non-authorizing by default', () => {
  assert.equal(
    migration.schemaVersion,
    'emopet-production-db-migration-authority-v1',
  );
  assert.match(migration.status, /NO_PRODUCTION_MIGRATION_AUTHORITY/);
  assert.equal(migration.issue, 831);
  assert.equal(migration.claimsProductionMigrationAuthority, false);
  assert.equal(migration.claimsExistingDatabaseUpgradeReadiness, false);

  assert.equal(migration.promotionStates.templateDefault, 'DRAFT_HOLD');
  assert.equal(
    migration.promotionStates.executionAllowedOnlyWhen,
    'AUTHORIZED_WINDOW_PENDING',
  );
  assert.equal(
    migration.promotionReceiptTemplate.state,
    'DRAFT_HOLD',
  );
  assert.equal(migration.promotionReceiptTemplate.releaseReceiptRef, null);
  assert.equal(migration.promotionReceiptTemplate.commitSha, null);
  assert.deepEqual(migration.promotionReceiptTemplate.orderedMigrationSet, []);
  assert.equal(migration.promotionReceiptTemplate.migrationSetDigest, null);
  assert.equal(
    migration.promotionReceiptTemplate.recovery.disposition,
    'UNVERIFIED',
  );
  assert.equal(
    migration.promotionReceiptTemplate.postApply.verificationRef,
    null,
  );
  assert.equal(migration.promotionReceiptTemplate.completedAt, null);
});

test('production migration receipt keeps rehearsal, backup, review and recovery evidence mandatory', () => {
  includesAll(
    migration.requiredPromotionReceiptFields,
    [
      'releaseReceiptRef',
      'commitSha',
      'targetEnvironment.name',
      'targetEnvironment.authorityRef',
      'databaseAuthority.principalRole',
      'databaseAuthority.authorityRef',
      'orderedMigrationSet',
      'migrationSetDigest',
      'preflight.disposableQaRef',
      'preflight.existingDatabaseRehearsalRef',
      'preflight.backupRestoreEvidenceRef',
      'review.operatorRole',
      'review.approverRef',
      'execution.windowRef',
      'execution.strategy',
      'recovery.disposition',
      'recovery.evidenceRef',
      'postApply.verificationRef',
      'completedAt',
    ],
    'migration.requiredPromotionReceiptFields',
  );

  assert.equal(
    migration.currentRepositoryBoundary.authorityDecision,
    'NO_EXISTING_DB_TO_PRESERVE',
  );
  assert.equal(
    migration.currentRepositoryBoundary.productionMeaning,
    'NONE',
  );

  const rules = migration.failClosedRules.join('\n');
  assert.match(rules, /green P0 DB baseline validation run/i);
  assert.match(rules, /does not authorize production migration/i);
  assert.match(rules, /NO_EXISTING_DB_TO_PRESERVE.*does not assert/i);
  assert.match(rules, /Missing existing-database rehearsal evidence keeps the promotion HOLD/i);
  assert.match(rules, /Missing backup\/restore evidence keeps the promotion HOLD/i);
  assert.match(rules, /Post-apply verification is required/i);
});

test('P0 DB workflow remains explicitly non-authorizing for production', () => {
  assert.match(
    p0Workflow,
    /It does not authorize production migration, deployment, or release\./,
  );
});

test('release authority guard is enforced by the required security regression job', () => {
  assert.match(
    securityWorkflow,
    /node --test scripts\/control\/production-release-authority\.test\.mjs/,
  );
});
