import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  LEGACY_CONTACT_DEMO_ENV,
  LEGACY_CONTACT_DISABLED_CODE,
  isLegacyContactDemoAllowed,
  legacyContactAuthorityGate,
} from '../server/contact-authority';

test('legacy Contact PII plane is disabled by default', async () => {
  const env = { NODE_ENV: 'development' } as NodeJS.ProcessEnv;

  assert.equal(isLegacyContactDemoAllowed(env), false);
  const response = legacyContactAuthorityGate(env);
  assert.ok(response);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');

  const body = await response.json();
  assert.equal(body.code, LEGACY_CONTACT_DISABLED_CODE);
  assert.equal(body.authority, 'Product V1 Contact/support authority not yet wired');
});

test('legacy Contact demo requires explicit non-production opt-in', () => {
  const env = {
    NODE_ENV: 'development',
    [LEGACY_CONTACT_DEMO_ENV]: '1',
  } as NodeJS.ProcessEnv;

  assert.equal(isLegacyContactDemoAllowed(env), true);
  assert.equal(legacyContactAuthorityGate(env), null);
});

test('production cannot enable legacy Contact even with demo opt-in', () => {
  const env = {
    NODE_ENV: 'production',
    [LEGACY_CONTACT_DEMO_ENV]: '1',
  } as NodeJS.ProcessEnv;

  assert.equal(isLegacyContactDemoAllowed(env), false);
  const response = legacyContactAuthorityGate(env);
  assert.ok(response);
  assert.equal(response.status, 503);
});

test('every file-backed Contact handler is protected by the canonical Contact authority gate', async () => {
  const routeFiles = [
    fileURLToPath(new URL('../../app/api/contact/route.ts', import.meta.url)),
    fileURLToPath(new URL('../../app/api/admin/contact/[id]/route.ts', import.meta.url)),
    fileURLToPath(new URL('../../app/api/admin/moderation/route.ts', import.meta.url)),
  ];

  for (const routeFile of routeFiles) {
    const source = await readFile(routeFile, 'utf8');
    const handlers = [...source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g)];
    const gateCalls = source.match(/legacyContactAuthorityGate\(\)/g) ?? [];

    assert.ok(handlers.length > 0, `${routeFile} must expose at least one route handler`);
    assert.match(
      source,
      /from ['"][^'"]*lib\/server\/contact-authority['"]/,
      `${routeFile} must import the canonical Contact authority gate`,
    );
    assert.ok(
      gateCalls.length >= handlers.length,
      `${routeFile} must fail closed through legacyContactAuthorityGate() in every exported handler`,
    );
    assert.match(source, /LEGACY_DEMO_ONLY/, `${routeFile} must identify successful legacy behavior as demo-only`);
  }
});
