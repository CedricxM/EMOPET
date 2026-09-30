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

test('Unity leaves cancelled bootstrap recoverable instead of stuck bootstrapping', async () => {
  const coordinator = await read('Assets/World/Session/WorldSessionCoordinator.cs');

  assert.match(
    coordinator,
    /catch \(OperationCanceledException\)[\s\S]*stateMachine\.MarkDegraded\(\);/,
  );
});

test('Unity retries one fresh invisible bootstrap after a stale renewal handle', async () => {
  const coordinator = await read('Assets/World/Session/WorldSessionCoordinator.cs');

  assert.match(coordinator, /var previousHandle = Handle;/);
  assert.match(
    coordinator,
    /error\.Code == WorldErrorCode\.InvalidSession && !string\.IsNullOrEmpty\(previousHandle\)/,
  );
  assert.match(coordinator, /result = await backend\.BootstrapAsync\(null, cancellationToken\);/);
});

test('Unity rejects expired bootstrap sessions before connected state', async () => {
  const coordinator = await read('Assets/World/Session/WorldSessionCoordinator.cs');

  assert.match(
    coordinator,
    /DateTimeOffset\.UtcNow\.ToUnixTimeMilliseconds\(\)/,
  );
  assert.match(
    coordinator,
    /result\.expiresAt <= now/,
  );
});

test('Unity validates delivered World event shapes before exposing them', async () => {
  const coordinator = await read('Assets/World/Session/WorldSessionCoordinator.cs');

  assert.match(coordinator, /private static bool ValidEvents\(WorldEventsResult result\)/);
  assert.match(coordinator, /item\.type == "chat"/);
  assert.match(coordinator, /WorldPresets\.IsAllowed\(item\.value\.content\.preset\)/);
  assert.match(coordinator, /item\.type == "presence" \|\| item\.type == "channel-presence"/);
  assert.match(coordinator, /private static bool ValidPresenceRows\(WorldPresenceRowDto\[] rows\)/);
});

test('Unity fails closed on malformed successful World payloads', async () => {
  const coordinator = await read('Assets/World/Session/WorldSessionCoordinator.cs');

  assert.match(
    coordinator,
    /result == null \|\| result\.state != "connected" \|\| result\.events == null/,
  );
  assert.match(
    coordinator,
    /result == null \|\| result\.presence != "visible" \|\| result\.until <= 0/,
  );
  assert.match(
    coordinator,
    /WorldErrorCode\.Unavailable, 200/,
  );
});

test('Unity maps middleware auth/service status fallbacks to bounded World errors', async () => {
  const client = await read('Assets/World/Transport/WorldBackendClient.cs');

  assert.match(
    client,
    /401 => WorldErrorCode\.InvalidSession/,
  );
  assert.match(
    client,
    /503 => WorldErrorCode\.Unavailable/,
  );
});

test('Unity maps no-response transport failures to bounded unavailable state', async () => {
  const client = await read('Assets/World/Transport/WorldBackendClient.cs');
  const coordinator = await read('Assets/World/Session/WorldSessionCoordinator.cs');

  assert.match(
    client,
    /response\.StatusCode <= 0[\s\S]*WorldErrorCode\.Unavailable/,
  );
  assert.match(
    coordinator,
    /case WorldErrorCode\.Unavailable:[\s\S]*stateMachine\.MarkDegraded\(\);/,
  );
});

test('Unity never claims visibility/disconnect certainty after cancelled or unknown outcomes', async () => {
  const coordinator = await read('Assets/World/Session/WorldSessionCoordinator.cs');

  assert.match(
    coordinator,
    /ShowPresenceAsync[\s\S]*catch \(OperationCanceledException\)[\s\S]*stateMachine\.MarkDegraded\(\);/,
  );
  assert.match(
    coordinator,
    /DisconnectAsync[\s\S]*catch \(WorldBackendException\)[\s\S]*stateMachine\.MarkDegraded\(\);/,
  );
  assert.match(
    coordinator,
    /DisconnectAsync[\s\S]*catch \(OperationCanceledException\)[\s\S]*stateMachine\.MarkDegraded\(\);/,
  );
});

test('presence withdrawal never claims invisibility when no HTTP outcome is known', async () => {
  const coordinator = await read('Assets/World/Session/WorldSessionCoordinator.cs');

  assert.match(
    coordinator,
    /catch \(WorldBackendException error\) when \(error\.StatusCode > 0\)[\s\S]*ClearDisconnected\(\);/,
  );
  assert.match(
    coordinator,
    /catch \(WorldBackendException\)[\s\S]*stateMachine\.MarkDegraded\(\);/,
  );
  assert.match(
    coordinator,
    /catch \(OperationCanceledException\)[\s\S]*stateMachine\.MarkDegraded\(\);/,
  );
});

test('presence withdrawal clears the dead handle and closes the Unity session', async () => {
  const coordinator = await read('Assets/World/Session/WorldSessionCoordinator.cs');

  assert.match(
    coordinator,
    /HidePresenceAsync[\s\S]*finally[\s\S]*Handle = null;[\s\S]*ExpiresAtUnixMs = 0;[\s\S]*stateMachine\.Disconnect\(\);/,
  );
  assert.doesNotMatch(
    coordinator,
    /HidePresenceAsync[\s\S]{0,800}PresenceBecameInvisible\(\)/,
    'backend presence withdrawal closes the server session; Unity must not retain it as invisible',
  );
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
