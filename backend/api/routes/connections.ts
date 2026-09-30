import { Hono, type Context } from 'hono';

import { isCanonicalUserId } from '../services/auth-security.js';
import {
  drizzleSocialConnectionRepository,
  type SocialConnectionRepository,
} from '../services/social-connections.js';

type ConnectionContext = { Variables: { userId: string } };

const INVALID = 'INVALID_CONNECTION_REQUEST' as const;

/**
 * Canonical social connections (WORLD-SOCIAL-02 / #595, #46 trust ladder). The actor is always
 * the verified JWT subject. Transitions: #595 issuecomment-5866924308.
 *
 * Silence is part of the contract: a pending request and a declined one answer the same
 * (202 pending), a decline answers 204 whatever happened, and a person blocked either way
 * answers like an unknown user (404).
 */
export function createConnectionRoutes(repository: SocialConnectionRepository) {
  const routes = new Hono<ConnectionContext>();
  routes.use('*', async (c, next) => { c.header('Cache-Control', 'private, no-store'); await next(); });
  routes.onError((_error, c) => c.json({ error: 'Connections are temporarily unavailable', code: 'CONNECTIONS_DATABASE_UNAVAILABLE' }, 503));

  const actor = (c: Context<ConnectionContext>) => c.get('userId').toLowerCase();
  /** The other person named in the path: a canonical id that is not the actor. */
  const other = (c: Context<ConnectionContext>) => {
    const id = c.req.param('userId');
    return id && isCanonicalUserId(id) && id.toLowerCase() !== actor(c) ? id.toLowerCase() : null;
  };
  const exactBody = async (c: Context<ConnectionContext>, key: string) => {
    const body = await c.req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !(key in body)) return null;
    return body;
  };
  const invalid = (c: Context<ConnectionContext>) => c.json({ error: 'Invalid connection request', code: INVALID }, 400);

  routes.get('/', async (c) => c.json(await repository.list(actor(c))));

  routes.post('/requests', async (c) => {
    const body = await exactBody(c, 'targetUserId');
    const target = body?.['targetUserId'];
    if (!isCanonicalUserId(target) || String(target).toLowerCase() === actor(c)) return invalid(c);
    const result = await repository.request(actor(c), String(target).toLowerCase());
    if (result === 'target_not_found') return c.json({ error: 'User not found', code: 'CONNECTION_TARGET_NOT_FOUND' }, 404);
    return result === 'connected' ? c.json({ status: 'connected' }, 200) : c.json({ status: 'pending' }, 202);
  });

  routes.post('/requests/:userId/accept', async (c) => {
    const requester = other(c);
    if (!requester) return invalid(c);
    const result = await repository.accept(actor(c), requester);
    return result === 'connected'
      ? c.json({ status: 'connected' }, 200)
      : c.json({ error: 'No pending request', code: 'CONNECTION_REQUEST_NOT_FOUND' }, 404);
  });

  routes.post('/requests/:userId/decline', async (c) => {
    const requester = other(c);
    if (!requester) return invalid(c);
    await repository.decline(actor(c), requester);
    return c.body(null, 204);
  });

  routes.delete('/requests/:userId', async (c) => {
    const target = other(c);
    if (!target) return invalid(c);
    await repository.cancel(actor(c), target);
    return c.body(null, 204);
  });

  routes.delete('/:userId', async (c) => {
    const peer = other(c);
    if (!peer) return invalid(c);
    // One action, never penalised, idempotent.
    await repository.remove(actor(c), peer);
    return c.body(null, 204);
  });

  routes.put('/:userId/trust', async (c) => {
    const peer = other(c);
    const body = await exactBody(c, 'trusted');
    if (!peer || typeof body?.['trusted'] !== 'boolean') return invalid(c);
    const trusted = body['trusted'] as boolean;
    const result = await repository.setTrust(actor(c), peer, trusted);
    return result === 'ok'
      ? c.json({ state: trusted ? 'TRUSTED' : 'CONNECTED' }, 200)
      : c.json({ error: 'Not connected', code: 'CONNECTION_NOT_FOUND' }, 404);
  });

  return routes;
}

export const connections = createConnectionRoutes(drizzleSocialConnectionRepository());
