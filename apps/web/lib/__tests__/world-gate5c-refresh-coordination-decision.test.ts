import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const decision = JSON.parse(
  readFileSync(
    new URL('../../../../config/world/world-gate5c-refresh-coordination-decision-v1.json', import.meta.url),
    'utf8',
  ),
);
const readiness = JSON.parse(
  readFileSync(
    new URL('../../../../config/world/world-gate5c-web-activation-readiness-v1.json', import.meta.url),
    'utf8',
  ),
);
const runtimeConfig = JSON.parse(
  readFileSync(
    new URL('../../../../config/release/production-runtime-config-authority-v1.json', import.meta.url),
    'utf8',
  ),
);
const auditService = readFileSync(
  new URL('../../../../packages/privileged-auth/src/internal-audit-service.ts', import.meta.url),
  'utf8',
);
const alertAckService = readFileSync(
  new URL('../../../../packages/privileged-auth/src/internal-alert-ack-service.ts', import.meta.url),
  'utf8',
);
const ownerSessionService = readFileSync(
  new URL('../../../../packages/privileged-auth/src/internal-owner-session-service.ts', import.meta.url),
  'utf8',
);
const privilegedAuthIndex = readFileSync(
  new URL('../../../../packages/privileged-auth/src/index.ts', import.meta.url),
  'utf8',
);
const rootEnvTemplate = readFileSync(
  new URL('../../../../.env.example', import.meta.url),
  'utf8',
);
const webEnvTemplate = readFileSync(
  new URL('../../../../apps/web/.env.example', import.meta.url),
  'utf8',
);

test('Gate 5C Slice A implements only the dedicated service-token primitive without activation', () => {
  assert.equal(decision.status, 'SLICE_A_IMPLEMENTED_ROUTE_NOT_WIRED');
  assert.equal(decision.selectedPattern, 'DEDICATED_INTERNAL_OWNER_REFRESH_SERVICE_CHANNEL');
  assert.equal(decision.preservePublicRefreshStrictReuseDetection, true);
  assert.equal(decision.publicRefresh.policy, 'STRICT_REUSE_DETECTION_UNCHANGED');
  assert.equal(decision.publicRefresh.trustedConcurrentDuplicateRelaxationAllowed, false);

  assert.equal(decision.internalRefresh.route, 'POST /internal/owner-session/refresh');
  assert.equal(decision.internalRefresh.serviceAuthPackage, '@emopet/privileged-auth');
  assert.equal(decision.internalRefresh.issuer, 'emopet-web');
  assert.equal(decision.internalRefresh.audience, 'emopet-internal-owner-session-refresh');
  assert.equal(decision.internalRefresh.subject, 'service:web');
  assert.equal(decision.internalRefresh.algorithm, 'HS256');
  assert.equal(decision.internalRefresh.ttlSeconds, 30);
  assert.equal(decision.internalRefresh.bodySha256Bound, true);

  assert.deepEqual(decision.implementationState, {
    sliceAServiceTokenPrimitive: true,
    sliceASecretAuthorityRegistered: true,
    sliceBInternalBackendRoute: false,
    sliceCWebBffInternalClient: false,
    sliceDMultiInstanceProof: false,
    sliceEGate5CReadinessReview: false,
  });

  assert.equal(decision.activation.implementationReady, false);
  assert.equal(decision.activation.multiInstanceProofReady, false);
  assert.equal(decision.activation.uiCutoverAllowed, false);
  assert.equal(decision.activation.productionSecretCustodyVerified, false);
  assert.equal(decision.activation.productionBackendHttpsVerified, false);
  assert.equal(readiness.activated, false);
  assert.equal(readiness.prerequisites.uiCutoverDecisionRecorded, false);
});

