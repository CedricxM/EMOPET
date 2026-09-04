import test from 'node:test';
import assert from 'node:assert/strict';

const {
  BREACH_TABLETOP_MODE,
  BREACH_TABLETOP_VERSION,
  runBreachTabletopExercise,
} = await import('../dist/api/privacy/breach-tabletop-exercise.js');

const USER_A = 'user:11111111-1111-4111-8111-111111111111';
const USER_B = 'user:22222222-2222-4222-8222-222222222222';

function resolverFromMap(entries) {
  const map = new Map(entries);
  return {
    async resolveAffectedObject(object) {
      const key = `${object.surface}:${object.ref}`;
      if (!map.has(key)) throw new Error('missing fixture');
      return map.get(key);
    },
  };
}

function exerciseInput(overrides = {}) {
  return {
    incidentId: 'TABLETOP-2026-09-04-01',
    awarenessAt: '2026-09-04T09:00:00Z',
    affectedObjects: [
      { surface: 'user', ref: 'account-1' },
      { surface: 'community', ref: 'community-1' },
    ],
    decision: {
      outcome: 'NOTIFY',
      decidedAt: '2026-09-04T09:20:00Z',
      authorityRole: 'privacy_dpo',
    },
    ...overrides,
  };
}

test('complete tabletop scopes all recipients and creates simulated no-send tasks only', async () => {
  const resolver = resolverFromMap([
    ['user:account-1', { status: 'RESOLVED', personRefs: [USER_A] }],
    ['community:community-1', { status: 'RESOLVED', personRefs: [USER_A, USER_B] }],
  ]);

  const result = await runBreachTabletopExercise(exerciseInput(), resolver);

  assert.equal(result.version, BREACH_TABLETOP_VERSION);
  assert.equal(result.mode, BREACH_TABLETOP_MODE);
  assert.equal(result.status, 'COMPLETE');
  assert.equal(result.affectedObjectCount, 2);
  assert.equal(result.recipientStatus, 'COMPLETE');
  assert.deepEqual(result.recipients, [USER_A, USER_B]);
  assert.deepEqual(result.notificationTasks, [
    { personRef: USER_A, delivery: 'SIMULATED_NOT_SENT' },
    { personRef: USER_B, delivery: 'SIMULATED_NOT_SENT' },
  ]);
  assert.equal(JSON.stringify(result).includes('@'), false);
  assert.equal(JSON.stringify(result).includes('http'), false);
});

test('incomplete recipient scope blocks notification phase even when decision says notify', async () => {
  const resolver = resolverFromMap([
    ['user:account-1', { status: 'RESOLVED', personRefs: [USER_A] }],
    ['vet_report_share:share-1', { status: 'UNRESOLVED', gap: 'third_party_recipient_not_recorded' }],
  ]);

  const result = await runBreachTabletopExercise(exerciseInput({
    affectedObjects: [
      { surface: 'user', ref: 'account-1' },
      { surface: 'vet_report_share', ref: 'share-1' },
    ],
  }), resolver);

  assert.equal(result.status, 'BLOCKED_RECIPIENT_SCOPE');
  assert.equal(result.recipientStatus, 'INCOMPLETE');
  assert.deepEqual(result.notificationTasks, []);
  assert.deepEqual(result.recipientGaps, [
    { objectKey: 'vet_report_share:share-1', reason: 'third_party_recipient_not_recorded' },
  ]);
});

test('unresolved external privacy decision blocks the notification phase', async () => {
  const resolver = resolverFromMap([
    ['user:account-1', { status: 'RESOLVED', personRefs: [USER_A] }],
  ]);

  const result = await runBreachTabletopExercise(exerciseInput({
    affectedObjects: [{ surface: 'user', ref: 'account-1' }],
    decision: {
      outcome: 'UNRESOLVED',
      decidedAt: '2026-09-04T09:20:00Z',
      authorityRole: 'incident_commander',
    },
  }), resolver);

  assert.equal(result.status, 'BLOCKED_DECISION');
  assert.deepEqual(result.notificationTasks, []);
});

test('explicit do-not-notify decision is recorded without fabricating notification tasks', async () => {
  const resolver = resolverFromMap([
    ['user:account-1', { status: 'RESOLVED', personRefs: [USER_A] }],
  ]);

  const result = await runBreachTabletopExercise(exerciseInput({
    affectedObjects: [{ surface: 'user', ref: 'account-1' }],
    decision: {
      outcome: 'DO_NOT_NOTIFY',
      decidedAt: '2026-09-04T09:20:00Z',
      authorityRole: 'legal_regulatory',
    },
  }), resolver);

  assert.equal(result.status, 'COMPLETE');
  assert.equal(result.decision?.outcome, 'DO_NOT_NOTIFY');
  assert.deepEqual(result.notificationTasks, []);
});

test('deduplicated recipient enumeration yields one simulated task per person', async () => {
  const resolver = resolverFromMap([
    ['dog:dog-1', { status: 'RESOLVED', personRefs: [USER_A] }],
    ['post:post-1', { status: 'RESOLVED', personRefs: [USER_A, USER_B] }],
  ]);

  const result = await runBreachTabletopExercise(exerciseInput({
    affectedObjects: [
      { surface: 'post', ref: 'post-1' },
      { surface: 'dog', ref: 'dog-1' },
    ],
  }), resolver);

  assert.equal(result.status, 'COMPLETE');
  assert.deepEqual(result.notificationTasks, [
    { personRef: USER_A, delivery: 'SIMULATED_NOT_SENT' },
    { personRef: USER_B, delivery: 'SIMULATED_NOT_SENT' },
  ]);
});

test('notify decision with no represented natural person is blocked rather than pretending success', async () => {
  const resolver = resolverFromMap([
    ['cache_index_copy:cache-1', { status: 'NO_PERSON_REPRESENTED' }],
  ]);

  const result = await runBreachTabletopExercise(exerciseInput({
    affectedObjects: [{ surface: 'cache_index_copy', ref: 'cache-1' }],
  }), resolver);

  assert.equal(result.status, 'BLOCKED_DECISION');
  assert.deepEqual(result.notificationTasks, []);
});

test('invalid chronology, authority or free-form contact fields fail closed', async () => {
  const resolver = resolverFromMap([
    ['user:account-1', { status: 'RESOLVED', personRefs: [USER_A] }],
  ]);

  const beforeAwareness = await runBreachTabletopExercise(exerciseInput({
    affectedObjects: [{ surface: 'user', ref: 'account-1' }],
    decision: {
      outcome: 'NOTIFY',
      decidedAt: '2026-09-04T08:59:59Z',
      authorityRole: 'privacy_dpo',
    },
  }), resolver);
  assert.equal(beforeAwareness.status, 'INVALID_INPUT');

  const invalidAuthority = await runBreachTabletopExercise(exerciseInput({
    affectedObjects: [{ surface: 'user', ref: 'account-1' }],
    decision: {
      outcome: 'NOTIFY',
      decidedAt: '2026-09-04T09:20:00Z',
      authorityRole: 'support',
    },
  }), resolver);
  assert.equal(invalidAuthority.status, 'INVALID_INPUT');

  const withEmail = await runBreachTabletopExercise({
    ...exerciseInput({ affectedObjects: [{ surface: 'user', ref: 'account-1' }] }),
    email: 'person@example.invalid',
  }, resolver);
  assert.equal(withEmail.status, 'INVALID_INPUT');
});
