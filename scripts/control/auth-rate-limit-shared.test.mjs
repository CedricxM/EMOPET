import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [authoritySource, indexSource, storeSource, middlewareSource, schemaSource] =
  await Promise.all([
    readFile(new URL('../../config/security/auth-rate-limit-v1.json', import.meta.url), 'utf8'),
    readFile(new URL('../../backend/api/index.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../backend/api/security/auth-rate-limit-store.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../backend/api/middleware/shared-auth-rate-limit.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../backend/db/schema/auth-rate-limit.ts', import.meta.url), 'utf8'),
  ]);

const authority = JSON.parse(authoritySource);

test('#767 keeps the existing auth quota while moving only auth to shared state', () => {
  assert.equal(authority.issue, 767);
  assert.equal(authority.policy.limit, 20);
  assert.equal(authority.policy.windowMs, 60000);
  assert.equal(authority.policy.changedByThisGate, false);

  assert.match(
    indexSource,
    /app\.use\('\/api\/auth\/\*', sharedAuthRateLimitMiddleware\(\{ limit: 20, windowMs: 60_000, keyPrefix: 'auth' \}\)\)/,
  );
  assert.match(
    indexSource,
    /app\.use\('\/api\/\*', rateLimitMiddleware\(\{ limit: 240, windowMs: 60_000, keyPrefix: 'api' \}\)\)/,
  );
});

test('shared store is HMAC pseudonymous and has no raw client-identity column', () => {
  assert.match(storeSource, /createHmac\('sha256'/);
  assert.match(storeSource, /AUTH_RATE_LIMIT_HMAC_SECRET/);
  assert.match(storeSource, /emopet-auth-rate-limit-v1/);
  assert.match(schemaSource, /bucketHash/);
  assert.doesNotMatch(schemaSource, /ipAddress|rawIp|email|token|requestBody/i);

  assert.equal(authority.privacy.rawClientIpPersisted, false);
  assert.equal(authority.privacy.rawForwardingHeaderPersisted, false);
  assert.equal(authority.privacy.classification, 'PSEUDONYMOUS_NOT_ANONYMOUS');
});

test('auth store failure is fail-closed and there is no process-local fallback', () => {
  assert.match(middlewareSource, /rate_limit_unavailable/);
  assert.match(middlewareSource, /503/);
  assert.doesNotMatch(middlewareSource, /createFixedWindowLimiter|new Map/);

  assert.equal(authority.store.processLocalFallback, false);
  assert.equal(authority.failure.fallbackToInMemory, false);
  assert.equal(authority.failure.storeUnavailable, 'HTTP_503_FAIL_CLOSED');
});

test('proxy and deployment claims remain bounded', () => {
  assert.equal(authority.proxyTrust.authority, 'EMOPET_TRUST_PROXY_HEADERS');
  assert.equal(authority.proxyTrust.productionEdgeConfigurationProven, false);
  assert.equal(authority.nonGoals.redisProviderSelected, false);
  assert.equal(authority.nonGoals.productionReadinessClaim, false);
  assert.equal(authority.nonGoals.credentialStuffingPreventionClaim, false);
});
