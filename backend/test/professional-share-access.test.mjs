import test from 'node:test';
import assert from 'node:assert/strict';

import { createProfessionalShareAccessChecker } from '../dist/api/services/professional-share-access.js';

const GRANT_ID = '11111111-1111-4111-8111-111111111111';
const DOG_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_ID = '33333333-3333-4333-8333-333333333333';
const NOW = Date.parse('2026-09-09T12:00:00Z');

function grant() {
  return {
    id: GRANT_ID, dogId: DOG_ID, guardianUserId: 'guardian-a',
    recipient: { displayName: 'Recipient', type: 'VETERINARIAN', principalId: 'professional-a' },
    purpose: 'VETERINARY_CONSULTATION',
    scopes: ['VETERINARY_SUMMARY', 'DATA_COVERAGE_AND_CONFIDENCE'],
    window: {
      dataFrom: '2026-09-01T00:00:00Z', dataTo: '2026-09-08T23:59:59Z',
      accessExpiresAt: '2026-09-10T12:00:00Z',
    },
    status: 'ACTIVE', createdAt: '2026-09-09T10:00:00Z', activatedAt: '2026-09-09T11:00:00Z',
    tokenId: 'never-return-this-token-id',
    privateNote: 'never-return-this-private-content',
  };
}

function intent() {
  return {
    grantId: GRANT_ID, dogId: DOG_ID, purpose: 'VETERINARY_CONSULTATION',
    scopes: ['VETERINARY_SUMMARY'],
    dataFrom: '2026-09-02T00:00:00Z', dataTo: '2026-09-07T00:00:00Z',
  };
}

// Synthetic adapters exercise the policy only. They are not persistence,
// recipient-verification or audit-durability evidence.
function fixture() {
  const state = { grant: grant(), principalId: 'professional-a', guardianCurrent: true, now: NOW };
  const reads = [];
  const audits = [];
  const authority = {
    async readGrant(...args) { reads.push(args); return state.grant; },
    async resolveVerifiedRecipient() { return state.principalId ? { principalId: state.principalId } : null; },
    async hasCurrentGuardianAuthority(userId, dogId) {
      return state.guardianCurrent && userId === 'guardian-a' && dogId === DOG_ID;
    },
    async recordDecision(event) { audits.push(event); return true; },
  };
  return { state, reads, audits, authority, check: createProfessionalShareAccessChecker(authority, () => state.now) };
}

test('unconfigured sharing authority fails closed without synthetic success', async () => {
  assert.deepEqual(await createProfessionalShareAccessChecker()(intent()), {
    allowed: false, status: 'UNAVAILABLE', reason: 'AUTHORITY_NOT_CONFIGURED',
  });
});

test('valid authority returns only the requested projection and a sanitized policy audit', async () => {
  const f = fixture();
  const result = await f.check(intent());
  assert.deepEqual(result, {
    allowed: true, status: 'AUTHORIZED', reason: 'ACTIVE_GRANT',
    ...intent(), accessExpiresAt: f.state.grant.window.accessExpiresAt,
  });
  assert.deepEqual(f.reads, [[GRANT_ID, DOG_ID]]);
  assert.deepEqual(f.audits, [{
    event: 'PROFESSIONAL_SHARE_POLICY_DECISION', grantId: GRANT_ID, dogId: DOG_ID,
    status: 'AUTHORIZED', reason: 'ACTIVE_GRANT',
  }]);
  const exposed = JSON.stringify({ result, audits: f.audits });
  for (const forbidden of ['never-return', 'guardian-a', 'professional-a', 'displayName', 'tokenId']) {
    assert.equal(exposed.includes(forbidden), false);
  }
});

test('rejects malformed or widened intent before calling authority adapters', async () => {
  for (const patch of [
    { grantId: 'invalid' }, { dogId: 'invalid' }, { scopes: [] },
    { scopes: ['VETERINARY_SUMMARY', 'VETERINARY_SUMMARY'] },
    { scopes: ['RAW_SENSOR_DATA'] }, { dataFrom: 'invalid' },
    { dataFrom: '2026-09-08T00:00:00Z', dataTo: '2026-09-01T00:00:00Z' },
    { recipient: { principalId: 'professional-a' } },
    { vet_export_opt_in: true }, { status: 'ACTIVE' },
  ]) {
    const f = fixture();
    assert.equal((await f.check({ ...intent(), ...patch })).reason, 'INVALID_REQUEST');
    assert.equal(f.reads.length, 0);
    assert.equal(f.audits.length, 0);
  }
});

test('recipient identity must be server-verified, bound and current', async () => {
  for (const principalId of [null, '', '   ', 'professional-b', 'guardian-a']) {
    const f = fixture(); f.state.principalId = principalId;
    assert.equal((await f.check(intent())).reason, 'RECIPIENT_MISMATCH');
  }
  const emailOnly = fixture();
  emailOnly.state.grant.recipient = { displayName: 'Recipient', type: 'VETERINARIAN', email: 'vet@example.test' };
  assert.equal((await emailOnly.check(intent())).reason, 'RECIPIENT_POLICY_NOT_READY');
});

test('missing grant and stale Guardian authority deny access', async () => {
  const absent = fixture(); absent.state.grant = null;
  assert.equal((await absent.check(intent())).reason, 'GRANT_NOT_FOUND');
  const transferred = fixture(); transferred.state.guardianCurrent = false;
  assert.equal((await transferred.check(intent())).reason, 'GUARDIAN_AUTHORITY_MISMATCH');
});

