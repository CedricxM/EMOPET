import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  LEGACY_JOURNAL_DEMO_ENV,
  LEGACY_JOURNAL_DISABLED_CODE,
  isLegacyJournalDemoAllowed,
  legacyJournalAuthorityGate,
} from '../server/journal-authority';

test('legacy Journal data plane is disabled by default', async () => {
  const env = { NODE_ENV: 'development' } as NodeJS.ProcessEnv;

  assert.equal(isLegacyJournalDemoAllowed(env), false);
  const response = legacyJournalAuthorityGate(env);
  assert.ok(response);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');

  const body = await response.json();
  assert.equal(body.code, LEGACY_JOURNAL_DISABLED_CODE);
  assert.equal(body.authority, 'Product V1 Journal/Memory authority not yet wired');
});

test('legacy Journal demo requires explicit non-production opt-in', () => {
  const env = {
    NODE_ENV: 'development',
    [LEGACY_JOURNAL_DEMO_ENV]: '1',
  } as NodeJS.ProcessEnv;

  assert.equal(isLegacyJournalDemoAllowed(env), true);
  assert.equal(legacyJournalAuthorityGate(env), null);
});

test('production cannot enable legacy Journal even with demo opt-in', async () => {
  const env = {
    NODE_ENV: 'production',
    [LEGACY_JOURNAL_DEMO_ENV]: '1',
  } as NodeJS.ProcessEnv;

  assert.equal(isLegacyJournalDemoAllowed(env), false);
  const response = legacyJournalAuthorityGate(env);
  assert.ok(response);
  assert.equal(response.status, 503);
});

test('every legacy Next.js Journal handler is protected by the canonical authority gate', async () => {
  const routePath = fileURLToPath(new URL('../../app/api/journal/route.ts', import.meta.url));
  const source = await readFile(routePath, 'utf8');
  const handlers = [...source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g)];
  const gateCalls = source.match(/legacyJournalAuthorityGate\(\)/g) ?? [];

  assert.equal(handlers.length, 3, 'expected GET, POST and DELETE Journal handlers');
  assert.match(source, /lib\/server\/journal-authority/);
  assert.ok(
    gateCalls.length >= handlers.length,
    'every Journal handler must fail closed through legacyJournalAuthorityGate()',
  );
  assert.match(source, /authority: 'LEGACY_DEMO_ONLY'/);
  assert.match(source, /Cache-Control': 'private, no-store'/);
});

test('Journal client cannot fabricate Product V1 persistence when authority is unavailable', async () => {
  const pagePath = fileURLToPath(new URL('../../app/journal/page.tsx', import.meta.url));
  const source = await readFile(pagePath, 'utf8');

  assert.match(source, /JOURNAL_RUNTIME_UNAVAILABLE_MESSAGE/);
  assert.match(source, /journalRuntime !== 'legacy-demo'/);
  assert.match(source, /Aperçu prototype/);
  assert.match(source, /data\.authority !== 'LEGACY_DEMO_ONLY'/);

  assert.doesNotMatch(
    source,
    /localStorage/,
    'browser localStorage must not act as fallback Product V1 Journal persistence',
  );
  assert.doesNotMatch(
    source,
    /STORAGE_ENTRIES|persistUserEntries/,
    'legacy browser persistence helpers must stay removed from the Journal page',
  );
  assert.doesNotMatch(
    source,
    /setEntries\(\(prev\) => \[entry, \.\.\.prev\]\)[\s\S]{0,400}fetch\('\/api\/journal'/,
    'the client must not render a newly created entry as saved before server acknowledgement',
  );
});
