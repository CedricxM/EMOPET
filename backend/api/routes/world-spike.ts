/** SPIKE / NOT PRODUCTION AUTHORITY. No product runtime client is connected. */
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { decodeJwt } from 'jose';
import { authMiddleware } from '../middleware/auth.js';
import { WorldRealtimeAdapter } from '../services/world-spike/adapter.js';
import { NakamaTransport } from '../services/world-spike/nakama.js';
import { WorldError, type WorldCommand } from '../services/world-spike/contracts.js';
import { isCanonicalUserId } from '../services/auth-security.js';

const fields: Record<WorldCommand['op'], string[]> = {
  'friends.list': [], 'friends.request': ['targetUserId'], 'friends.accept': ['targetUserId'],
  'groups.create': ['name'], 'groups.list': [], 'groups.join': ['groupId'], 'groups.leave': ['groupId'],
  'presence.follow': ['targetUserId'], 'presence.update': ['status'], 'chat.join': ['groupId'],
  'chat.send': ['groupId', 'text'],
};
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WorldError('invalid_request');
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some(key => !keys.includes(key))) throw new WorldError('invalid_request');
}
export function parseWorldCommand(value: unknown): WorldCommand {
  const body = object(value);
  if (typeof body['op'] !== 'string' || !Object.hasOwn(fields, body['op'])) throw new WorldError('invalid_request');
  const keys = fields[body['op'] as WorldCommand['op']];
  exact(body, ['op', ...keys]);
  for (const key of keys) {
    const value = body[key];
    if (typeof value !== 'string' || !value.trim() || value.length > (key === 'text' ? 1000 : 100)) throw new WorldError('invalid_request');
    if ((key === 'groupId' || key === 'targetUserId') && !isCanonicalUserId(value)) throw new WorldError('invalid_request');
  }
  if (body['op'] === 'presence.update' && !['online', 'away'].includes(String(body['status']))) throw new WorldError('invalid_request');
  return body as unknown as WorldCommand;
}
export function createWorldSpikeRoutes(adapter: WorldRealtimeAdapter) {
  const app = new Hono<{ Variables: { userId: string } }>();
  // Also protect standalone mounting/test harnesses. No owner header or fallback identity.
  app.use('*', authMiddleware);
  app.use('*', bodyLimit({ maxSize: 4096, onError: c => c.json({ error: 'payload_too_large' }, 413) }));
  app.use('*', async (c, next) => { c.header('Cache-Control', 'no-store'); await next(); });
  app.onError((error, c) => {
    const code = error instanceof WorldError ? error.code : 'unavailable';
    const status = code === 'invalid_request' ? 400 : code === 'invalid_session' ? 401 : code === 'forbidden' ? 403 : code === 'busy' ? 409 : 503;
    return c.json({ error: code, state: status === 503 ? 'degraded' : 'rejected' }, status);
  });
  app.post('/bootstrap', async c => {
    const body = object(await c.req.json().catch(() => null));
    exact(body, ['previousHandle']);
    if (body['previousHandle'] !== undefined && !isCanonicalUserId(body['previousHandle'])) throw new WorldError('invalid_request');
    // Claims decoded only AFTER canonical middleware verified this exact bearer token.
    const exp = decodeJwt(c.req.header('Authorization')!.slice(7)).exp;
    if (!exp) throw new WorldError('invalid_session');
    return c.json(await adapter.bootstrap(c.get('userId'), exp * 1000, body['previousHandle'] as string | undefined));
  });
  app.post('/sessions/:handle/commands', async c => c.json({ result: await adapter.execute(c.get('userId'),
    c.req.param('handle'), parseWorldCommand(await c.req.json().catch(() => null))) }));
  app.get('/sessions/:handle/events', c => c.json(adapter.events(c.get('userId'), c.req.param('handle'))));
  app.delete('/sessions/:handle', c => { adapter.disconnect(c.get('userId'), c.req.param('handle')); return c.body(null, 204); });
  return app;
}
export function configuredWorldSpike(env: NodeJS.ProcessEnv = process.env) {
  if (env['WORLD_NAKAMA_SPIKE_ENABLED'] !== 'true') return null;
  if (!['development', 'test'].includes(env['NODE_ENV'] ?? '')) throw new Error('World spike is local development/test only');
  const users = (env['WORLD_SPIKE_TEST_USER_IDS'] ?? '').split(',').map(value => value.trim().toLowerCase());
  if (!users.length || users.length > 10 || users.some(id => !isCanonicalUserId(id))) throw new Error('Configure 1-10 synthetic test user UUIDs');
  if (typeof globalThis.WebSocket !== 'function') throw new Error('World spike requires Node >=22 with WebSocket');
  const adapter = new WorldRealtimeAdapter(new NakamaTransport(env['NAKAMA_URL'] ?? 'http://127.0.0.1:7350',
    env['NAKAMA_HTTP_KEY'] ?? ''), new Set(users));
  return createWorldSpikeRoutes(adapter);
}