test('grant and dog substitution cannot authorize another resource', async () => {
  const f = fixture();
  assert.equal((await f.check({ ...intent(), grantId: OTHER_ID })).reason, 'GRANT_NOT_FOUND');
  assert.equal((await f.check({ ...intent(), dogId: OTHER_ID })).reason, 'DOG_SCOPE_MISMATCH');
});

test('pending, suspended, revoked and expired states all deny', async () => {
  for (const [status, reason] of [
    ['PENDING', 'GRANT_NOT_ACTIVE'], ['SUSPENDED', 'GRANT_NOT_ACTIVE'],
    ['REVOKED', 'GRANT_REVOKED'], ['EXPIRED', 'GRANT_EXPIRED'],
  ]) {
    const f = fixture(); f.state.grant.status = status;
    assert.equal((await f.check(intent())).reason, reason);
  }
  const f = fixture(); f.state.grant.revokedAt = '2026-09-09T11:30:00Z';
  assert.equal((await f.check(intent())).reason, 'GRANT_REVOKED');
});

test('reloads the grant on each access, including revocation and deletion', async () => {
  const f = fixture();
  assert.equal((await f.check(intent())).allowed, true);
  f.state.grant.status = 'REVOKED';
  assert.equal((await f.check(intent())).reason, 'GRANT_REVOKED');
  f.state.grant = null;
  assert.equal((await f.check(intent())).reason, 'GRANT_NOT_FOUND');
  assert.equal(f.reads.length, 3);
});

test('expiry is exclusive and evaluated again after asynchronous audit', async () => {
  const f = fixture(); f.state.now = Date.parse(f.state.grant.window.accessExpiresAt);
  assert.equal((await f.check(intent())).reason, 'GRANT_EXPIRED');
  const slow = fixture();
  slow.authority.recordDecision = async (event) => {
    slow.audits.push(event); slow.state.now = Date.parse(slow.state.grant.window.accessExpiresAt); return true;
  };
  assert.equal((await slow.check(intent())).reason, 'GRANT_EXPIRED');
  assert.equal(slow.audits.at(-1).status, 'DENIED');
});

test('rejects purpose, scope and data-window widening independently of expiry', async () => {
  for (const [patch, reason] of [
    [{ purpose: 'SECOND_OPINION' }, 'PURPOSE_MISMATCH'],
    [{ scopes: ['QUALIFIED_LONGITUDINAL_OBSERVATIONS'] }, 'DATA_SCOPE_MISMATCH'],
    [{ dataFrom: '2026-08-31T00:00:00Z' }, 'DATA_WINDOW_MISMATCH'],
    [{ dataTo: '2026-09-09T00:00:00Z' }, 'DATA_WINDOW_MISMATCH'],
  ]) {
    assert.equal((await fixture().check({ ...intent(), ...patch })).reason, reason);
  }
  const f = fixture();
  assert.equal((await f.check({ ...intent(), dataFrom: f.state.grant.window.dataFrom, dataTo: f.state.grant.window.dataTo })).allowed, true);
});

test('unresolved research and selected-content policies remain unavailable', async () => {
  const research = fixture();
  research.state.grant.purpose = 'RESEARCH_WITH_SEPARATE_CONSENT';
  research.state.grant.recipient.type = 'RESEARCHER';
  assert.equal((await research.check({ ...intent(), purpose: research.state.grant.purpose })).reason, 'RESEARCH_CONSENT_NOT_READY');
  for (const scope of ['OWNER_SELECTED_NOTES', 'DECLARED_CONTEXT']) {
    const f = fixture(); f.state.grant.scopes.push(scope);
    assert.equal((await f.check({ ...intent(), scopes: [scope] })).reason, 'SCOPE_POLICY_NOT_READY');
  }
});

test('invalid persisted state and invalid clocks never become permission', async () => {
  for (const mutate of [
    (g) => { g.status = 'UNKNOWN'; },
    (g) => { g.scopes.push('RAW_SENSOR_DATA'); },
    (g) => { g.scopes.push('VETERINARY_SUMMARY'); },
    (g) => { g.window.accessExpiresAt = 'bad-date'; },
    (g) => { g.window.dataFrom = '2026-09-11T00:00:00Z'; },
    (g) => { delete g.activatedAt; },
    (g) => { g.activatedAt = '2026-09-10T00:00:00Z'; },
    (g) => { g.activatedAt = '2026-09-01T00:00:00Z'; },
  ]) {
    const f = fixture(); mutate(f.state.grant);
    assert.equal((await f.check(intent())).reason, 'INVALID_STORED_GRANT');
  }
  const f = fixture(); f.state.now = Number.NaN;
  assert.equal((await f.check(intent())).allowed, false);
});

test('provider and persistence failures return unavailable without error details', async () => {
  for (const method of ['readGrant', 'resolveVerifiedRecipient', 'hasCurrentGuardianAuthority']) {
    const f = fixture();
    f.authority[method] = async () => { throw new Error('bearer-token-private-database-detail'); };
    const result = await f.check(intent());
    assert.equal(result.reason, 'AUTHORITY_UNAVAILABLE');
    assert.equal(JSON.stringify({ result, audits: f.audits }).includes('bearer-token'), false);
  }
});

test('audit failure or missing durable acknowledgement blocks an otherwise valid grant', async () => {
  for (const acknowledge of [false, undefined, 'true']) {
    const f = fixture(); f.authority.recordDecision = async () => acknowledge;
    assert.equal((await f.check(intent())).reason, 'AUDIT_UNAVAILABLE');
  }
  const f = fixture(); f.authority.recordDecision = async () => { throw new Error('private-sink-detail'); };
  assert.deepEqual(await f.check(intent()), { allowed: false, status: 'UNAVAILABLE', reason: 'AUDIT_UNAVAILABLE' });
});
