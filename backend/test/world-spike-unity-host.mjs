/** SPIKE / NOT PRODUCTION AUTHORITY. Loopback-only Unity integration harness. */
import { randomBytes } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { WorldRealtimeAdapter } from '../dist/api/services/world-spike/adapter.js';
import { NakamaTransport } from '../dist/api/services/world-spike/nakama.js';
import { createWorldSpikeRoutes } from '../dist/api/routes/world-spike.js';
import { signAccessToken } from '../dist/api/middleware/auth.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Unity live harness refuses production.');
}

const nakamaUrl = new URL(process.env.NAKAMA_URL ?? 'http://127.0.0.1:7350');
if (nakamaUrl.protocol !== 'http:' || !['127.0.0.1', 'localhost', '::1'].includes(nakamaUrl.hostname)) {
  throw new Error('Unity live harness requires loopback HTTP Nakama.');
}
if (!process.env.NAKAMA_HTTP_KEY) {
  throw new Error('NAKAMA_HTTP_KEY is required from the ignored local spike env.');
}

const port = Number(process.env.WORLD_UNITY_HOST_PORT ?? '37651');
if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) {
  throw new Error('WORLD_UNITY_HOST_PORT must be an unprivileged TCP port.');
}

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(32).toString('hex');

const ids = (process.env.WORLD_SPIKE_TEST_USER_IDS ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
if (ids.length !== 2 || ids[0] === ids[1]) {
  throw new Error('Configure exactly two distinct synthetic WORLD_SPIKE_TEST_USER_IDS.');
}
const [a, b] = ids;

const blocked = new Set();
const blocks = {
  async isBlockedEitherWay(x, y) {
    return blocked.has(`${x}|${y}`) || blocked.has(`${y}|${x}`);
  },
};

const access = {
  eligible: new Set(ids),
  async isEligible(id) {
    return access.eligible.has(id);
  },
};

const pair = [a, b].sort().join('|');
const social = {
  connected: new Set([pair]),
  consent: new Set(),
  async isMutuallyConnected(x, y) {
    return social.connected.has([x, y].sort().join('|')) && !await blocks.isBlockedEitherWay(x, y);
  },
  async connectedPeers(userId) {
    return ids.filter((other) =>
      other !== userId &&
      social.connected.has([userId, other].sort().join('|')) &&
      !blocked.has(`${userId}|${other}`) &&
      !blocked.has(`${other}|${userId}`));
  },
  async hasPresenceConsent(userId) {
    return social.consent.has(userId);
  },
  async grantPresenceConsent(userId) {
    social.consent.add(userId);
  },
  async withdrawPresenceConsent(userId) {
    social.consent.delete(userId);
  },
};

const adapter = new WorldRealtimeAdapter(
  new NakamaTransport(nakamaUrl.toString().replace(/\/$/, ''), process.env.NAKAMA_HTTP_KEY),
  access,
  blocks,
  social,
);

const reportSink = {
  async create(input) {
    return {
      id: 'unity-live-harness',
      kind: input.kind,
      status: 'open',
      createdAt: new Date(),
    };
  },
};

const app = new Hono();
app.route('/api/world-spike', createWorldSpikeRoutes(adapter, reportSink));

const tokens = new Map(await Promise.all(ids.map(async (id) => [id, await signAccessToken(id)])));

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixturePath = path.join(repoRoot, 'unity', 'world', 'Temp', 'world-live-harness.json');
mkdirSync(path.dirname(fixturePath), { recursive: true });

const server = serve({
  fetch: app.fetch,
  hostname: '127.0.0.1',
  port,
});

await new Promise((resolve, reject) => {
  if (server.listening) {
    resolve();
    return;
  }
  server.once('listening', resolve);
  server.once('error', reject);
});

const fixture = {
  baseUrl: `http://127.0.0.1:${port}`,
  createdAtUnixMs: Date.now(),
  userAId: a,
  userBId: b,
  tokenA: tokens.get(a),
  tokenB: tokens.get(b),
};
writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, { mode: 0o600 });

console.log(`Unity World live harness ready at ${fixture.baseUrl}`);
console.log(`Synthetic fixture written to ${path.relative(repoRoot, fixturePath)} (tokens are not printed).`);
console.log('Keep this process running while the Unity live EditMode tests execute. Press Ctrl+C to stop.');

let closing = false;
function shutdown(exitCode = 0) {
  if (closing) return;
  closing = true;
  rmSync(fixturePath, { force: true });
  adapter.close();
  server.close(() => process.exit(exitCode));
  setTimeout(() => process.exit(exitCode), 2000).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
