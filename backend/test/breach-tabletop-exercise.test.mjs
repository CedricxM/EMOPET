import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const {
  BREACH_TABLETOP_MODE,
  BREACH_TABLETOP_VERSION,
  runBreachTabletopExercise,
} = await import('../dist/api/privacy/breach-tabletop-exercise.js');

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '../..');
const USER_A = 'user:11111111-1111-4111-8111-111111111111';
const USER_B = 'user:22222222-2222-4222-8222-222222222222';

function resolverFromMap(entries) {
  const map = new Map(entries);
  return {
    async resolveAffectedObject(object) {
      const key = object.surface + ':' + object.ref;
      if (!map.has(key)) throw new Error('missing fixture: ' + key);
      return map.get(key);
    },
  };
}

function exerciseInput(overrides = {}) {
  return {
    incidentId: 'TABLETOP-2026-09-23-01',
    awarenessAt: '2026-09-23T08:00:00Z',
    affectedObjects: [
      { surface: 'sql:users', ref: 'account-1' },
      { surface: 'sql:community_members', ref: 'membership-1' },
    ],
    decision: {
      outcome: 'NOTIFY',
      decidedAt: '2026-09-23T08:20:00Z',
      authorityRole: 'privacy_dpo',
    },
    ...overrides,
  };
}

