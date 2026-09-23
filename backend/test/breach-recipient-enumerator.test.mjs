import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const {
  enumerateBreachRecipients,
  BREACH_RECIPIENT_SURFACES,
} = await import('../dist/api/privacy/breach-recipient-enumerator.js');

const generator = await import('../../scripts/privacy/generate-breach-recipient-surfaces.mjs');

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '../..');
const USER_A = 'user:11111111-1111-4111-8111-111111111111';
const USER_B = 'user:22222222-2222-4222-8222-222222222222';
const USER_C = 'user:33333333-3333-4333-8333-333333333333';

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

function sendMechanism(source) {
  const patterns = [
    ['fetch', /\bfetch\s*\(/],
    ['Resend client', /\bnew\s+Resend\s*\(/],
    ['Resend import', /\bfrom\s+['"]resend['"]/],
    ['mail transport', /\bsendMail\s*\(/],
    ['environment access', /\bprocess\.env\b/],
  ];
  return patterns.find(([, pattern]) => pattern.test(source))?.[0] ?? null;
}

test('keeps primary and secondary natural persons across canonical SQL surfaces', async () => {
  const resolver = resolverFromMap([
    ['sql:users:account-1', { status: 'RESOLVED', personRefs: [USER_A] }],
    ['sql:community_members:membership-1', { status: 'RESOLVED', personRefs: [USER_A, USER_B, USER_C] }],
  ]);

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'sql:community_members', ref: 'membership-1' },
    { surface: 'sql:users', ref: 'account-1' },
  ], resolver), {
    status: 'COMPLETE',
    recipients: [USER_A, USER_B, USER_C],
    gaps: [],
  });
});

test('deduplicates recipients deterministically', async () => {
  const resolver = resolverFromMap([
    ['sql:dogs:dog-1', { status: 'RESOLVED', personRefs: [USER_B, USER_A] }],
    ['sql:posts:post-1', { status: 'RESOLVED', personRefs: [USER_A] }],
  ]);

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'sql:posts', ref: 'post-1' },
    { surface: 'sql:dogs', ref: 'dog-1' },
  ], resolver), {
    status: 'COMPLETE',
    recipients: [USER_A, USER_B],
    gaps: [],
  });
});

test('unrecorded third-party recipient blocks completeness', async () => {
  const resolver = resolverFromMap([
    ['sql:users:account-1', { status: 'RESOLVED', personRefs: [USER_A] }],
    ['sql:community_reports:report-1', { status: 'UNRESOLVED', gap: 'third_party_recipient_not_recorded' }],
  ]);

  const result = await enumerateBreachRecipients([
    { surface: 'sql:users', ref: 'account-1' },
    { surface: 'sql:community_reports', ref: 'report-1' },
  ], resolver);

  assert.equal(result.status, 'INCOMPLETE');
  assert.deepEqual(result.recipients, [USER_A]);
  assert.deepEqual(result.gaps, [
    { objectKey: 'sql:community_reports:report-1', reason: 'third_party_recipient_not_recorded' },
  ]);
});

test('provider copies always force INCOMPLETE while preserving resolved recipients', async () => {
  const resolver = resolverFromMap([
    ['provider:Resend:copy-1', { status: 'RESOLVED', personRefs: [USER_A, 'external:provider_subject_9'] }],
  ]);

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'provider:Resend', ref: 'copy-1' },
  ], resolver), {
    status: 'INCOMPLETE',
    recipients: ['external:provider_subject_9', USER_A],
    gaps: [{ objectKey: 'provider:Resend:copy-1', reason: 'provider_copy_unverified' }],
  });
});

test('web prototype stores always force INCOMPLETE because canonical subject authority is absent', async () => {
  const resolver = resolverFromMap([
    ['web:breiz-contact-requests:req-1', { status: 'RESOLVED', personRefs: ['contact:req_7f3a'] }],
  ]);

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'web:breiz-contact-requests', ref: 'req-1' },
  ], resolver), {
    status: 'INCOMPLETE',
    recipients: ['contact:req_7f3a'],
    gaps: [{ objectKey: 'web:breiz-contact-requests:req-1', reason: 'canonical_subject_missing' }],
  });
});

test('non-SQL surfaces cannot claim completeness even when no person is asserted', async () => {
  const resolver = resolverFromMap([
    ['non_sql:BACKUPS:snapshot-1', { status: 'NO_PERSON_REPRESENTED' }],
  ]);

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'non_sql:BACKUPS', ref: 'snapshot-1' },
  ], resolver), {
    status: 'INCOMPLETE',
    recipients: [],
    gaps: [{ objectKey: 'non_sql:BACKUPS:snapshot-1', reason: 'canonical_subject_missing' }],
  });
});

