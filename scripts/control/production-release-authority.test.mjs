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
const runtimeConfig = readJson('config/release/production-runtime-config-authority-v1.json');
const environmentAuthority = readJson('config/release/production-environment-authority-v1.json');
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
    release.releaseReceiptTemplate.approval.independentRequired,
    true,
  );
  assert.equal(
    release.releaseReceiptTemplate.approval.approverRole,
    'independent_approver',
  );
  assert.equal(release.releaseReceiptTemplate.approval.approverRef, null);
  assert.equal(
    release.releaseReceiptTemplate.databaseMigration.disposition,
    'UNVERIFIED',
  );
  assert.equal(
    release.releaseReceiptTemplate.runtimeConfig.disposition,
    'UNVERIFIED',
  );
  assert.equal(release.releaseReceiptTemplate.runtimeConfig.evidenceRef, null);
  assert.equal(
    release.releaseReceiptTemplate.transportSecurity.disposition,
    'UNVERIFIED',
  );
  assert.equal(
    release.releaseReceiptTemplate.backupRestore.disposition,
    'UNVERIFIED',
  );
});

test('production environment and release-owner authority stays fail-closed', () => {
  assert.equal(
    environmentAuthority.schemaVersion,
    'emopet-production-environment-authority-v1',
  );
  assert.match(
    environmentAuthority.status,
    /NO_ENVIRONMENT_CONFIGURED.*RELEASE_ROLES_UNASSIGNED/,
  );
  assert.equal(environmentAuthority.issue, 831);
  assert.equal(environmentAuthority.claimsEnvironmentConfigured, false);
  assert.equal(environmentAuthority.claimsProductionPromotionAuthority, false);
  assert.equal(environmentAuthority.claimsNamedReleaseOwner, false);

  assert.deepEqual(
    environmentAuthority.canonicalEnvironments.map((entry) => entry.name),
    ['development', 'staging', 'production'],
  );
  assert.equal(
    environmentAuthority.releaseRoles.releaseOwner.symbolicRole,
    'release_owner',
  );
  assert.equal(environmentAuthority.releaseRoles.releaseOwner.assignment, null);
  assert.equal(
    environmentAuthority.releaseRoles.independentApprover.symbolicRole,
    'independent_approver',
  );
  assert.equal(
    environmentAuthority.releaseRoles.independentApprover.requiredForProduction,
    true,
  );
  assert.equal(
    environmentAuthority.releaseRoles.independentApprover.assignment,
    null,
  );
  assert.equal(
    environmentAuthority.productionPromotion.requiresIndependentApproval,
    true,
  );

  includesAll(
    environmentAuthority.requiredAuthorityReceiptFields,
    [
      'environment.name',
      'environment.authorityRef',
      'releaseOwner.role',
      'releaseOwner.reviewRef',
      'approval.independentRequired',
      'approval.approverRole',
      'approval.approverRef',
      'reviewedAt',
    ],
    'environmentAuthority.requiredAuthorityReceiptFields',
  );

  assert.equal(
    environmentAuthority.authorityReceiptTemplate.state,
    'DRAFT_UNVERIFIED',
  );
  assert.equal(
    environmentAuthority.authorityReceiptTemplate.environment.authorityRef,
    null,
  );
  assert.equal(
    environmentAuthority.authorityReceiptTemplate.releaseOwner.reviewRef,
    null,
  );
  assert.equal(
    environmentAuthority.authorityReceiptTemplate.approval.approverRef,
    null,
  );

  const production = environmentAuthority.canonicalEnvironments
    .find((entry) => entry.name === 'production');
  assert.match(
    production.githubActionsRequirement,
    /NAMED_PROTECTED_GITHUB_ENVIRONMENT_REQUIRED/,
  );

  const rules = environmentAuthority.failClosedRules.join('\n');
  assert.match(rules, /No environment is configured or production-authorized/i);
  assert.match(rules, /Independent approval is required/i);
  assert.match(rules, /Repository authorship.*does not assign/i);
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
      'approval.independentRequired',
      'approval.approverRole',
      'approval.approverRef',
      'databaseMigration.disposition',
      'databaseMigration.evidenceRef',
      'runtimeConfig.disposition',
      'runtimeConfig.evidenceRef',
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
  assert.match(rules, /(?:not|never).*production.*migration authority/i);
  assert.match(rules, /UNVERIFIED runtime configuration or secret-custody evidence/i);
  assert.match(rules, /UNVERIFIED transport-security or backup\/restore/i);
  assert.match(rules, /keeps production authority OPEN/i);
  assert.match(rules, /Missing artifact digest, commit SHA, SBOM/i);
});

