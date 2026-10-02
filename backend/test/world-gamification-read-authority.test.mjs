import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const routeSource = await readFile(
  new URL('../api/routes/world-gamification.ts', import.meta.url),
  'utf8',
);
const readSource = await readFile(
  new URL('../api/services/world-gamification-read.ts', import.meta.url),
  'utf8',
);
const indexSource = await readFile(
  new URL('../api/index.ts', import.meta.url),
  'utf8',
);
const runtimeCatalogSource = await readFile(
  new URL('../api/services/world-regional-catalog-runtime.ts', import.meta.url),
  'utf8',
);
const authorityCatalog = JSON.parse(
  await readFile(
    new URL('../../config/world/world-regional-collections-v1.json', import.meta.url),
    'utf8',
  ),
);

test('Gate 4 route is GET-only, Owner-scoped and default-off', () => {
  assert.match(routeSource, /WORLD_GAMIFICATION_READ_ENABLED/);
  assert.match(routeSource, /NODE_ENV.*production/);
  assert.match(routeSource, /return 'HOLD'/);
  assert.match(routeSource, /app\.get\('\/'/);
  assert.doesNotMatch(routeSource, /app\.(post|put|patch|delete)\(/);
  assert.match(routeSource, /const ownerId = c\.get\('userId'\)/);
  assert.doesNotMatch(routeSource, /req\.(param|query)\(['"]owner/i);
  assert.doesNotMatch(routeSource, /req\.json/);
});

test('Gate 4 route is mounted only after the global authenticated /api boundary', () => {
  const auth = indexSource.indexOf("app.use('/api/*', authMiddleware)");
  const mount = indexSource.indexOf("app.route('/api/world-gamification'");
  assert.ok(auth >= 0, 'global auth middleware must exist');
  assert.ok(mount > auth, 'World gamification route must mount after auth middleware');
});

test('public read model omits raw source identifiers and forbidden score/location surfaces', () => {
  assert.match(readSource, /whyEarned/);
  assert.doesNotMatch(readSource, /sourceRef:\s*item\.sourceRef/);

  const publicBlock = readSource.match(
    /export interface WorldGamificationPublicSnapshot \{([\s\S]*?)\n\}/,
  );
  assert.ok(publicBlock);
  assert.doesNotMatch(
    publicBlock[1],
    /xp|level|rank|streak|eli|sensor|dog|health|relationship|latitude|longitude|address|geofence/i,
  );
});

test('runtime regional catalogue stays exactly aligned with machine-readable authority', async () => {
  const output = ts.transpileModule(runtimeCatalogSource, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const mod = await import(
    `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`,
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(mod.WORLD_REGIONAL_COLLECTION_CATALOG)),
    {
      version: authorityCatalog.version,
      status: authorityCatalog.status,
      selectionAuthority: authorityCatalog.selectionAuthority,
      exactLocationAccepted: authorityCatalog.exactLocationAccepted,
      automaticLocationReward: authorityCatalog.automaticLocationReward,
      collections: authorityCatalog.collections,
    },
  );
  assert.deepEqual(
    [...mod.WORLD_REGIONAL_COLLECTION_RULES],
    authorityCatalog.rules,
  );
});
