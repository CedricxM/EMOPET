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

function getUserId(c: unknown): string {
  return String((c as { get: (key: string) => unknown }).get('userId') ?? 'demo-user');
}

featureProgress.get('/', async (c) => {
  return c.json(buildFeatureProgress(getUserId(c)));
});

featureProgress.get('/consents', async (c) => {
  return c.json({
    userId: getUserId(c),
    consents: getConsentRecordsForUser(getUserId(c)),
  });
});

featureProgress.post('/consents', zValidator('json', ConsentCreateSchema), async (c) => {
  const body = c.req.valid('json');
  return c.json(recordConsent(getUserId(c), body), 201);
});

featureProgress.post('/waitlist', zValidator('json', WaitlistJoinSchema), async (c) => {
  const body = c.req.valid('json');
  return c.json(joinFeatureWaitlist(getUserId(c), body), 201);
});

export { featureProgress };
