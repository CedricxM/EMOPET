import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SURFACES = [
  '../../../app/api/admin/moderation/route.ts',
  '../../../app/api/admin/contact/[id]/route.ts',
  '../../../app/api/admin/posts/[id]/route.ts',
  '../../../app/api/contact/route.ts',
  '../../../app/admin/data/page.tsx',
  '../../../app/admin/page.tsx',
] as const;

test('all six retained D2-A surfaces are detached from the legacy static admin authority', async () => {
  for (const relative of SURFACES) {
    const url = new URL(relative, import.meta.url);
    const source = await readFile(url, 'utf8');

    assert.equal(
      /from ['"][^'"]*lib\/server\/admin['"]/.test(source),
      false,
      `${relative} must not import the retired lib/server/admin authority`,
    );

    for (const legacy of [
      'isAdmin(',
      'isAdminTokenValue',
      'ADMIN_TOKEN_COOKIE',
      'x-admin-token',
      'breiz-admin-token',
      'sessionStorage',
      'document.cookie',
    ]) {
      assert.equal(
        source.includes(legacy),
        false,
        `${relative} must not contain legacy privileged authority marker: ${legacy}`,
      );
    }
  }
});

test('legacy file-backed data planes remain explicitly demo-contained after staff authority migration', async () => {
  const moderation = await readFile(
    new URL('../../../app/api/admin/moderation/route.ts', import.meta.url),
    'utf8',
  );
  const contactMutation = await readFile(
    new URL('../../../app/api/admin/contact/[id]/route.ts', import.meta.url),
    'utf8',
  );
  const postMutation = await readFile(
    new URL('../../../app/api/admin/posts/[id]/route.ts', import.meta.url),
    'utf8',
  );
  const contact = await readFile(
    new URL('../../../app/api/contact/route.ts', import.meta.url),
    'utf8',
  );

  assert.equal(moderation.includes('legacyCommunityAuthorityGate()'), true);
  assert.equal(moderation.includes('legacyContactAuthorityGate()'), true);
  assert.equal(contactMutation.includes('legacyContactAuthorityGate()'), true);
  assert.equal(postMutation.includes('legacyCommunityAuthorityGate()'), true);

  const contactHandlers = [...contact.matchAll(/export async function (GET|POST|DELETE)\b/g)];
  const contactGates = contact.match(/legacyContactAuthorityGate\(\)/g) ?? [];
  assert.equal(contactHandlers.length, 3);
  assert.ok(contactGates.length >= contactHandlers.length);

  for (const source of [moderation, contactMutation, postMutation, contact]) {
    assert.equal(source.includes('LEGACY_DEMO_ONLY'), true);
  }
});
