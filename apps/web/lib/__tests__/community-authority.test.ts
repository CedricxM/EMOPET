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

async function collectRouteFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectRouteFiles(fullPath));
    } else if (entry.isFile() && entry.name === 'route.ts') {
      files.push(fullPath);
    }
  }

  return files;
}

async function assertCommunityGate(routeFile: string): Promise<void> {
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

test('legacy Community data plane is disabled by default', async () => {
  const env = { NODE_ENV: 'development' } as NodeJS.ProcessEnv;

  assert.equal(isLegacyCommunityDemoAllowed(env), false);
  const response = legacyCommunityAuthorityGate(env);
  assert.ok(response);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');

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

test('every known file-backed Community/map/admin handler is protected by the canonical authority gate', async () => {
  const roots = [
    fileURLToPath(new URL('../../app/api/community/', import.meta.url)),
    fileURLToPath(new URL('../../app/api/map/spots/', import.meta.url)),
    fileURLToPath(new URL('../../app/api/admin/posts/', import.meta.url)),
  ];
  const routeFiles = (await Promise.all(roots.map((root) => collectRouteFiles(root))))
    .flat()
    .sort();
  routeFiles.push(fileURLToPath(new URL('../../app/api/admin/moderation/route.ts', import.meta.url)));

  assert.ok(routeFiles.length >= 8, 'expected Community, map and admin legacy route surfaces to be present');
  for (const routeFile of routeFiles) await assertCommunityGate(routeFile);
});

test('Community client cannot fabricate shared success when Product V1 authority is unavailable', async () => {
  const sectionPath = fileURLToPath(new URL('../../app/quartier/CommunitySection.tsx', import.meta.url));
  const source = await readFile(sectionPath, 'utf8');

  assert.match(source, /COMMUNITY_RUNTIME_UNAVAILABLE_MESSAGE/);
  assert.match(source, /communityRuntime !== 'legacy-demo'/);
  assert.match(source, /Aperçu prototype/);

  assert.doesNotMatch(
    source,
    /LS_KEYS\.posts/,
    'shared Community posts must not fall back to browser persistence',
  );
  assert.doesNotMatch(
    source,
    /id:\s*`user-\$\{Date\.now\(\)\}`/,
    'failed server writes must not fabricate local Community entities',
  );
  assert.doesNotMatch(
    source,
    /hors-ligne\s*[→-]\s*baseline local|repli local/i,
    'network or authority failure must not be described or implemented as local shared success',
  );
});
