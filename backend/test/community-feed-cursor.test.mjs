import test from 'node:test';
import assert from 'node:assert/strict';
import {
  InvalidCommunityFeedCursor,
  decodeCommunityFeedCursor,
  encodeCommunityFeedCursor,
} from '../dist/api/services/community-feed.js';

const scope = { userId: 'abcdefab-cdef-4abc-8def-abcdefabcdef', communityId: 'abcdefab-cdef-7abc-8def-bbbbbbbbbbbb' };
const position = { id: 'abcdefab-cdef-7abc-8def-cccccccccccc', createdAt: '2026-09-11T12:34:56.123987Z' };
const cursor = encodeCommunityFeedCursor(position, scope);
const data = JSON.parse(Buffer.from(cursor, 'base64url').toString());
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

test('feed cursor round trip preserves microseconds and resource UUID versions', () => {
  assert.deepEqual(decodeCommunityFeedCursor([cursor], scope), position);
  assert.deepEqual(decodeCommunityFeedCursor([cursor], {
    userId: scope.userId.toUpperCase(), communityId: scope.communityId.toUpperCase(),
  }), position);
});

test('missing cursor starts a page but empty, duplicated and malformed cursors cannot silently restart it', () => {
  assert.equal(decodeCommunityFeedCursor(undefined, scope), null);
  for (const values of [[], [''], [cursor, cursor], ['bad%cursor'], ['a'.repeat(769)], [`${cursor}=`], [encode(null)], [encode([])]]) {
    assert.throws(() => decodeCommunityFeedCursor(values, scope), InvalidCommunityFeedCursor);
  }
});

test('feed cursor refuses ambiguous calendar values, precision loss, extra fields and unsupported versions', () => {
  for (const patch of [
    { createdAt: '2026-02-30T12:34:56.123987Z' }, { createdAt: '0000-01-01T00:00:00.000000Z' },
    { createdAt: '2026-09-11T12:34:56.123Z' }, { createdAt: 'infinity' },
    { createdAt: '2026-09-11T12:34:56.123987Z OR 1=1' }, { createdAt: null },
    { v: 2 }, { extra: true }, { id: 'not-a-uuid' },
  ]) {
    assert.throws(() => decodeCommunityFeedCursor([encode({ ...data, ...patch })], scope), InvalidCommunityFeedCursor);
  }
});

test('unmodified cursor cannot cross its account or community scope', () => {
  for (const changed of [
    { ...scope, userId: '44444444-4444-4444-8444-444444444444' },
    { ...scope, communityId: '55555555-5555-4555-8555-555555555555' },
  ]) assert.throws(() => decodeCommunityFeedCursor([cursor], changed), InvalidCommunityFeedCursor);
});