function detectSendMechanism(source) {
  const patterns = [
    ['fetch', /\bfetch\s*\(/],
    ['Resend client', /\bnew\s+Resend\s*\(/],
    ['Resend import', /\bfrom\s+['"]resend['"]/],
    ['sendMail', /\bsendMail\s*\(/],
    ['nodemailer', /\bnodemailer\b/i],
    ['axios', /\baxios\s*\./],
    ['http request', /\bhttps?\.request\s*\(/],
    ['environment access', /\bprocess\.env\b/],
    ['webhook literal', /\bwebhook\b/i],
  ];
  return patterns.find(([, pattern]) => pattern.test(source))?.[0] ?? null;
}

test('complete tabletop scopes all recipients and creates simulated no-send tasks only', async () => {
  const resolver = resolverFromMap([
    ['sql:users:account-1', { status: 'RESOLVED', personRefs: [USER_A] }],
    ['sql:community_members:membership-1', { status: 'RESOLVED', personRefs: [USER_A, USER_B] }],
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

test('provider authority gap blocks notification planning even when recipients resolve', async () => {
  const resolver = resolverFromMap([
    ['provider:Resend:copy-1', { status: 'RESOLVED', personRefs: [USER_A, 'external:processor_subject_9'] }],
  ]);

  const result = await runBreachTabletopExercise(exerciseInput({
    affectedObjects: [{ surface: 'provider:Resend', ref: 'copy-1' }],
  }), resolver);

  assert.equal(result.status, 'BLOCKED_RECIPIENT_SCOPE');
  assert.equal(result.recipientStatus, 'INCOMPLETE');
  assert.deepEqual(result.recipients, ['external:processor_subject_9', USER_A]);
  assert.deepEqual(result.notificationTasks, []);
  assert.deepEqual(result.recipientGaps, [
    { objectKey: 'provider:Resend:copy-1', reason: 'provider_copy_unverified' },
  ]);
});

test('web prototype authority gap blocks notification planning', async () => {
  const resolver = resolverFromMap([
    ['web:breiz-contact-requests:req-1', { status: 'RESOLVED', personRefs: ['contact:req_7f3a'] }],
  ]);

  const result = await runBreachTabletopExercise(exerciseInput({
    affectedObjects: [{ surface: 'web:breiz-contact-requests', ref: 'req-1' }],
  }), resolver);

  assert.equal(result.status, 'BLOCKED_RECIPIENT_SCOPE');
  assert.deepEqual(result.notificationTasks, []);
  assert.deepEqual(result.recipientGaps, [
    { objectKey: 'web:breiz-contact-requests:req-1', reason: 'canonical_subject_missing' },
  ]);
});

test('an explicit unresolved privacy decision blocks the notification phase', async () => {
  const resolver = resolverFromMap([
    ['sql:users:account-1', { status: 'RESOLVED', personRefs: [USER_A] }],
  ]);

  const result = await runBreachTabletopExercise(exerciseInput({
    affectedObjects: [{ surface: 'sql:users', ref: 'account-1' }],
    decision: {
      outcome: 'UNRESOLVED',
      decidedAt: '2026-09-23T08:20:00Z',
      authorityRole: 'incident_commander',
    },
  }), resolver);

  assert.equal(result.status, 'BLOCKED_DECISION');
  assert.deepEqual(result.notificationTasks, []);
});

test('explicit do-not-notify is recorded without fabricating tasks', async () => {
  const resolver = resolverFromMap([
    ['sql:users:account-1', { status: 'RESOLVED', personRefs: [USER_A] }],
  ]);

  const result = await runBreachTabletopExercise(exerciseInput({
    affectedObjects: [{ surface: 'sql:users', ref: 'account-1' }],
    decision: {
      outcome: 'DO_NOT_NOTIFY',
      decidedAt: '2026-09-23T08:20:00Z',
      authorityRole: 'legal_regulatory',
    },
  }), resolver);

  assert.equal(result.status, 'COMPLETE');
  assert.equal(result.decision?.outcome, 'DO_NOT_NOTIFY');
  assert.deepEqual(result.notificationTasks, []);
});

test('deduplicated recipient enumeration yields exactly one simulated task per person', async () => {
  const resolver = resolverFromMap([
    ['sql:dogs:dog-1', { status: 'RESOLVED', personRefs: [USER_A] }],
    ['sql:posts:post-1', { status: 'RESOLVED', personRefs: [USER_A, USER_B] }],
  ]);

  const result = await runBreachTabletopExercise(exerciseInput({
    affectedObjects: [
      { surface: 'sql:posts', ref: 'post-1' },
      { surface: 'sql:dogs', ref: 'dog-1' },
    ],
  }), resolver);

  assert.equal(result.status, 'COMPLETE');
  assert.deepEqual(result.notificationTasks, [
    { personRef: USER_A, delivery: 'SIMULATED_NOT_SENT' },
    { personRef: USER_B, delivery: 'SIMULATED_NOT_SENT' },
  ]);
});

test('NOTIFY with complete scope but no represented natural person is blocked', async () => {
  const resolver = resolverFromMap([
    ['sql:walk_quality:row-1', { status: 'NO_PERSON_REPRESENTED' }],
  ]);

  const result = await runBreachTabletopExercise(exerciseInput({
    affectedObjects: [{ surface: 'sql:walk_quality', ref: 'row-1' }],
  }), resolver);

  assert.equal(result.recipientStatus, 'COMPLETE');
  assert.equal(result.status, 'BLOCKED_DECISION');
  assert.deepEqual(result.recipients, []);
  assert.deepEqual(result.notificationTasks, []);
});

test('invalid chronology, authority and free-form contact fields fail closed', async () => {
  const resolver = resolverFromMap([
    ['sql:users:account-1', { status: 'RESOLVED', personRefs: [USER_A] }],
  ]);

  const beforeAwareness = await runBreachTabletopExercise(exerciseInput({
    affectedObjects: [{ surface: 'sql:users', ref: 'account-1' }],
    decision: {
      outcome: 'NOTIFY',
      decidedAt: '2026-09-23T07:59:59Z',
      authorityRole: 'privacy_dpo',
    },
  }), resolver);
  assert.equal(beforeAwareness.status, 'INVALID_INPUT');

  const invalidAuthority = await runBreachTabletopExercise(exerciseInput({
    affectedObjects: [{ surface: 'sql:users', ref: 'account-1' }],
    decision: {
      outcome: 'NOTIFY',
      decidedAt: '2026-09-23T08:20:00Z',
      authorityRole: 'support',
    },
  }), resolver);
  assert.equal(invalidAuthority.status, 'INVALID_INPUT');

  const withEmail = await runBreachTabletopExercise({
    ...exerciseInput({ affectedObjects: [{ surface: 'sql:users', ref: 'account-1' }] }),
    email: 'person@example.invalid',
  }, resolver);
  assert.equal(withEmail.status, 'INVALID_INPUT');
});

test('invalid or unsupported affected-object input cannot complete an exercise', async () => {
  const resolver = resolverFromMap([]);

  const malformed = await runBreachTabletopExercise(exerciseInput({
    affectedObjects: [{ surface: 'sql:users', ref: 'person@example.invalid' }],
  }), resolver);
  assert.equal(malformed.status, 'INVALID_INPUT');

  const unsupported = await runBreachTabletopExercise(exerciseInput({
    affectedObjects: [{ surface: 'future:new_surface', ref: 'object-9' }],
  }), resolver);
  assert.equal(unsupported.status, 'BLOCKED_RECIPIENT_SCOPE');
  assert.deepEqual(unsupported.recipientGaps, [
    { objectKey: 'unsupported:future:new_surface:object-9', reason: 'unsupported_surface' },
  ]);
  assert.deepEqual(unsupported.notificationTasks, []);
});

test('tabletop implementation contains no real sending or environment-backed delivery mechanism', () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, 'backend/api/privacy/breach-tabletop-exercise.ts'),
    'utf8',
  );

  assert.equal(detectSendMechanism(source), null);
  assert.equal(detectSendMechanism('fetch("https://example.invalid")'), 'fetch');
  assert.equal(detectSendMechanism('process.env.MAIL_API_KEY'), 'environment access');
});
