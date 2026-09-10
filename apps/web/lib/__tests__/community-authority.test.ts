import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  LEGACY_COMMUNITY_DISABLED_CODE,
  LEGACY_COMMUNITY_DEMO_ENV,
  isLegacyCommunityDemoAllowed,
  legacyCommunityAuthorityGate,
} from '../server/community-authority';

async function collectCommunityRouteFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectCommunityRouteFiles(fullPath));
    } else if (entry.isFile() && entry.name === 'route.ts') {
      files.push(fullPath);
    }
  }

  return files;
}

test('legacy Community data plane is disabled by default', async () => {
  const env = { NODE_ENV: 'development' } as NodeJS.ProcessEnv;

  assert.equal(isLegacyCommunityDemoAllowed(env), false);
  const response = legacyCommunityAuthorityGate(env);
  assert.ok(response);
  assert.equal(response.status, 503);

  const body = await response.json();
  assert.equal(body.code, LEGACY_COMMUNITY_DISABLED_CODE);
  assert.equal(body.authority, 'Hono + durable Product V1 persistence');
});

test('legacy Community demo requires explicit non-production opt-in', () => {
  const env = {
    NODE_ENV: 'development',
    [LEGACY_COMMUNITY_DEMO_ENV]: '1',
  } as NodeJS.ProcessEnv;

  assert.equal(isLegacyCommunityDemoAllowed(env), true);
  assert.equal(legacyCommunityAuthorityGate(env), null);
});

test('production cannot enable legacy Community even with demo opt-in', async () => {
  const env = {
    NODE_ENV: 'production',
    [LEGACY_COMMUNITY_DEMO_ENV]: '1',
  } as NodeJS.ProcessEnv;

  assert.equal(isLegacyCommunityDemoAllowed(env), false);
  const response = legacyCommunityAuthorityGate(env);
  assert.ok(response);
  assert.equal(response.status, 503);
});

test('every legacy Next.js Community handler is protected by the canonical authority gate', async () => {
  const communityApiRoot = fileURLToPath(new URL('../../app/api/community/', import.meta.url));
  const routeFiles = (await collectCommunityRouteFiles(communityApiRoot)).sort();

  assert.ok(routeFiles.length >= 4, 'expected the known legacy Community route surface to be present');

  for (const routeFile of routeFiles) {
    const source = await readFile(routeFile, 'utf8');
    const handlers = [...source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g)];
    const gateCalls = source.match(/legacyCommunityAuthorityGate\(\)/g) ?? [];

    assert.ok(handlers.length > 0, `${routeFile} must expose at least one route handler`);
    assert.match(
      source,
      /from ['"][^'"]*lib\/server\/community-authority['"]/,
      `${routeFile} must import the canonical Community authority gate`,
    );
    assert.ok(
      gateCalls.length >= handlers.length,
      `${routeFile} must fail closed through legacyCommunityAuthorityGate() in every exported handler`,
    );
  }
});
