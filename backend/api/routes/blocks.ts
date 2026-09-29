import { Hono } from 'hono';

import { isCanonicalUserId } from '../services/auth-security.js';
import {
  BLOCK_ENFORCEMENT,
  drizzleUserBlockRepository,
  type UserBlockRepository,
} from '../services/user-blocks.js';

type BlockContext = { Variables: { userId: string } };

const BLOCKS_DATABASE_UNAVAILABLE = 'BLOCKS_DATABASE_UNAVAILABLE' as const;

/**
 * Canonical user-to-user blocks (WORLD-SOCIAL-01 / #594). The actor is always the
 * verified JWT subject; the payload only names the target. Responses disclose
 * where the block is enforced today instead of implying it hides the person.
 */
export function createBlockRoutes(repository: UserBlockRepository) {
  const routes = new Hono<BlockContext>();
  routes.use('*', async (c, next) => { c.header('Cache-Control', 'private, no-store'); await next(); });
  routes.onError((_error, c) => c.json({ error: 'Blocks are temporarily unavailable', code: BLOCKS_DATABASE_UNAVAILABLE }, 503));

  routes.post('/', async (c) => {
    const body = await c.req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some((key) => key !== 'targetUserId')
      || !isCanonicalUserId(body['targetUserId'])) {
      return c.json({ error: 'Body must be exactly { targetUserId: <user UUID> }', code: 'INVALID_BLOCK_REQUEST' }, 400);
    }
    const actor = c.get('userId').toLowerCase();
    const target = String(body['targetUserId']).toLowerCase();
    if (target === actor) return c.json({ error: 'A user cannot block themselves', code: 'INVALID_BLOCK_REQUEST' }, 400);

    const { result, block } = await repository.create(actor, target);
    if (result === 'target_not_found' || !block) return c.json({ error: 'User not found', code: 'BLOCK_TARGET_NOT_FOUND' }, 404);
    return c.json({ block, enforcement: BLOCK_ENFORCEMENT }, result === 'created' ? 201 : 200);
  });

  routes.get('/', async (c) => c.json({
    blocks: await repository.list(c.get('userId').toLowerCase()),
    enforcement: BLOCK_ENFORCEMENT,
  }));

  routes.delete('/:targetUserId', async (c) => {
    const target = c.req.param('targetUserId');
    if (!isCanonicalUserId(target)) return c.json({ error: 'Invalid user id', code: 'INVALID_BLOCK_REQUEST' }, 400);
    // Idempotent: unblocking someone who is not blocked is not an error and reveals nothing.
    await repository.remove(c.get('userId').toLowerCase(), target.toLowerCase());
    return c.body(null, 204);
  });

  return routes;
}

export const blocks = createBlockRoutes(drizzleUserBlockRepository());
