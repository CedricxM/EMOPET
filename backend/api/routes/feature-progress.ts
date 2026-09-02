import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ConsentCreateSchema, WaitlistJoinSchema } from '@emopet/shared';

import {
  buildFeatureProgress,
  getConsentRecordsForUser,
  joinFeatureWaitlist,
  recordConsent,
} from '../services/feature-progress.js';

const featureProgress = new Hono();

function getUserId(c: unknown): string | null {
  const userId = (c as { get: (key: string) => unknown }).get('userId');
  return typeof userId === 'string' && userId.trim() ? userId : null;
}

featureProgress.get('/', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ error: 'unauthorized' }, 401);
  return c.json(buildFeatureProgress(userId));
});

featureProgress.get('/consents', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

  return c.json({
    userId,
    consents: getConsentRecordsForUser(userId),
  });
});

featureProgress.post('/consents', zValidator('json', ConsentCreateSchema), async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

  const body = c.req.valid('json');
  return c.json(recordConsent(userId, body), 201);
});

featureProgress.post('/waitlist', zValidator('json', WaitlistJoinSchema), async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

  const body = c.req.valid('json');
  return c.json(joinFeatureWaitlist(userId, body), 201);
});

export { featureProgress };
