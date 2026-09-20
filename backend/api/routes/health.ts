import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HealthEntryCreateSchema } from '@emopet/shared';

import { requireDogOwnership } from '../middleware/authorization.js';

const health = new Hono();

health.get('/:dogId', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  // No authoritative journal reader is wired on this route yet. Returning an
  // empty array would falsely claim that the source was queried successfully.
  return c.json({ error: 'health_entry_read_not_implemented', dogId }, 501);
});

health.post('/', zValidator('json', HealthEntryCreateSchema), async (c) => {
  const body = c.req.valid('json');
  const denied = await requireDogOwnership(c, body.dogId);
  if (denied) return denied;

  return c.json({ error: 'health_entry_persistence_not_implemented', dogId: body.dogId }, 501);
});

health.get('/:dogId/reminders', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  // Reminder scheduling/read semantics are not implemented. Do not represent
  // that maturity gap as a successful empty reminder query.
  return c.json({ error: 'health_reminder_read_not_implemented', dogId }, 501);
});

export { health };
