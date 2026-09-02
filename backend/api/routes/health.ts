import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HealthEntryCreateSchema } from '@emopet/shared';

import { requireDogOwnership } from '../middleware/authorization.js';

const health = new Hono();

health.get('/:dogId', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  // No authoritative route reader is wired yet. Do not represent an
  // unimplemented read as a successful query that happened to find no entries.
  return c.json({
    error: 'health_entry_read_not_implemented',
    dogId,
  }, 501);
});

health.post('/', zValidator('json', HealthEntryCreateSchema), async (c) => {
  const body = c.req.valid('json');
  const denied = await requireDogOwnership(c, body.dogId);
  if (denied) return denied;

  // Durable journal persistence is not implemented yet. Do not acknowledge
  // creation until the entry is written to the authoritative health_entries store.
  return c.json({
    error: 'health_entry_persistence_not_implemented',
    dogId: body.dogId,
  }, 501);
});

health.get('/:dogId/reminders', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  // The schema exposes nextDueDate, but reminder selection/scheduling semantics
  // are not implemented by this route. Do not turn that into an empty result.
  return c.json({
    error: 'health_reminder_read_not_implemented',
    dogId,
  }, 501);
});

export { health };
