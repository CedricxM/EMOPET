import test from 'node:test';
import assert from 'node:assert/strict';

const { enumerateBreachRecipients } = await import('../dist/api/privacy/breach-recipient-enumerator.js');

const USER_A = 'user:11111111-1111-4111-8111-111111111111';
const USER_B = 'user:22222222-2222-4222-8222-222222222222';
const USER_C = 'user:33333333-3333-4333-8333-333333333333';

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

test('enumerator keeps primary and secondary natural persons instead of collapsing to one account holder', async () => {
  const resolver = resolverFromMap([
    ['user:account-1', { status: 'RESOLVED', personRefs: [USER_A] }],
    ['community:community-1', { status: 'RESOLVED', personRefs: [USER_A, USER_B, USER_C] }],
  ]);

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'community', ref: 'community-1' },
    { surface: 'user', ref: 'account-1' },
  ], resolver), {
    status: 'COMPLETE',
    recipients: [USER_A, USER_B, USER_C],
    gaps: [],
  });
});

test('enumerator deduplicates recipients deterministically across affected objects', async () => {
  const resolver = resolverFromMap([
    ['dog:dog-1', { status: 'RESOLVED', personRefs: [USER_B, USER_A] }],
    ['post:post-1', { status: 'RESOLVED', personRefs: [USER_A] }],
  ]);

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'post', ref: 'post-1' },
    { surface: 'dog', ref: 'dog-1' },
  ], resolver), {
    status: 'COMPLETE',
    recipients: [USER_A, USER_B],
    gaps: [],
  });
});

test('unrecorded third-party recipient blocks completeness even when the account holder is known', async () => {
  const resolver = resolverFromMap([
    ['user:account-1', { status: 'RESOLVED', personRefs: [USER_A] }],
    ['vet_report_share:share-1', { status: 'UNRESOLVED', gap: 'third_party_recipient_not_recorded' }],
  ]);

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'user', ref: 'account-1' },
    { surface: 'vet_report_share', ref: 'share-1' },
  ], resolver), {
    status: 'INCOMPLETE',
    recipients: [USER_A],
    gaps: [
      { objectKey: 'vet_report_share:share-1', reason: 'third_party_recipient_not_recorded' },
    ],
  });
});

test('canonical-subject and provider-copy gaps remain visible and sorted', async () => {
  const resolver = resolverFromMap([
    ['journal_entry:journal-1', { status: 'UNRESOLVED', gap: 'canonical_subject_missing' }],
    ['external_provider_copy:provider-1', { status: 'UNRESOLVED', gap: 'provider_copy_unverified' }],
  ]);

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'journal_entry', ref: 'journal-1' },
    { surface: 'external_provider_copy', ref: 'provider-1' },
  ], resolver), {
    status: 'INCOMPLETE',
    recipients: [],
    gaps: [
      { objectKey: 'external_provider_copy:provider-1', reason: 'provider_copy_unverified' },
      { objectKey: 'journal_entry:journal-1', reason: 'canonical_subject_missing' },
    ],
  });
});

test('resolver failures and malformed resolutions fail closed instead of disappearing', async () => {
  const resolver = {
    async resolveAffectedObject(object) {
      if (object.ref === 'throws') throw new Error('boom');
      return { status: 'RESOLVED', personRefs: [] };
    },
  };

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'contact_request', ref: 'throws' },
    { surface: 'comment', ref: 'malformed' },
  ], resolver), {
    status: 'INCOMPLETE',
    recipients: [],
    gaps: [
      { objectKey: 'comment:malformed', reason: 'resolver_failure' },
      { objectKey: 'contact_request:throws', reason: 'resolver_failure' },
    ],
  });
});

test('resolver can explicitly state that an affected object represents no natural person', async () => {
  const resolver = resolverFromMap([
    ['cache_index_copy:cache-1', { status: 'NO_PERSON_REPRESENTED' }],
    ['user:account-1', { status: 'RESOLVED', personRefs: [USER_A] }],
  ]);

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'cache_index_copy', ref: 'cache-1' },
    { surface: 'user', ref: 'account-1' },
  ], resolver), {
    status: 'COMPLETE',
    recipients: [USER_A],
    gaps: [],
  });
});

test('person references are bounded and cannot smuggle direct contact details', async () => {
  const resolver = resolverFromMap([
    ['contact_request:contact-1', { status: 'RESOLVED', personRefs: ['person@example.invalid'] }],
  ]);

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'contact_request', ref: 'contact-1' },
  ], resolver), {
    status: 'INCOMPLETE',
    recipients: [],
    gaps: [
      { objectKey: 'contact_request:contact-1', reason: 'resolver_failure' },
    ],
  });
});

test('opaque person references can represent non-account natural persons without storing their contact details', async () => {
  const resolver = resolverFromMap([
    ['contact_request:contact-2', { status: 'RESOLVED', personRefs: ['contact:req_7f3a'] }],
    ['external_provider_copy:provider-2', { status: 'RESOLVED', personRefs: ['external:processor_subject_9'] }],
  ]);

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'external_provider_copy', ref: 'provider-2' },
    { surface: 'contact_request', ref: 'contact-2' },
  ], resolver), {
    status: 'COMPLETE',
    recipients: ['contact:req_7f3a', 'external:processor_subject_9'],
    gaps: [],
  });
});

test('invalid affected-object input never produces a completeness claim', async () => {
  const resolver = resolverFromMap([]);

  assert.deepEqual(await enumerateBreachRecipients([], resolver), {
    status: 'INVALID_INPUT',
    recipients: [],
    gaps: [],
  });

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'unknown_surface', ref: 'x' },
  ], resolver), {
    status: 'INVALID_INPUT',
    recipients: [],
    gaps: [],
  });

  assert.deepEqual(await enumerateBreachRecipients([
    { surface: 'user', ref: 'person@example.invalid' },
  ], resolver), {
    status: 'INVALID_INPUT',
    recipients: [],
    gaps: [],
  });
});
