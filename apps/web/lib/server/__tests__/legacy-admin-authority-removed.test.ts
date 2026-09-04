import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const FORBIDDEN_RUNTIME_AUTHORITY = [
  'x-admin-token',
  'breiz-admin-token',
  'ADMIN_TOKEN',
  'isAdmin(',
  'server/admin',
] as const;

async function collectRuntimeSources(rootUrl: URL): Promise<string[]> {
  const root = fileURLToPath(rootUrl);
  const files: string[] = [];

  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === '__tests__') continue;

      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute);
        continue;
      }

      if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(absolute);
      }
    }
  }

  await visit(root);
  return files;
}

test('legacy static admin authority module has been removed', async () => {
  const legacyModule = new URL('../admin.ts', import.meta.url);

  await assert.rejects(
    access(legacyModule),
    (error: NodeJS.ErrnoException) => error.code === 'ENOENT',
  );
});

test('web runtime cannot reintroduce legacy static admin authority', async () => {
  const roots = [
    new URL('../../../app/', import.meta.url),
    new URL('../../../components/', import.meta.url),
    new URL('../../', import.meta.url),
  ];

  const files = (await Promise.all(roots.map(collectRuntimeSources))).flat();
  assert.ok(files.length > 0);

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const forbidden of FORBIDDEN_RUNTIME_AUTHORITY) {
      assert.equal(
        source.includes(forbidden),
        false,
        `legacy privileged authority marker ${JSON.stringify(forbidden)} found in ${file}`,
      );
    }
  }
});
