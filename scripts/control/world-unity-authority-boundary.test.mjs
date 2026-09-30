import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const unityRoot = path.join(root, 'unity', 'world');

async function read(relative) {
  return readFile(path.join(unityRoot, relative), 'utf8');
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

test('Unity World spike pins the approved LTS editor and canonical backend boundary', async () => {
  const version = await read('ProjectSettings/ProjectVersion.txt');
  const client = await read('Assets/World/Transport/WorldBackendClient.cs');

  assert.match(version, /m_EditorVersion: 6000\.3\.25f1/);
  assert.match(client, /private const string Mount = "\/api\/world-spike";/);
});

test('Unity project does not install or reference a direct Nakama client SDK', async () => {
  const manifest = JSON.parse(await read('Packages/manifest.json'));
  const dependencyNames = Object.keys(manifest.dependencies ?? {}).join('\n').toLowerCase();
  assert.doesNotMatch(dependencyNames, /nakama|heroiclabs/);

  const assets = (await walk(path.join(unityRoot, 'Assets')))
    .filter((file) => /\.(cs|asmdef)$/.test(file));

  for (const file of assets) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(
      source,
      /Nakama(Client|Session|Socket)|HeroicLabs|heroiclabs|authenticateCustom|authenticateTokenGenerate/,
      `direct Nakama authority leaked into ${path.relative(root, file)}`,
    );
  }
});

test('first-slice Unity chat remains preset-only', async () => {
  const presets = await read('Assets/World/Core/WorldPresets.cs');
  const client = await read('Assets/World/Transport/WorldBackendClient.cs');

  for (const id of [
    'salut',
    'par-ici',
    'trouve',
    'pret',
    'attends',
    'bien-joue',
    'merci',
    'je-quitte',
    'pas-maintenant',
  ]) {
    assert.ok(presets.includes(`"${id}"`), `missing approved preset ${id}`);
  }

  assert.doesNotMatch(client, /chat\.send_text|SendText|FreeText/i);
  assert.doesNotMatch(client, /public\s+string\s+text\s*;/, 'Unity first slice must not deserialize free-text chat content');
  assert.match(client, /WorldPresets\.IsAllowed\(presetId\)/);
});

test('Core stays engine-independent and session defaults to invisible presence', async () => {
  const coreAsm = JSON.parse(await read('Assets/World/Core/Emopet.World.Core.asmdef'));
  const state = await read('Assets/World/Core/WorldSessionStateMachine.cs');

  assert.equal(coreAsm.noEngineReferences, true);
  assert.match(
    state,
    /BootstrapConnected\(\)[\s\S]*State = WorldSessionState\.ConnectedInvisible;/,
  );
});