test('resolver failures and malformed resolutions fail closed', async () => {
  const resolver = {
    async resolveAffectedObject(object) {
      if (object.ref === 'throws') throw new Error('boom');
      return { status: 'RESOLVED', personRefs: [] };
    },
  };

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'sql:comments', ref: 'malformed' },
    { surface: 'sql:health_entries', ref: 'throws' },
  ], resolver), {
    status: 'INCOMPLETE',
    recipients: [],
    gaps: [
      { objectKey: 'sql:comments:malformed', reason: 'resolver_failure' },
      { objectKey: 'sql:health_entries:throws', reason: 'resolver_failure' },
    ],
  });
});

test('person refs are bounded and cannot smuggle direct contact details', async () => {
  const resolver = resolverFromMap([
    ['sql:users:account-1', { status: 'RESOLVED', personRefs: ['person@example.invalid'] }],
  ]);

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'sql:users', ref: 'account-1' },
  ], resolver), {
    status: 'INCOMPLETE',
    recipients: [],
    gaps: [{ objectKey: 'sql:users:account-1', reason: 'resolver_failure' }],
  });
});

test('opaque non-account person refs remain supported without contact details', async () => {
  const resolver = resolverFromMap([
    ['sql:community_reports:report-2', { status: 'RESOLVED', personRefs: ['contact:req_7f3a', 'external:processor_subject_9'] }],
  ]);

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'sql:community_reports', ref: 'report-2' },
  ], resolver), {
    status: 'COMPLETE',
    recipients: ['contact:req_7f3a', 'external:processor_subject_9'],
    gaps: [],
  });
});

test('unknown but well-formed surfaces become explicit unsupported gaps', async () => {
  const resolver = resolverFromMap([
    ['sql:users:account-1', { status: 'RESOLVED', personRefs: [USER_A] }],
  ]);

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'future:new_surface', ref: 'object-9' },
    { surface: 'sql:users', ref: 'account-1' },
  ], resolver), {
    status: 'INCOMPLETE',
    recipients: [USER_A],
    gaps: [{ objectKey: 'unsupported:future:new_surface:object-9', reason: 'unsupported_surface' }],
  });
});

test('invalid input never produces a completeness claim', async () => {
  const resolver = resolverFromMap([]);

  assert.deepEqual(await enumerateBreachRecipients([], resolver), {
    status: 'INVALID_INPUT', recipients: [], gaps: [],
  });
  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'sql:users', ref: 'person@example.invalid' },
  ], resolver), {
    status: 'INVALID_INPUT', recipients: [], gaps: [],
  });
});

test('derived catalogue covers all 48 current surfaces including second-order behavioral tables', () => {
  const counts = { sql: 0, non_sql: 0, provider: 0, web: 0 };
  for (const entry of BREACH_RECIPIENT_SURFACES) counts[entry.surface.split(':', 1)[0]] += 1;

  assert.equal(BREACH_RECIPIENT_SURFACES.length, 48);
  assert.deepEqual(counts, { sql: 31, non_sql: 5, provider: 7, web: 5 });
  assert.ok(BREACH_RECIPIENT_SURFACES.some((entry) => entry.surface === 'sql:behavioral_responses'));
  assert.ok(BREACH_RECIPIENT_SURFACES.some((entry) => entry.surface === 'sql:behavioral_factor_scores'));
});

test('checked-in surface catalogue is exactly derived from privacy topology and web code', () => {
  const derived = generator.deriveBreachRecipientSurfaces();
  const rendered = generator.renderGeneratedSource(derived);
  const current = fs.readFileSync(generator.GENERATED_PATH, 'utf8');

  assert.equal(current, rendered);
  assert.notEqual(generator.renderGeneratedSource(derived.slice(1)), current);
});

test('breach-recipient slice contains no sending mechanism, and the guard catches a real one', () => {
  const files = [
    path.join(REPO_ROOT, 'backend/api/privacy/breach-recipient-enumerator.ts'),
    path.join(REPO_ROOT, 'backend/api/privacy/breach-recipient-surfaces.generated.ts'),
  ];
  const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

  assert.equal(sendMechanism(source), null);
  assert.equal(sendMechanism('const r = fetch("https://example.invalid");'), 'fetch');
});
