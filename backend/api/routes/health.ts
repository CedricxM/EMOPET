import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HealthEntryCreateSchema } from '@emopet/shared';

import { requireDogOwnership } from '../middleware/authorization.js';

const health = new Hono();

export const HEALTH_PERSISTENCE_CODE = 'HEALTH_PERSISTENCE_NOT_READY' as const;

function persistenceUnavailable(
  c: { json: (value: unknown, status?: number) => Response },
  operation: 'list_entries' | 'create_entry' | 'list_reminders',
): Response {
  return c.json({
    error: 'Health journal persistence is not available on the Product V1 backend authority.',
    code: HEALTH_PERSISTENCE_CODE,
    operation,
    retryable: false,
    maturity: 'NOT_IMPLEMENTED',
  }, 503);
}

health.get('/:dogId', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;
  return persistenceUnavailable(c, 'list_entries');
});

health.post('/', zValidator('json', HealthEntryCreateSchema), async (c) => {
  const body = c.req.valid('json');
  const denied = await requireDogOwnership(c, body.dogId);
  if (denied) return denied;
  return persistenceUnavailable(c, 'create_entry');
});

health.get('/:dogId/reminders', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;
  return persistenceUnavailable(c, 'list_reminders');
});

export { health };
