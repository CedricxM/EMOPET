import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [
  authoritySource,
  migrationSource,
  requirementMigrationSource,
  serviceSource,
  deliverySource,
  authRouteSource,
] = await Promise.all([
    readFile(new URL('../../config/security/auth-email-verification-v1.json', import.meta.url), 'utf8'),
    readFile(new URL('../../backend/db/migrations/0027_auth_email_verification.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../backend/db/migrations/0028_auth_email_verification_requirement.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../backend/api/services/auth-email-verification.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../backend/api/services/auth-email-delivery.ts', import.meta.url), 'utf8'),
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
  assert.equal(authority.decisions.verificationRequiresPasswordSelection, true);
  assert.equal(
    authority.decisions.preVerificationRegistrationPasswordBecomesPostVerificationAuthority,
    false,
  );
  assert.equal(authority.decisions.verificationPasswordUpdateAtomicWithTokenConsume, true);
  assert.equal(authority.decisions.legacyAccountMayEnterVerificationFlowBeforeRollout, false);
});

test('raw verification material is not durable authority', () => {
  assert.match(serviceSource, /randomBytes\(32\)/);
  assert.match(serviceSource, /createHash\('sha256'\)/);
  assert.match(migrationSource, /token_hash varchar\(64\) NOT NULL/);
  assert.doesNotMatch(migrationSource, /raw_token|verification_token varchar/i);
  assert.equal(authority.delivery.rawTokenMayBePersisted, false);
  assert.equal(authority.delivery.rawTokenMayBeLogged, false);
});

test('registration runtime is integrated without issuing a pre-verification session', () => {
  assert.equal(authority.runtime.durableTokenAuthorityImplemented, true);
  assert.equal(authority.runtime.registrationFlowIntegrated, true);
  assert.equal(authority.runtime.verificationRouteIntegrated, true);
  assert.equal(authority.runtime.resendRouteIntegrated, true);
  assert.equal(authority.runtime.deliveryProviderIntegrated, true);
  assert.equal(authority.runtime.newAccountLoginGateIntegrated, true);
  assert.equal(authority.runtime.preHijackGuardIntegrated, true);
  assert.equal(authority.runtime.legacyAccountRolloutIntegrated, false);

  assert.equal(authority.decisions.genericRegistrationAcknowledgement, '202_ACCEPTED_CONSTANT_BODY');
  assert.equal(authority.decisions.newRegistrationVerificationRequired, true);
  assert.equal(authority.decisions.loginForNewUnverifiedAccount, 'FORBIDDEN');
  assert.equal(authority.decisions.verificationTokenUrlTransport, 'FRAGMENT_ONLY');

  const registerBlock = authRouteSource.match(
    /auth\.post\('\/register'[\s\S]*?auth\.post\(\s*'\/verify-email'/,
  )?.[0] ?? '';
  assert.ok(registerBlock.length > 0);
  assert.match(registerBlock, /emailVerificationRequiredAt:\s*now/);
  assert.match(registerBlock, /issueAndDeliverEmailVerification/);
  assert.match(registerBlock, /genericEmailVerificationAcknowledgement/);
  assert.doesNotMatch(registerBlock, /issueRefreshCredential/);
  assert.doesNotMatch(registerBlock, /signAccessToken/);

  assert.match(authRouteSource, /'\/verify-email'/);
  assert.match(authRouteSource, /const \{ token, password \} = c\.req\.valid\('json'\)/);
  assert.match(authRouteSource, /consumeEmailVerificationToken\(token, password\)/);
  assert.match(authRouteSource, /'\/verify-email\/resend'/);
  assert.match(authRouteSource, /EmailVerificationResendSchema/);
  assert.match(authRouteSource, /requiresEmailVerification/);
});

test('verification cannot promote the pre-verification registration password', () => {
  assert.match(serviceSource, /verificationPassword:\s*string/);
  assert.match(serviceSource, /const passwordHash = await hashPassword\(verificationPassword\)/);
  assert.match(serviceSource, /passwordHash,/);
  assert.match(serviceSource, /isNotNull\(users\.emailVerificationRequiredAt\)/);
  assert.match(serviceSource, /verification_not_required/);

  assert.match(authRouteSource, /emailVerificationRequiredAt !== null/);
  assert.match(authRouteSource, /consumeEmailVerificationToken\(token, password\)/);
});

test('legacy-account rollout remains explicit instead of silently backfilling ownership proof', () => {
  assert.match(requirementMigrationSource, /ADD COLUMN email_verification_required_at timestamptz/);
  assert.doesNotMatch(requirementMigrationSource, /DEFAULT|NOT NULL/);
  assert.doesNotMatch(requirementMigrationSource, /UPDATE\s+users[\s\S]*email_verified_at/i);
  assert.equal(
    authority.decisions.legacyAccountDisposition,
    'EMAIL_VERIFICATION_REQUIRED_AT_NULL / LOGIN_PRESERVED_PENDING_EXPLICIT_ROLLOUT',
  );
});

test('verification delivery keeps raw token out of query parameters and fails closed in production', () => {
  assert.equal(authority.delivery.verificationUrlEnv, 'AUTH_EMAIL_VERIFICATION_URL');
  assert.equal(authority.delivery.productionHttpsRequired, true);
  assert.match(deliverySource, /url\.hash = fragment\.toString\(\)/);
  assert.doesNotMatch(deliverySource, /searchParams\.set\('token'/);
  assert.match(deliverySource, /assertEmailVerificationRuntimeConfiguration/);
  assert.match(deliverySource, /AUTH_EMAIL_VERIFICATION_URL_HTTPS/);
});