test('dedicated Owner refresh service secret is registered but remains production-unverified', () => {
  const secretEnv = decision.internalRefresh.serviceSecretEnv;
  assert.equal(secretEnv, 'EMOPET_INTERNAL_OWNER_SESSION_SERVICE_SECRET');
  assert.equal(secretEnv.startsWith('NEXT_PUBLIC_'), false);
  assert.deepEqual(decision.internalRefresh.secretMustDifferFrom, [
    'JWT_SECRET',
    'PRIVILEGED_JWT_SECRET',
    'EMOPET_INTERNAL_AUDIT_SERVICE_SECRET',
    'EMOPET_INTERNAL_ALERT_ACK_SERVICE_SECRET',
  ]);

  const entries = Object.values(runtimeConfig.knownAuthorityExamples)
    .filter((entry: unknown): entry is { variable: string; classification?: string } =>
      typeof entry === 'object'
      && entry !== null
      && 'variable' in entry
      && typeof (entry as { variable?: unknown }).variable === 'string'
    );
  const registered = entries.find((entry) => entry.variable === secretEnv);
  assert.ok(registered, 'Owner session service secret must be registered in runtime authority');
  assert.match(registered.classification ?? '', /SERVER_SECRET/);
  assert.match(registered.classification ?? '', /DISTINCT/);

  assert.equal(runtimeConfig.claimsProductionRuntimeConfigured, false);
  assert.equal(runtimeConfig.claimsSecretManagerConfigured, false);
  assert.equal(runtimeConfig.claimsSecretRotationComplete, false);
  assert.match(runtimeConfig.status, /PRODUCTION_SECRET_CUSTODY_UNVERIFIED/);

  assert.match(rootEnvTemplate, /EMOPET_INTERNAL_OWNER_SESSION_SERVICE_SECRET=/);
  assert.match(webEnvTemplate, /EMOPET_INTERNAL_OWNER_SESSION_SERVICE_SECRET=/);
  assert.doesNotMatch(rootEnvTemplate, /NEXT_PUBLIC_EMOPET_INTERNAL_OWNER_SESSION/);
  assert.doesNotMatch(webEnvTemplate, /NEXT_PUBLIC_EMOPET_INTERNAL_OWNER_SESSION/);
});

test('Slice A primitive matches the selected body-bound service JWT authority', () => {
  assert.match(ownerSessionService, /INTERNAL_OWNER_SESSION_TOKEN_ISSUER = 'emopet-web'/);
  assert.match(ownerSessionService, /emopet-internal-owner-session-refresh/);
  assert.match(ownerSessionService, /INTERNAL_OWNER_SESSION_TOKEN_SUBJECT = 'service:web'/);
  assert.match(ownerSessionService, /token_use: 'internal_owner_session_refresh'/);
  assert.match(ownerSessionService, /body_sha256/);
  assert.match(ownerSessionService, /setIssuer\(/);
  assert.match(ownerSessionService, /setAudience\(/);
  assert.match(ownerSessionService, /setSubject\(/);
  assert.match(ownerSessionService, /HS256/);
  assert.match(ownerSessionService, /TTL_SECONDS = 30/);
  assert.match(privilegedAuthIndex, /internal-owner-session-service\.js/);

  for (const source of [auditService, alertAckService]) {
    assert.match(source, /body_sha256/);
    assert.match(source, /setIssuer\(/);
    assert.match(source, /setAudience\(/);
    assert.match(source, /setSubject\(/);
    assert.match(source, /HS256/);
    assert.match(source, /TTL_SECONDS = 30/);
  }

  assert.equal(decision.infrastructureDecision.redisProviderSelected, false);
  assert.equal(decision.infrastructureDecision.newDistributedCacheRequired, false);
  assert.equal(decision.infrastructureDecision.directWebPostgresAuthority, false);
  assert.equal(decision.infrastructureDecision.reuseExistingInternalServiceAuthPattern, true);
});

test('trusted concurrent handling remains future-route-only after Slice A', () => {
  assert.deepEqual(decision.trustedConcurrentRotationRule, {
    allowedOnlyOnInternalServiceRoute: true,
    preLockObservedCredentialMustBeActive: true,
    postLockCredentialMustBeRevokedAs: 'rotated',
    result: 'CONCURRENT_ROTATION_SUPERSEDED',
    revokeActiveFamily: false,
    returnSuccessorRefreshToken: false,
    publicReplayBehaviorUnchanged: true,
  });

  assert.equal(
    decision.rejectedShortcuts.includes('PUBLIC_REFRESH_GRACE_WINDOW_WITHOUT_SERVICE_AUTH'),
    true,
  );
  assert.equal(
    decision.rejectedShortcuts.includes('REUSE_INTERNAL_AUDIT_OR_ALERT_ACK_SECRET'),
    true,
  );
  assert.equal(
    decision.rejectedShortcuts.includes('DIRECT_WEB_DATABASE_LOCKING'),
    true,
  );
});
