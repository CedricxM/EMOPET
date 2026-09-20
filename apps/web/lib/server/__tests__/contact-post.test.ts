import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, beforeEach, mock, test } from 'node:test';

import type { ContactRequest, NewContactInput } from '../../contact';

const originalCwd = process.cwd();
const envKeys = ['EMOPET_TRUST_PROXY_HEADERS', 'RESEND_API_KEY', 'TEAM_EMAIL'] as const;
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
const sandbox = mkdtempSync(join(tmpdir(), 'emopet-contact-post-'));
const dataDir = join(sandbox, '.data');
const dataFile = join(dataDir, 'contact-requests.json');
let post: typeof import('../../../app/api/contact/route')['POST'];
let notificationCount = 0;
let requestSequence = 0;

before(async () => {
  // The store captures cwd at import time. Keep every write in a disposable
  // directory, and intercept notification fetches before loading the route.
  process.chdir(sandbox);
  process.env['EMOPET_TRUST_PROXY_HEADERS'] = 'true';
  process.env['RESEND_API_KEY'] = 'test-only-not-a-real-key';
  process.env['TEAM_EMAIL'] = 'team@example.test';
  mock.method(globalThis, 'fetch', async () => {
    assert.ok(stored().length > 0, 'notification must follow persistence');
    notificationCount += 1;
    return new Response('{}', { status: 200 });
  });
  post = (await import('../../../app/api/contact/route')).POST;
});

beforeEach(() => {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(dataFile, '[]', 'utf8');
  notificationCount = 0;
});

after(() => {
  mock.restoreAll();
  process.chdir(originalCwd);
  for (const key of envKeys) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(sandbox, { recursive: true, force: true });
});

function validInput(overrides: Partial<NewContactInput> = {}): NewContactInput {
  return {
    channel: 'phone',
    reason: 'question_usage',
    contactValue: '+33612345678',
    proposedSlots: [{
      start: new Date(Date.now() + 86_400_000).toISOString(),
      end: new Date(Date.now() + 88_200_000).toISOString(),
    }],
    consentGiven: true,
    ownerToken: 'owner-current-web',
    ...overrides,
  };
}

function request(body: string, extraHeaders: Record<string, string> = {}): Request {
  return new Request('https://example.test/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-real-ip': `198.51.100.${++requestSequence}`,
      ...extraHeaders,
    },
    body,
  });
}

function stored(): ContactRequest[] {
  return existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, 'utf8')) : [];
}

test('Contact POST preserves current fields, drops unknown authority fields and notifies only after storage', async () => {
  const input = validInput({ message: '  Besoin d’aide  ', ownerToken: ' owner-current-web ' });
  const response = await post(request(JSON.stringify({
    ...input,
    requesterUserId: 'untrusted-user',
    id: 'untrusted-id',
    status: 'completed',
    teamNotes: 'untrusted-notes',
    proposedSlots: [{ ...input.proposedSlots[0]!, extra: 'ignored' }],
  })));
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.request.ownerToken, 'owner-current-web');
  assert.equal(result.request.message, 'Besoin d’aide');
  assert.equal(result.request.channel, 'phone');
  assert.equal(result.request.contactValue, input.contactValue);
  assert.equal(result.request.status, 'pending');
  assert.notEqual(result.request.id, 'untrusted-id');
  assert.deepEqual(result.request.proposedSlots, input.proposedSlots);
  for (const field of ['requesterUserId', 'teamNotes']) assert.equal(field in result.request, false);
  assert.deepEqual(stored(), [result.request]);
  assert.equal(notificationCount, 1);
});

test('Contact POST rejects hostile shapes and malformed JSON without storage access or notification', async () => {
  // An unreadable collection would throw if parsing failed to stop the request.
  const corruptStore = '[{"id":"keep-this-record"';
  writeFileSync(dataFile, corruptStore, 'utf8');
  for (const payload of [
    null, [], 'contact', 42, true, {},
    { ...validInput(), contactValue: 123 },
    { ...validInput(), proposedSlots: [null] },
    { ...validInput(), proposedSlots: [{ start: 123, end: 'bad' }] },
    { ...validInput(), message: 123 },
    { ...validInput(), ownerToken: {} },
    { ...validInput(), reason: 'toString' },
  ]) {
    const response = await post(request(JSON.stringify(payload)));
    assert.equal(response.status, 400, JSON.stringify(payload));
  }
  assert.equal((await post(request('{'))).status, 400);
  assert.equal(readFileSync(dataFile, 'utf8'), corruptStore);
  assert.equal(notificationCount, 0);
});

test('Contact POST keeps consent, future slots and contact formats as domain validation', async () => {
  for (const input of [
    validInput({ consentGiven: false }),
    validInput({ proposedSlots: [] }),
    validInput({ proposedSlots: [{ start: '2020-01-01T09:00:00Z', end: '2020-01-01T10:00:00Z' }] }),
    validInput({ channel: 'video', contactValue: 'not-an-email' }),
    validInput({ reason: 'sante_chien' as NewContactInput['reason'] }),
  ]) {
    assert.equal((await post(request(JSON.stringify(input)))).status, 400);
  }
  assert.deepEqual(stored(), []);
  assert.equal(notificationCount, 0);
});

test('Contact POST accepts exactly 8 KiB and rejects 8 KiB plus one byte even with a false length', async () => {
  const input = { ...validInput(), padding: '' };
  input.padding = 'x'.repeat(8192 - Buffer.byteLength(JSON.stringify(input), 'utf8'));
  const body = JSON.stringify(input);
  assert.equal(Buffer.byteLength(body, 'utf8'), 8192);
  assert.equal((await post(request(body))).status, 201);
  const beforeOversized = readFileSync(dataFile, 'utf8');
  const headerCases: Record<string, string>[] = [{}, { 'content-length': '1' }, { 'content-length': '8193' }];
  for (const headers of headerCases) {
    const response = await post(request(body + ' ', headers));
    assert.equal(response.status, 413);
  }
  assert.equal(readFileSync(dataFile, 'utf8'), beforeOversized);
  assert.equal(notificationCount, 1);
});

test('Contact POST preserves optional messages and owner header fallback, with a 500-character message bound', async () => {
  for (const message of [undefined, '', 'm'.repeat(500)]) {
    const input = validInput({ message, ownerToken: undefined, channel: 'video', contactValue: 'owner@example.test' });
    const response = await post(request(JSON.stringify(input), { 'x-contact-owner-token': 'owner-from-header' }));
    assert.equal(response.status, 201);
    assert.equal((await response.json()).request.ownerToken, 'owner-from-header');
  }
  assert.equal((await post(request(JSON.stringify(validInput({ message: 'm'.repeat(501) }))))).status, 400);
  assert.equal(stored().length, 3);
  assert.equal(notificationCount, 3);
});

test('Contact POST keeps the owner requirement and the active-request limit scoped to each owner', async () => {
  const missingOwner = await post(request(JSON.stringify(validInput({ ownerToken: undefined }))));
  assert.equal(missingOwner.status, 400);
  assert.deepEqual(stored(), []);
  for (let index = 0; index < 3; index++) {
    assert.equal((await post(request(JSON.stringify(validInput())))).status, 201);
  }
  assert.equal((await post(request(JSON.stringify(validInput())))).status, 429);
  assert.equal((await post(request(JSON.stringify(validInput({ ownerToken: 'another-owner' }))))).status, 201);
  assert.equal(stored().length, 4);
  assert.equal(notificationCount, 4);
});
