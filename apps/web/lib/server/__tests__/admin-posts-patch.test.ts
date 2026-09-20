import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, beforeEach, test } from 'node:test';

const originalCwd = process.cwd();
const mutableEnv = process.env as Record<string, string | undefined>;
const envKeys = ['NODE_ENV', 'ADMIN_TOKEN', 'EMOPET_ALLOW_LEGACY_COMMUNITY_DEMO'] as const;
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, mutableEnv[key]]));
const sandbox = mkdtempSync(join(tmpdir(), 'emopet-admin-posts-patch-'));
const dataDir = join(sandbox, '.data');
const dataFile = join(dataDir, 'community-posts.json');
let patchRoute: typeof import('../../../app/api/admin/posts/[id]/route')['PATCH'];
let requestSequence = 0;

before(async () => {
  process.chdir(sandbox);
  mutableEnv['NODE_ENV'] = 'test';
  mutableEnv['ADMIN_TOKEN'] = 'test-admin-token';
  mutableEnv['EMOPET_ALLOW_LEGACY_COMMUNITY_DEMO'] = '1';
  patchRoute = (await import('../../../app/api/admin/posts/[id]/route')).PATCH;
});

beforeEach(() => {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(dataFile, JSON.stringify([{ id: 'post-1', isHidden: false, flagCount: 3 }]), 'utf8');
});

after(() => {
  process.chdir(originalCwd);
  for (const key of envKeys) {
    const value = originalEnv[key];
    if (value === undefined) delete mutableEnv[key];
    else mutableEnv[key] = value;
  }
  rmSync(sandbox, { recursive: true, force: true });
});

function req(body: string, extraHeaders: Record<string, string> = {}): Request {
  return new Request(`https://example.test/api/admin/posts/post-1?n=${++requestSequence}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      'x-admin-token': 'test-admin-token',
      ...extraHeaders,
    },
    body,
  });
}

function stored() {
  return JSON.parse(readFileSync(dataFile, 'utf8')) as Array<Record<string, unknown>>;
}

async function call(body: string, extraHeaders: Record<string, string> = {}) {
  return patchRoute(req(body, extraHeaders), { params: Promise.resolve({ id: 'post-1' }) });
}

test('admin post PATCH accepts only the finite moderation action set', async () => {
  for (const [action, expected] of [
    ['hide', { isHidden: true, flagCount: 3 }],
    ['unhide', { isHidden: false, flagCount: 3 }],
    ['dismiss', { isHidden: false, flagCount: 0 }],
  ] as const) {
    writeFileSync(dataFile, JSON.stringify([{ id: 'post-1', isHidden: false, flagCount: 3 }]), 'utf8');
    const response = await call(JSON.stringify({ action, ignored: 'still ignored' }));
    assert.equal(response.status, 200);
    assert.deepEqual(
      { isHidden: stored()[0]?.['isHidden'], flagCount: stored()[0]?.['flagCount'] },
      expected,
    );
  }
});

test('admin post PATCH rejects malformed and hostile body shapes without mutation', async () => {
  const original = readFileSync(dataFile, 'utf8');
  for (const body of [
    '{', 'null', '[]', '"hide"', '42', 'true', '{}',
    '{"action":null}', '{"action":1}', '{"action":"delete"}',
  ]) {
    const response = await call(body);
    assert.equal(response.status, 400, body);
    assert.equal(readFileSync(dataFile, 'utf8'), original, body);
  }
});

test('admin post PATCH accepts exactly 8 KiB and rejects 8 KiB plus one byte', async () => {
  const value = { action: 'hide', padding: '' };
  value.padding = 'x'.repeat(8192 - Buffer.byteLength(JSON.stringify(value), 'utf8'));
  const exact = JSON.stringify(value);
  assert.equal(Buffer.byteLength(exact, 'utf8'), 8192);

  assert.equal((await call(exact)).status, 200);
  writeFileSync(dataFile, JSON.stringify([{ id: 'post-1', isHidden: false, flagCount: 3 }]), 'utf8');
  const before = readFileSync(dataFile, 'utf8');

  const headerCases: Record<string, string>[] = [{}, { 'content-length': '1' }, { 'content-length': '8193' }];
  for (const headers of headerCases) {
    const response = await call(exact + ' ', headers);
    assert.equal(response.status, 413);
    assert.equal(readFileSync(dataFile, 'utf8'), before);
  }
});

test('admin post PATCH keeps legacy authority and admin checks ahead of body parsing', async () => {
  const before = readFileSync(dataFile, 'utf8');

  delete mutableEnv['EMOPET_ALLOW_LEGACY_COMMUNITY_DEMO'];
  const disabled = await call('{');
  assert.equal(disabled.status, 503);

  mutableEnv['EMOPET_ALLOW_LEGACY_COMMUNITY_DEMO'] = '1';
  const unauthorized = await patchRoute(
    new Request('https://example.test/api/admin/posts/post-1', { method: 'PATCH', body: '{' }),
    { params: Promise.resolve({ id: 'post-1' }) },
  );
  assert.equal(unauthorized.status, 401);
  assert.equal(readFileSync(dataFile, 'utf8'), before);
});
