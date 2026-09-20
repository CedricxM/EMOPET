import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ConsentCreateSchema, WaitlistJoinSchema } from '@emopet/shared';

const featureProgress = new Hono();

export const FEATURE_PROGRESS_PERSISTENCE_CODE =
  'FEATURE_PROGRESS_PERSISTENCE_NOT_READY' as const;

function getAuthenticatedUserId(c: unknown): string | null {
  const value = (c as { get: (key: string) => unknown }).get('userId');
  if (typeof value !== 'string') return null;
  const userId = value.trim();
  return userId.length > 0 ? userId : null;
}

function requireAuthenticatedUser(
  c: { json: (value: unknown, status?: number) => Response } & unknown,
): string | Response {
  const userId = getAuthenticatedUserId(c);
  if (userId) return userId;
  return c.json({
    error: 'Authentication required.',
    code: 'AUTHENTICATION_REQUIRED',
  }, 401);
}

function persistenceUnavailable(
  c: { json: (value: unknown, status?: number) => Response },
  operation: 'read_feature_progress' | 'list_consents' | 'record_consent' | 'join_waitlist',
): Response {
  return c.json({
    error: 'Feature progress, consent and waitlist state do not yet have durable Product V1 persistence authority.',
    code: FEATURE_PROGRESS_PERSISTENCE_CODE,
    operation,
    retryable: false,
    maturity: 'NOT_IMPLEMENTED',
  }, 503);
}

// The in-memory feature-progress service remains prototype/test evidence only.
// Release routes fail closed until consent/waitlist state is durable and bound
// to a real authenticated principal.
featureProgress.get('/', async (c) => {
  const userId = requireAuthenticatedUser(c);
  if (typeof userId !== 'string') return userId;
  return persistenceUnavailable(c, 'read_feature_progress');
});

featureProgress.get('/consents', async (c) => {
  const userId = requireAuthenticatedUser(c);
  if (typeof userId !== 'string') return userId;
  return persistenceUnavailable(c, 'list_consents');
});

featureProgress.post('/consents', zValidator('json', ConsentCreateSchema), async (c) => {
  const userId = requireAuthenticatedUser(c);
  if (typeof userId !== 'string') return userId;
  return persistenceUnavailable(c, 'record_consent');
});

featureProgress.post('/waitlist', zValidator('json', WaitlistJoinSchema), async (c) => {
  const userId = requireAuthenticatedUser(c);
  if (typeof userId !== 'string') return userId;
  return persistenceUnavailable(c, 'join_waitlist');
});

export { featureProgress };
