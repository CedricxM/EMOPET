import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('../../../', import.meta.url));

async function collectRuntimeSources(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectRuntimeSources(full));
    else if (entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name)) files.push(full);
  }

  return files;
}

test('legacy static web admin helper is retired and cannot be imported by active runtime', async () => {
  const legacyHelper = path.join(webRoot, 'lib/server/admin.ts');
  await assert.rejects(access(legacyHelper));

  const roots = [
    path.join(webRoot, 'app'),
    path.join(webRoot, 'lib/server'),
  ];

  const files = (await Promise.all(roots.map(collectRuntimeSources))).flat();
  const forbidden = [
    'ADMIN_TOKEN',
    'x-admin-token',
    'breiz-admin-token',
    'lib/server/admin',
    "from './admin'",
    "from '../admin'",
  ];

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const marker of forbidden) {
      assert.equal(
        source.includes(marker),
        false,
        `${path.relative(webRoot, file)} must not reintroduce legacy static admin marker: ${marker}`,
      );
    }
  }
});

test('environment examples expose the canonical privileged JWT key instead of ADMIN_TOKEN', async () => {
  const rootEnv = await readFile(path.join(webRoot, '../../.env.example'), 'utf8');
  const webEnv = await readFile(path.join(webRoot, '.env.example'), 'utf8');

  for (const [name, source] of [['root', rootEnv], ['web', webEnv]] as const) {
    assert.equal(source.includes('\nADMIN_TOKEN='), false, `${name} env example must not configure ADMIN_TOKEN`);
    assert.equal(source.includes('PRIVILEGED_JWT_SECRET='), true, `${name} env example must configure PRIVILEGED_JWT_SECRET`);
  }
});
