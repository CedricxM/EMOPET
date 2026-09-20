import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('post PATCH preserves Community kill gate and 8 KiB parser behind exact privileged authority', async () => {
  const routeUrl = new URL('../../../app/api/admin/posts/[id]/route.ts', import.meta.url);
  const source = await readFile(routeUrl, 'utf8');
  const patchStart = source.indexOf('export async function PATCH');
  assert.notEqual(patchStart, -1);
  const patch = source.slice(patchStart);

  for (const legacy of ['isAdmin(', 'x-admin-token', 'breiz-admin-token', 'ADMIN_TOKEN']) {
    assert.equal(patch.includes(legacy), false, `legacy staff authority must be absent: ${legacy}`);
  }

  const gate = patch.indexOf('legacyCommunityAuthorityGate()');
  const rate = patch.indexOf('enforceRateLimit');
  const originConfig = patch.indexOf('resolvePrivilegedWebOrigin()');
  const originGuard = patch.indexOf('evaluatePrivilegedMutationOrigin');
  const bearerReject = patch.indexOf("req.headers.has('authorization')");
  const cookieRead = patch.indexOf('await cookies()');
  const authorize = patch.indexOf('authorizePrivilegedSessionToken');
  const params = patch.indexOf('await ctx.params');
  const body = patch.indexOf('readLimitedJson<unknown>(req, MAX_ADMIN_POST_PATCH_BYTES)');
  const mutation = patch.indexOf("collection<CirclePost>('community-posts').update");

  for (const position of [gate, rate, originConfig, originGuard, bearerReject, cookieRead, authorize, params, body, mutation]) {
    assert.notEqual(position, -1);
  }

  assert.ok(gate < rate);
  assert.ok(rate < originConfig);
  assert.ok(originConfig < originGuard);
  assert.ok(originGuard < bearerReject);
  assert.ok(bearerReject < cookieRead);
  assert.ok(cookieRead < authorize);
  assert.ok(authorize < params);
  assert.ok(params < body);
  assert.ok(body < mutation);
  assert.equal(source.includes('const MAX_ADMIN_POST_PATCH_BYTES = 8 * 1024'), true);
  assert.equal(patch.includes("'moderation.post.manage'"), true);
  assert.equal(patch.includes('LEGACY_DEMO_ONLY'), true);
});
