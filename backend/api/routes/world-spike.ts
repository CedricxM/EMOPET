/** SPIKE / NOT PRODUCTION AUTHORITY. No product runtime client is connected. */
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { decodeJwt } from 'jose';
import { authMiddleware } from '../middleware/auth.js';
import { WorldRealtimeAdapter } from '../services/world-spike/adapter.js';
import { NakamaTransport } from '../services/world-spike/nakama.js';
import { WorldError, type WorldBlockPolicy, type WorldCommand } from '../services/world-spike/contracts.js';
import { drizzleUserBlockRepository } from '../services/user-blocks.js';
import {
  WORLD_REPORT_REASONS, WorldReportError, drizzleWorldReportSink, type WorldReportSink,
} from '../services/world-reports.js';
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
/** Strict report body; the reporter is never taken from the payload. */
export function parseWorldReport(value: unknown) {
  const body = object(value);
  const reason = body['reason'];
  if (typeof reason !== 'string' || !(WORLD_REPORT_REASONS as readonly string[]).includes(reason)) throw new WorldError('invalid_request');
  const details = body['details'];
  if (details !== undefined && (typeof details !== 'string' || details.length > 500)) throw new WorldError('invalid_request');
  if (body['kind'] === 'world_user') {
    exact(body, ['kind', 'targetUserId', 'reason', 'details']);
    if (!isCanonicalUserId(body['targetUserId'])) throw new WorldError('invalid_request');
    return { kind: 'world_user' as const, targetUserId: body['targetUserId'] as string, reason: reason as (typeof WORLD_REPORT_REASONS)[number], details: details as string | undefined };
  }
  if (body['kind'] === 'world_message') {
    exact(body, ['kind', 'senderId', 'messageId', 'reason', 'details']);
    if (typeof body['senderId'] !== 'string' || !body['senderId'] || body['senderId'].length > 100 || !isCanonicalUserId(body['messageId'])) {
      throw new WorldError('invalid_request');
    }
    return { kind: 'world_message' as const, senderId: body['senderId'] as string, messageId: body['messageId'] as string,
      reason: reason as (typeof WORLD_REPORT_REASONS)[number], details: details as string | undefined };
  }
  throw new WorldError('invalid_request');
}
export function createWorldSpikeRoutes(adapter: WorldRealtimeAdapter, reports?: WorldReportSink) {
  const app = new Hono<{ Variables: { userId: string } }>();
  // Also protect standalone mounting/test harnesses. No owner header or fallback identity.
  app.use('*', authMiddleware);
  app.use('*', bodyLimit({ maxSize: 4096, onError: c => c.json({ error: 'payload_too_large' }, 413) }));
  app.use('*', async (c, next) => { c.header('Cache-Control', 'no-store'); await next(); });
  app.onError((error, c) => {
    const code = error instanceof WorldError ? error.code : 'unavailable';
    const status = code === 'invalid_request' ? 400 : code === 'invalid_session' ? 401 : code === 'forbidden' ? 403
      : code === 'unreachable' ? 404 : code === 'busy' ? 409 : 503;
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
  app.get('/sessions/:handle/events', async c => c.json(await adapter.events(c.get('userId'), c.req.param('handle'))));
  app.post('/sessions/:handle/reports', async c => {
    const report = parseWorldReport(await c.req.json().catch(() => null));
    const { reporter, subject } = adapter.reportSubject(c.get('userId'), c.req.param('handle'), report);
    // Without the canonical moderation queue there is nowhere truthful to file a report.
    if (!reports) throw new WorldError('unavailable');
    try {
      const created = await reports.create({ reporterUserId: reporter, subjectUserId: subject, kind: report.kind,
        ...(report.kind === 'world_message' ? { messageId: report.messageId } : {}),
        reason: report.reason, ...(report.details ? { details: report.details } : {}) });
      return c.json({ report: created }, 201);
    } catch (error) {
      if (error instanceof WorldReportError) throw new WorldError(error.code === 'subject_not_found' ? 'unreachable' : 'invalid_request');
      throw new WorldError('unavailable');
    }
  });
  app.delete('/sessions/:handle', c => { adapter.disconnect(c.get('userId'), c.req.param('handle')); return c.body(null, 204); });
  return app;
}
export function configuredWorldSpike(env: NodeJS.ProcessEnv = process.env,
  blocks: WorldBlockPolicy = drizzleUserBlockRepository(), reports: WorldReportSink = drizzleWorldReportSink()) {
  if (env['WORLD_NAKAMA_SPIKE_ENABLED'] !== 'true') return null;
  if (!['development', 'test'].includes(env['NODE_ENV'] ?? '')) throw new Error('World spike is local development/test only');
  const users = (env['WORLD_SPIKE_TEST_USER_IDS'] ?? '').split(',').map(value => value.trim().toLowerCase());
  if (!users.length || users.length > 10 || users.some(id => !isCanonicalUserId(id))) throw new Error('Configure 1-10 synthetic test user UUIDs');
  if (typeof globalThis.WebSocket !== 'function') throw new Error('World spike requires Node >=22 with WebSocket');
  const adapter = new WorldRealtimeAdapter(new NakamaTransport(env['NAKAMA_URL'] ?? 'http://127.0.0.1:7350',
    env['NAKAMA_HTTP_KEY'] ?? ''), new Set(users), blocks);
  return createWorldSpikeRoutes(adapter, reports);
}
