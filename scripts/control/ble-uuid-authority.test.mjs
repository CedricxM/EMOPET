import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const authority = JSON.parse(
  await readFile(path.join(root, 'config/ble/uuid-authority-v1.json'), 'utf8'),
);
const constants = await readFile(
  path.join(root, 'packages/shared/src/constants/index.ts'),
  'utf8',
);
const io = JSON.parse(
  await readFile(path.join(root, 'config/eli/io-first-slice.json'), 'utf8'),
);

const active = authority.active;
const expected = {
  service: 'e4e2e9a3-39c8-4140-aba9-c4e37713f59a',
  sensorFrame: '66ae0c98-a8ce-4319-b47d-f09fa88d4d83',
  ota: '17780ee9-7def-4b89-aea5-e7a27deaf95c',
  config: '8d5fa4ff-d1fa-49c3-9ce4-2e8865e4d478',
  featureSummary: '01141d55-a776-4091-b068-83f0804d8781',
  clockSample: '7c2c7cc8-91a8-58c1-a38a-2f9b9929f5d5',
};

async function collectFiles(target) {
  const stat = await import('node:fs/promises').then((fs) => fs.stat(target));
  if (stat.isFile()) return [target];
  const entries = await readdir(target, { withFileTypes: true });
  const nested = [];
  for (const entry of entries) {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) nested.push(...await collectFiles(child));
    else if (/\.(?:ts|tsx|js|mjs|json|c|h|conf)$/.test(entry.name)) nested.push(child);
  }
  return nested;
}

test('active EMOPET GATT UUIDs are unique proprietary 128-bit identifiers', () => {
  assert.deepEqual(active, expected);

  const values = Object.values(active);
  assert.equal(new Set(values).size, values.length);

  for (const value of values) {
    assert.match(
      value,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    assert.doesNotMatch(
      value,
      /^0000[0-9a-f]{4}-0000-1000-8000-00805f9b34fb$/,
      'custom UUID must not use the Bluetooth SIG Base UUID alias space',
    );
  }
});

test('shared runtime constants match the controlled UUID authority exactly', () => {
  for (const value of Object.values(expected)) {
    assert.ok(constants.includes(`'${value}'`), value);
  }
  assert.equal(io.currentTransport.featureSummaryCharacteristic, expected.featureSummary);
  assert.equal(io.currentTransport.bleUuidAuthority, 'config/ble/uuid-authority-v1.json');
});

test('active runtime/config/firmware surfaces cannot reintroduce historical EAxx aliases', async () => {
  const targets = [
    path.join(root, 'packages/shared/src'),
    path.join(root, 'apps/mobile/src'),
    path.join(root, 'apps/mobile/app.json'),
    path.join(root, 'config/eli'),
    path.join(root, 'firmware/collar/main'),
    path.join(root, 'firmware/collar/ncs'),
  ];

  const files = (await Promise.all(targets.map(collectFiles))).flat();
  const forbidden = /0000ea0[1-5]-0000-1000-8000-00805f9b34fb/i;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      forbidden,
      `historical Bluetooth Base UUID alias reintroduced in ${path.relative(root, file)}`,
    );
  }
});
