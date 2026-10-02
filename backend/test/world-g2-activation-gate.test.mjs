import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = fileURLToPath(new URL('../', import.meta.url));
const repoRoot = path.resolve(backendRoot, '..');

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(repoRoot, relativePath), 'utf8'));
}

async function readText(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

test('WORLD-G2 activation gate stays fail-closed while mandatory authorities are open', async () => {
  const [gate, privacy, sources, web, unity] = await Promise.all([
    readJson('config/world/world-g2-activation-gate-v1.json'),
    readJson('config/world/world-g2-privacy-decision-packet-v1.json'),
    readJson('config/world/world-progression-source-readiness-v1.json'),
    readJson('config/world/world-gate5b-web-read-continuity-v1.json'),
    readJson('config/world/world-gate5b-unity-read-continuity-v1.json'),
  ]);

  assert.equal(gate.status, 'BLOCKED_NOT_PRODUCTION_AUTHORITY');
  assert.equal(gate.productionActivationAuthorized, false);
  assert.equal(gate.productionWriteAuthority, false);
  assert.equal(gate.runtimeCutoverAuthorized, false);

  assert.equal(privacy.productionAuthority, false);
  assert.equal(privacy.privacyLegalAuthority, false);
  assert.equal(privacy.claims.privacyApproved, false);
  assert.ok(privacy.decisions.every((decision) => decision.approved === false));

  const readiness = Object.values(sources.events).map((event) => event.readiness);
  assert.equal(readiness.filter((value) => value === 'READY_CANONICAL_VERIFIER_IMPLEMENTED').length, 1);
  assert.ok(readiness.some((value) => value.startsWith('BLOCKED_')));
  assert.equal(sources.defaultDecision, 'DENY');

  assert.equal(web.activated, false);
  assert.equal(unity.activated, false);
  assert.equal(unity.editorEvidence.requiredEditor, '6000.3.25f1');
  assert.equal(
    unity.editorEvidence.requiredTest,
    'Emopet.World.Tests.WorldGamificationReadClientTests',
  );
  assert.equal(unity.editorEvidence.recorded, false);
  assert.equal(unity.editorEvidence.result, null);

  assert.deepEqual(
    [...gate.blockers].sort(),
    [
      'PRIVACY_HUMAN_DECISIONS_NOT_APPROVED',
      'CANONICAL_SOURCE_VERIFIERS_INCOMPLETE',
      'WEB_RUNTIME_CUTOVER_NOT_APPROVED',
      'UNITY_EDITOR_EVIDENCE_NOT_RECORDED',
      'UNITY_RUNTIME_CUTOVER_NOT_APPROVED',
    ].sort(),
  );
});

test('merged client foundations remain read-only and dormant on current main', async () => {
  const [
    backendRoute,
    webClient,
    webTest,
    unityClient,
    unityTest,
    unityBoundary,
  ] = await Promise.all([
    readText('backend/api/routes/world-gamification.ts'),
    readText('apps/web/lib/world-gamification-read.ts'),
    readText('apps/web/lib/__tests__/world-gamification-read.test.ts'),
    readText('unity/world/Assets/World/Transport/WorldGamificationReadClient.cs'),
    readText('unity/world/Assets/World/Tests/EditMode/WorldGamificationReadClientTests.cs'),
    readText('scripts/control/world-unity-authority-boundary.test.mjs'),
  ]);

  assert.match(backendRoute, /return 'HOLD'/);
  assert.doesNotMatch(backendRoute, /app\.(post|put|patch|delete)\(/);

  assert.match(webClient, /GET/);
  assert.doesNotMatch(webClient, /localStorage|sessionStorage/);
  assert.match(webTest, /activates Gate 5A before an explicit cutover decision/);

  assert.match(unityClient, /UnityWebRequest/);
  assert.doesNotMatch(unityClient, /NakamaClient|HeroicLabs|authenticateCustom/);
  assert.match(unityTest, /WorldGamificationReadClientTests/);
  assert.match(unityBoundary, /WorldGamificationReadClient/);
});

test('Unity read client is not referenced by scene or runtime integration files', async () => {
  const worldRoot = path.join(repoRoot, 'unity', 'world', 'Assets', 'World');
  const disallowedExtensions = new Set(['.unity', '.prefab']);

  async function walk(dir) {
    const out = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...await walk(full));
      else out.push(full);
    }
    return out;
  }

  const files = await walk(worldRoot);
  const offenders = [];
  for (const full of files) {
    const rel = path.relative(repoRoot, full).replaceAll('\\', '/');
    if (
      rel.endsWith('WorldGamificationReadClient.cs')
      || rel.endsWith('WorldGamificationReadClientTests.cs')
      || rel.endsWith('.meta')
    ) continue;

    const ext = path.extname(full).toLowerCase();
    if (!disallowedExtensions.has(ext) && ext !== '.cs') continue;

    const source = await readFile(full, 'utf8');
    if (source.includes('WorldGamificationReadClient')) offenders.push(rel);
  }

  assert.deepEqual(offenders, []);
});
