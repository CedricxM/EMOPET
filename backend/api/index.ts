import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';

import { auth } from './routes/auth.js';
import { dogs } from './routes/dogs.js';
import { sensors } from './routes/sensors.js';
import { community } from './routes/community.js';
import { featureProgress } from './routes/feature-progress.js';
import { health } from './routes/health.js';
import { directory } from './routes/directory.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';

const app = new Hono();

function resolveCorsOrigin(): string {
  const origin = process.env['CORS_ORIGIN']?.trim();
  if (origin) return origin;
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('CORS_ORIGIN must be configured in production');
  }
  return '*';
}

// ── Global Middleware ────────────────────────────────────────────

app.use('*', logger());
app.use('*', cors({
  origin: resolveCorsOrigin(),
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
}));
app.use('/api/auth/*', rateLimitMiddleware({ limit: 20, windowMs: 60_000, keyPrefix: 'auth' }));
app.use('/api/*', rateLimitMiddleware({ limit: 240, windowMs: 60_000, keyPrefix: 'api' }));

// ── Health Check ────────────────────────────────────────────────

app.get('/health', (c) => c.json({ status: 'ok', version: '1.0.0' }));

// ── Public Routes ───────────────────────────────────────────────

app.route('/api/auth', auth);

// ── Protected Routes ────────────────────────────────────────────

app.use('/api/*', authMiddleware);
app.route('/api/dogs', dogs);
app.route('/api/sensors', sensors);
app.route('/api/community', community);
app.route('/api/feature-progress', featureProgress);
app.route('/api/health', health);
app.route('/api/directory', directory);

// ── Start Server ────────────────────────────────────────────────

const port = Number(process.env['PORT'] ?? 3000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`EMOPET API running on http://localhost:${port}`);
});

export default app;
