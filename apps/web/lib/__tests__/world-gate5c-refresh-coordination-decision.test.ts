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

test('Gate 5C selects a dedicated internal Owner refresh service channel without activation', () => {
  assert.equal(decision.status, 'SELECTED_NOT_IMPLEMENTED');
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

  assert.equal(decision.activation.implementationReady, false);
  assert.equal(decision.activation.multiInstanceProofReady, false);
  assert.equal(decision.activation.uiCutoverAllowed, false);
  assert.equal(readiness.activated, false);
  assert.equal(readiness.prerequisites.uiCutoverDecisionRecorded, false);
});

test('dedicated Owner refresh service secret cannot reuse existing authority secrets', () => {
  const secretEnv = decision.internalRefresh.serviceSecretEnv;
  assert.equal(secretEnv, 'EMOPET_INTERNAL_OWNER_SESSION_SERVICE_SECRET');
  assert.equal(secretEnv.startsWith('NEXT_PUBLIC_'), false);
  assert.deepEqual(decision.internalRefresh.secretMustDifferFrom, [
    'JWT_SECRET',
    'PRIVILEGED_JWT_SECRET',
    'EMOPET_INTERNAL_AUDIT_SERVICE_SECRET',
    'EMOPET_INTERNAL_ALERT_ACK_SERVICE_SECRET',
  ]);

  const existingVariables = Object.values(runtimeConfig.knownAuthorityExamples)
    .map((entry: unknown) => (
      typeof entry === 'object' && entry !== null && 'variable' in entry
        ? (entry as { variable?: unknown }).variable
        : null
    ))
    .filter((value: unknown): value is string => typeof value === 'string');

  assert.equal(
    existingVariables.includes(secretEnv),
    false,
    'selected-not-implemented secret must not be presented as registered runtime authority yet',
  );
});

test('selected design reuses the repository body-bound service JWT pattern, not static shared headers', () => {
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

test('trusted concurrent handling is restricted to the future internal service route', () => {
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
