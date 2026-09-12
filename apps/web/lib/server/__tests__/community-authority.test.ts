import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  LEGACY_COMMUNITY_DEMO_ENV,
  LEGACY_COMMUNITY_DISABLED_CODE,
  isLegacyCommunityDemoAllowed,
  legacyCommunityAuthorityGate,
} from '../community-authority';

const legacyCommunityRoutes = [
  '../../../app/api/map/spots/route.ts',
  '../../../app/api/map/spots/[id]/comments/route.ts',
  '../../../app/api/admin/posts/[id]/route.ts',
  '../../../app/api/admin/moderation/route.ts',
] as const;

test('legacy Community demo authority is explicit, non-production only and fail-closed by default', async () => {
  assert.equal(LEGACY_COMMUNITY_DEMO_ENV, 'EMOPET_ALLOW_LEGACY_COMMUNITY_DEMO');

  assert.equal(isLegacyCommunityDemoAllowed({ NODE_ENV: 'test' }), false);
  assert.equal(
    isLegacyCommunityDemoAllowed({
      NODE_ENV: 'development',
      EMOPET_ALLOW_LEGACY_COMMUNITY_DEMO: '1',
    }),
    true,
  );
  assert.equal(
    isLegacyCommunityDemoAllowed({
      NODE_ENV: 'production',
      EMOPET_ALLOW_LEGACY_COMMUNITY_DEMO: '1',
    }),
    false,
    'production must refuse the legacy Community plane even when the demo opt-in is present',
  );

  const denied = legacyCommunityAuthorityGate({ NODE_ENV: 'test' });
  assert.ok(denied, 'legacy Community persistence must be disabled without explicit non-production opt-in');
  assert.equal(denied.status, 503);
  assert.equal(denied.headers.get('cache-control'), 'private, no-store');
  assert.equal(denied.headers.get('x-content-type-options'), 'nosniff');
  const body = await denied.json();
  assert.equal(body.code, LEGACY_COMMUNITY_DISABLED_CODE);
  assert.equal(body.authority, 'Hono + durable Product V1 persistence');

  assert.equal(
    legacyCommunityAuthorityGate({
      NODE_ENV: 'development',
      EMOPET_ALLOW_LEGACY_COMMUNITY_DEMO: '1',
    }),
    null,
  );
});

test('every known legacy Community map/admin handler invokes the canonical authority gate', async () => {
  for (const relativePath of legacyCommunityRoutes) {
    const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');

    assert.match(
      source,
      /import\s+\{\s*legacyCommunityAuthorityGate\s*\}\s+from\s+['"][^'"]*community-authority['"];/,
      `${relativePath} must import the canonical legacy Community authority gate`,
    );

    const handlers = [...source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)]
      .map((match) => match[1]);
    const gateCalls = [...source.matchAll(/legacyCommunityAuthorityGate\(\)/g)];

    assert.ok(handlers.length > 0, `${relativePath} must expose at least one route handler`);
    assert.equal(
      gateCalls.length,
      handlers.length,
      `${relativePath} must invoke legacyCommunityAuthorityGate() once for every exported route handler`,
    );

    const firstCollectionUse = source.indexOf('collection<');
    const firstGateCall = source.indexOf('legacyCommunityAuthorityGate()');
    if (firstCollectionUse >= 0) {
      assert.ok(
        firstGateCall >= 0 && firstGateCall < firstCollectionUse,
        `${relativePath} must fail closed before touching a historical Community collection`,
      );
    }
  }
});