test('production runtime configuration contract remains fail-closed and release-linked', () => {
  assert.equal(
    runtimeConfig.schemaVersion,
    'emopet-production-runtime-config-authority-v1',
  );
  assert.match(runtimeConfig.status, /PRODUCTION_SECRET_CUSTODY_UNVERIFIED/);
  assert.equal(runtimeConfig.issue, 831);
  assert.equal(runtimeConfig.claimsProductionRuntimeConfigured, false);
  assert.equal(runtimeConfig.claimsSecretManagerConfigured, false);
  assert.equal(runtimeConfig.claimsSecretRotationComplete, false);

  assert.equal(runtimeConfig.classificationRules.clientExposedPrefix, 'NEXT_PUBLIC_');
  assert.match(
    runtimeConfig.classificationRules.clientExposedMeaning,
    /NEVER_SECRET/,
  );
  assert.equal(
    runtimeConfig.classificationRules.serverDefaultMeaning,
    'SERVER_PRIVATE_UNLESS_EXPLICITLY_REVIEWED',
  );

  includesAll(
    runtimeConfig.requiredEnvironmentReceiptFields,
    [
      'environment.name',
      'environment.authorityRef',
      'runtimeConfigReceiptId',
      'releaseReceiptRef',
      'configManifestDigest',
      'injection.authorityRef',
      'secretCustody.authorityRef',
      'secretCustody.rotationOwnerRole',
      'secretCustody.rotationEvidenceRef',
      'database.runtimeRoleEvidenceRef',
      'database.migrationRoleEvidenceRef',
      'database.roleSeparationEvidenceRef',
      'publicConfig.reviewRef',
      'transport.backendHttpsEvidenceRef',
      'review.approverRef',
      'review.reviewedAt',
    ],
    'runtimeConfig.requiredEnvironmentReceiptFields',
  );

  assert.equal(runtimeConfig.environmentReceiptTemplate.state, 'DRAFT_UNVERIFIED');
  assert.equal(runtimeConfig.environmentReceiptTemplate.releaseReceiptRef, null);
  assert.equal(runtimeConfig.environmentReceiptTemplate.environment.name, null);
  assert.equal(runtimeConfig.environmentReceiptTemplate.secretCustody.authorityRef, null);
  assert.equal(runtimeConfig.environmentReceiptTemplate.review.approverRef, null);

  const variables = Object.values(runtimeConfig.knownAuthorityExamples)
    .map((entry) => entry.variable);
  assert.equal(new Set(variables).size, variables.length);
  includesAll(
    variables,
    [
      'DATABASE_URL',
      'MIGRATION_DATABASE_URL',
      'JWT_SECRET',
      'PRIVILEGED_JWT_SECRET',
      'AUTH_RATE_LIMIT_HMAC_SECRET',
      'EMOPET_INTERNAL_AUDIT_SERVICE_SECRET',
      'NEXT_PUBLIC_MAPBOX_TOKEN',
    ],
    'runtimeConfig known authority variables',
  );

  const rules = runtimeConfig.failClosedRules.join('\n');
  assert.match(rules, /NEXT_PUBLIC_\*.*never carry a secret/i);
  assert.match(rules, /Secret values must never be committed/i);
  assert.match(rules, /Production secret custody remains OPEN/i);
  assert.match(rules, /DATABASE_URL and MIGRATION_DATABASE_URL are separate authorities/i);
  assert.match(rules, /Production backend URLs.*require HTTPS evidence/i);
  assert.match(rules, /keeps the environment receipt DRAFT_UNVERIFIED or HOLD/i);
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
