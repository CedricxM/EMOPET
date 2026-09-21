import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ADMIN_POST_ACTIONS,
  MAX_ADMIN_POST_PATCH_BYTES,
  adminPostMutationForAction,
  parseAdminPostPatchRequest,
} from '../admin-post-patch';

function req(body: string, extraHeaders: Record<string, string> = {}): Request {
  return new Request('https://example.test/api/admin/posts/post-1', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      ...extraHeaders,
    },
    body,
  });
}

test('admin post PATCH contract accepts only the finite moderation action set and maps mutations exactly', async () => {
  assert.deepEqual(ADMIN_POST_ACTIONS, ['hide', 'unhide', 'dismiss']);
  for (const [action, expected] of [
    ['hide', { isHidden: true }],
    ['unhide', { isHidden: false }],
    ['dismiss', { isHidden: false, flagCount: 0 }],
  ] as const) {
    const parsed = await parseAdminPostPatchRequest(req(JSON.stringify({ action, ignored: 'still ignored' })));
    assert.deepEqual(parsed, { ok: true, action });
    assert.deepEqual(adminPostMutationForAction(action), expected);
  }
});

test('admin post PATCH contract rejects malformed and hostile body shapes', async () => {
  for (const body of [
    '{', 'null', '[]', '"hide"', '42', 'true', '{}',
    '{"action":null}', '{"action":1}', '{"action":"delete"}',
  ]) {
    const parsed = await parseAdminPostPatchRequest(req(body));
    assert.deepEqual(parsed, { ok: false, status: 400 }, body);
  }
});

test('admin post PATCH contract accepts exactly 8 KiB and rejects 8 KiB plus one byte', async () => {
  const value = { action: 'hide', padding: '' };
  value.padding = 'x'.repeat(MAX_ADMIN_POST_PATCH_BYTES - Buffer.byteLength(JSON.stringify(value), 'utf8'));
  const exact = JSON.stringify(value);
  assert.equal(Buffer.byteLength(exact, 'utf8'), MAX_ADMIN_POST_PATCH_BYTES);

  assert.deepEqual(
    await parseAdminPostPatchRequest(req(exact)),
    { ok: true, action: 'hide' },
  );

  const oversized = exact + ' ';
  assert.equal(Buffer.byteLength(oversized, 'utf8'), MAX_ADMIN_POST_PATCH_BYTES + 1);

  const headerCases: Array<Record<string, string>> = [
    {},
    { 'content-length': '1' },
    { 'content-length': String(MAX_ADMIN_POST_PATCH_BYTES + 1) },
  ];
  for (const headers of headerCases) {
    assert.deepEqual(
      await parseAdminPostPatchRequest(req(oversized, headers)),
      { ok: false, status: 413 },
    );
  }
});
