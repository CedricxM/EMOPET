import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = fileURLToPath(new URL('../', import.meta.url));
const routesDir = path.join(backendRoot, 'api', 'routes');
const storeImport = 'world-progression-postgres-store';

test('durable World progression store remains unwired from HTTP routes', async () => {
  const routeFiles = (await readdir(routesDir))
    .filter((name) => /\.(?:ts|js)$/.test(name));

  const offenders = [];
  for (const name of routeFiles) {
    const source = await readFile(path.join(routesDir, name), 'utf8');
    if (source.includes(storeImport)) offenders.push(name);
  }

  assert.deepEqual(
    offenders,
    [],
    'Durable World progression persistence must not activate through an HTTP route before runtime authority promotion.',
  );
});

test('store source explicitly documents its non-activation boundary', async () => {
  const source = await readFile(
    new URL('../api/services/world-progression-postgres-store.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /not imported by any HTTP route/i);
  assert.match(source, /not equivalent to runtime production authority/i);
});
