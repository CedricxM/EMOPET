import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HealthEntryCreateSchema } from '@emopet/shared';

import { requireDogOwnership } from '../middleware/authorization.js';

const health = new Hono();

health.get('/:dogId', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  // TODO: return health journal entries for dog
  return c.json({ dogId, entries: [] });
});

health.post('/', zValidator('json', HealthEntryCreateSchema), async (c) => {
  const body = c.req.valid('json');
  const denied = await requireDogOwnership(c, body.dogId);
  if (denied) return denied;

  // Durable health-journal persistence is not implemented yet. Do not
  // acknowledge creation, persistence or enqueue success until a real writer exists.
  return c.json({
    error: 'health_entry_persistence_not_implemented',
    dogId: body.dogId,
  }, 501);
});

health.get('/:dogId/reminders', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  // TODO: return upcoming health reminders (nextDueDate)
  return c.json({ dogId, reminders: [] });
});

export { health };
