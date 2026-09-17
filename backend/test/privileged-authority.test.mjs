import test from 'node:test';
import assert from 'node:assert/strict';

const {
  evaluatePrivilegedAuthority,
  getAllowedPrivilegedActions,
} = await import('../dist/api/security/privileged-authority.js');

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const SUPPORT_ID = '22222222-2222-4222-8222-222222222222';
const OPERATOR_ID = '33333333-3333-4333-8333-333333333333';

const WEB_ADMIN_ACTIONS = [
  'moderation.queue.read',
  'moderation.post.manage',
  'contact.request.read',
  'contact.request.manage',
  'admin.data.read',
];

test('privileged authority rejects missing, malformed and ordinary Guardian principals', () => {
  assert.deepEqual(
    evaluatePrivilegedAuthority(null, 'account.read_limited'),
    { allowed: false, reason: 'invalid_principal' },
  );

  assert.deepEqual(
    evaluatePrivilegedAuthority({ kind: 'human', subject: 'not-a-uuid', role: 'admin', mfaVerified: true }, 'account.read_limited'),
    { allowed: false, reason: 'invalid_principal' },
  );

  assert.deepEqual(
    evaluatePrivilegedAuthority({ kind: 'human', subject: ADMIN_ID, role: 'guardian', mfaVerified: true }, 'account.read_limited'),
    { allowed: false, reason: 'invalid_principal' },
  );
});

test('privileged authority requires explicit MFA proof for every human privileged role', () => {
  for (const [subject, role] of [
    [ADMIN_ID, 'admin'],
    [SUPPORT_ID, 'support'],
    [OPERATOR_ID, 'operator'],
  ]) {
    assert.deepEqual(
      evaluatePrivilegedAuthority({ kind: 'human', subject, role, mfaVerified: false }, 'account.read_limited'),
      { allowed: false, reason: 'mfa_required' },
    );
  }
});

test('least-privilege matrix rejects cross-role actions and contains no wildcard', () => {
  assert.equal(getAllowedPrivilegedActions('support').includes('security.incident.coordinate'), false);
  assert.equal(getAllowedPrivilegedActions('operator').includes('account.read_limited'), false);
  assert.equal(getAllowedPrivilegedActions('admin').some((action) => action === '*'), false);

  assert.deepEqual(
    evaluatePrivilegedAuthority(
      { kind: 'human', subject: SUPPORT_ID, role: 'support', mfaVerified: true },
      'security.incident.coordinate',
    ),
    { allowed: false, reason: 'action_not_allowed' },
  );

  assert.deepEqual(
    evaluatePrivilegedAuthority(
      { kind: 'human', subject: OPERATOR_ID, role: 'operator', mfaVerified: true },
      'account.read_limited',
    ),
    { allowed: false, reason: 'action_not_allowed' },
  );
});

test('machine identities cannot inherit interactive privileged human authority', () => {
  assert.deepEqual(
    evaluatePrivilegedAuthority(
      { kind: 'machine', subject: 'service:worker', role: 'service' },
      'security.incident.read',
    ),
    { allowed: false, reason: 'machine_principal_not_supported' },
  );
});

test('known privileged human role can perform only an explicitly allowed action after MFA', () => {
  assert.deepEqual(
    evaluatePrivilegedAuthority(
      { kind: 'human', subject: SUPPORT_ID, role: 'support', mfaVerified: true },
      'support.case.read_limited',
    ),
    { allowed: true, reason: 'allowed' },
  );

  assert.deepEqual(
    evaluatePrivilegedAuthority(
      { kind: 'human', subject: ADMIN_ID, role: 'admin', mfaVerified: true },
      'not.a.real.action',
    ),
    { allowed: false, reason: 'action_not_allowed' },
  );
});

test('legacy web-admin capabilities are finite and default to admin-only authority', () => {
  for (const action of WEB_ADMIN_ACTIONS) {
    assert.equal(getAllowedPrivilegedActions('admin').includes(action), true);
    assert.equal(getAllowedPrivilegedActions('support').includes(action), false);
    assert.equal(getAllowedPrivilegedActions('operator').includes(action), false);

    assert.deepEqual(
      evaluatePrivilegedAuthority(
        { kind: 'human', subject: ADMIN_ID, role: 'admin', mfaVerified: true },
        action,
      ),
      { allowed: true, reason: 'allowed' },
    );

    assert.deepEqual(
      evaluatePrivilegedAuthority(
        { kind: 'human', subject: SUPPORT_ID, role: 'support', mfaVerified: true },
        action,
      ),
      { allowed: false, reason: 'action_not_allowed' },
    );

    assert.deepEqual(
      evaluatePrivilegedAuthority(
        { kind: 'human', subject: OPERATOR_ID, role: 'operator', mfaVerified: true },
        action,
      ),
      { allowed: false, reason: 'action_not_allowed' },
    );
  }
});

test('new web-admin capabilities still require MFA and reject machine principals', () => {
  for (const action of WEB_ADMIN_ACTIONS) {
    assert.deepEqual(
      evaluatePrivilegedAuthority(
        { kind: 'human', subject: ADMIN_ID, role: 'admin', mfaVerified: false },
        action,
      ),
      { allowed: false, reason: 'mfa_required' },
    );

    assert.deepEqual(
      evaluatePrivilegedAuthority(
        { kind: 'machine', subject: 'service:moderation-worker', role: 'service' },
        action,
      ),
      { allowed: false, reason: 'machine_principal_not_supported' },
    );
  }
});
