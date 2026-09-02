import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { PresenceEventCreateSchema, SensorSummaryCreateSchema } from '@emopet/shared';

import { requireDogOwnership } from '../middleware/authorization.js';
import { appendPresenceEvents, getPresenceEventsForDog } from '../services/presence.js';

const sensors = new Hono();

sensors.post('/summaries', zValidator('json', SensorSummaryCreateSchema), async (c) => {
  // TODO: ingest hourly sensor summary from mobile app
  const body = c.req.valid('json');
  const denied = await requireDogOwnership(c, body.dogId);
  if (denied) return denied;
  return c.json({ message: 'ingested', dogId: body.dogId }, 201);
});

sensors.get('/summaries/:dogId', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  const range = c.req.query('range') ?? '24h';
  // TODO: return sensor summaries for dog within time range
  return c.json({ dogId, range, summaries: [] });
});

sensors.get('/eli/:dogId', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  // No authoritative ELI producer/read path exists yet. A normal 200/null
  // response would be indistinguishable from an authoritative query that
  // succeeded and found no result.
  return c.json({ error: 'eli_runtime_not_implemented', dogId }, 501);
});

sensors.get('/eli/:dogId/history', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  // Keep availability truth explicit until a real producer + persistence
  // contract can distinguish NOT_IMPLEMENTED, UNAVAILABLE and NONE_FOUND.
  return c.json({ error: 'eli_runtime_not_implemented', dogId }, 501);
});

sensors.get('/baseline/:dogId', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  // TODO: return baseline state / progress
  return c.json({ dogId, baseline: null });
});

sensors.post('/presence/:dogId/events', zValidator('json', PresenceEventCreateSchema), async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  const body = c.req.valid('json');
  if (body.dogId !== dogId) {
    return c.json({ error: 'dog_id_mismatch' }, 400);
  }
  appendPresenceEvents(dogId, [{
    phoneSeen: body.phoneSeen,
    timestamp: body.timestamp,
    rssi: body.rssi,
    source: body.source,
  }]);
  return c.json({ message: 'presence_event_recorded', dogId }, 201);
});

sensors.get('/presence/:dogId/events', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  const days = Number(c.req.query('days') ?? '14');
  const since = new Date();
  since.setDate(since.getDate() - days);
  return c.json({ dogId, events: getPresenceEventsForDog(dogId, since) });
});

export { sensors };
