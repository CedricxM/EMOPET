import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { RegisterSchema, LoginSchema } from '@emopet/shared';

const auth = new Hono();

export const AUTH_BACKEND_NOT_READY_CODE = 'AUTH_BACKEND_NOT_READY' as const;

function authBackendUnavailable(
  c: { json: (value: unknown, status?: number) => Response },
  operation: 'register' | 'login' | 'refresh',
): Response {
  return c.json(
    {
      error: 'Authentication backend is not yet available on the Product V1 authority.',
      code: AUTH_BACKEND_NOT_READY_CODE,
      operation,
      retryable: false,
      maturity: 'NOT_IMPLEMENTED',
    },
    503,
  );
}

auth.post('/register', zValidator('json', RegisterSchema), async (c) => {
  return authBackendUnavailable(c, 'register');
});

auth.post('/login', zValidator('json', LoginSchema), async (c) => {
  return authBackendUnavailable(c, 'login');
});

auth.post('/refresh', async (c) => {
  return authBackendUnavailable(c, 'refresh');
});

export { auth };
