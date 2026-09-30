import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [authoritySource, migrationSource, serviceSource, authRouteSource] =
  await Promise.all([
    readFile(new URL('../../config/security/auth-email-verification-v1.json', import.meta.url), 'utf8'),
    readFile(new URL('../../backend/db/migrations/0027_auth_email_verification.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../backend/api/services/auth-email-verification.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../backend/api/routes/auth.ts', import.meta.url), 'utf8'),
  ]);

const authority = JSON.parse(authoritySource);

test('#738 core authority fixes TTL, cooldown and no-session verification policy', () => {
  assert.equal(authority.issue, 738);
  assert.equal(authority.decisions.tokenTtlSeconds, 86400);
  assert.equal(authority.decisions.resendCooldownSeconds, 60);
  assert.equal(authority.decisions.newTokenSupersedesPriorLiveToken, true);
  assert.equal(authority.decisions.verificationIssuesSession, false);
  assert.equal(authority.decisions.postVerificationSessionPolicy, 'REQUIRE_NORMAL_LOGIN');
  assert.equal(authority.decisions.normalSessionBeforeVerification, 'FORBIDDEN');
});

test('raw verification material is not durable authority', () => {
  assert.match(serviceSource, /randomBytes\(32\)/);
  assert.match(serviceSource, /createHash\('sha256'\)/);
  assert.match(migrationSource, /token_hash varchar\(64\) NOT NULL/);
  assert.doesNotMatch(migrationSource, /raw_token|verification_token varchar/i);
  assert.equal(authority.delivery.rawTokenMayBePersisted, false);
  assert.equal(authority.delivery.rawTokenMayBeLogged, false);
});

test('core slice stays deliberately detached from public registration until delivery is ready', () => {
  assert.equal(authority.runtime.durableTokenAuthorityImplemented, true);
  assert.equal(authority.runtime.registrationFlowIntegrated, false);
  assert.equal(authority.runtime.verificationRouteIntegrated, false);
  assert.equal(authority.runtime.resendRouteIntegrated, false);
  assert.equal(authority.runtime.deliveryProviderIntegrated, false);

  assert.doesNotMatch(authRouteSource, /auth-email-verification/);
  assert.doesNotMatch(authRouteSource, /issueEmailVerificationToken/);
  assert.doesNotMatch(authRouteSource, /consumeEmailVerificationToken/);
});
