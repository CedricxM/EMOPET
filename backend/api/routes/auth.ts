import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { RegisterSchema, LoginSchema } from '@emopet/shared';

const auth = new Hono();

auth.post('/register', zValidator('json', RegisterSchema), async (c) => {
  // TODO: implement registration with password hashing
  const body = c.req.valid('json');
  return c.json({ message: 'register', email: body.email }, 201);
});

auth.post('/login', zValidator('json', LoginSchema), async (c) => {
  // TODO: implement login with password verification + JWT
  const body = c.req.valid('json');
  return c.json({ message: 'login', email: body.email });
});

auth.post('/refresh', async (c) => {
  // TODO: implement token refresh
  return c.json({ message: 'refresh' });
});

export { auth };
