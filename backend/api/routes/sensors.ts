import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { PresenceEventCreateSchema, SensorSummaryCreateSchema } from '@emopet/shared';

import { requireDogOwnership } from '../middleware/authorization.js';
import { appendPresenceEvents, getPresenceEventsForDog } from '../services/presence.js';

const sensors = new Hono();

sensors.post('/summaries', zValidator('json', SensorSummaryCreateSchema), async (c) => {
  const body = c.req.valid('json');
  const denied = await requireDogOwnership(c, body.dogId);
  if (denied) return denied;

  // Durable sensor-summary ingestion is not implemented yet. Do not acknowledge
  // persistence, acceptance or enqueue success until a real data-plane contract exists.
  return c.json({
    error: 'sensor_summary_ingestion_not_implemented',
    dogId: body.dogId,
  }, 501);
});

sensors.get('/summaries/:dogId', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  const range = c.req.query('range') ?? '24h';
  // No authoritative route reader is implemented yet. Do not turn that state
  // into a successful empty query result.
  return c.json({
    error: 'sensor_summary_read_not_implemented',
    dogId,
    range,
  }, 501);
});

sensors.get('/eli/:dogId', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  // TODO: return latest ELI state for dog
  return c.json({ dogId, eli: null });
});

sensors.get('/eli/:dogId/history', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  const range = c.req.query('range') ?? '7d';
  // TODO: return ELI history
  return c.json({ dogId, range, history: [] });
});

sensors.get('/baseline/:dogId', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  // Baseline persistence/projection exists elsewhere, but this route has no
  // authoritative reader and Guardian disclosure remains controlled separately.
  return c.json({
    error: 'baseline_read_not_implemented',
    dogId,
  }, 501);
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
