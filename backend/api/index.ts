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
import { dataExport } from './routes/data-export.js';
import { blocks } from './routes/blocks.js';
import { connections } from './routes/connections.js';
import { internalSecurityAudit } from './routes/internal-security-audit.js';
import { internalSecurityAlertAck } from './routes/internal-security-alert-ack.js';
import { configuredWorldSpike } from './routes/world-spike.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { sharedAuthRateLimitMiddleware } from './middleware/shared-auth-rate-limit.js';
import { assertRuntimeDatabaseAuthority } from '../db/index.js';
import { assertEmailVerificationRuntimeConfiguration } from './services/auth-email-delivery.js';
import { assertAuthRateLimitRuntimeConfiguration } from './security/auth-rate-limit-store.js';

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
app.use('/api/auth/*', sharedAuthRateLimitMiddleware({ limit: 20, windowMs: 60_000, keyPrefix: 'auth' }));
app.use('/api/*', rateLimitMiddleware({ limit: 240, windowMs: 60_000, keyPrefix: 'api' }));

// ── Health Check ────────────────────────────────────────────────

app.get('/health', (c) => c.json({ status: 'ok', version: '1.0.0' }));

// ── Internal service routes ─────────────────────────────────────

// Service-authenticated, not user-authenticated. Must be mounted before the
// ordinary /api/* user JWT middleware and never reuse user access tokens.
app.route('/internal/security-audit', internalSecurityAudit);
app.route('/internal/security-alert-ack', internalSecurityAlertAck);

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
app.route('/api/data-export', dataExport);
app.route('/api/blocks', blocks);
app.route('/api/connections', connections);
const worldSpike = configuredWorldSpike();
if (worldSpike) app.route('/api/world-spike', worldSpike);

// ── Start Server ────────────────────────────────────────────────

if (process.env['NODE_ENV'] === 'production') {
  assertEmailVerificationRuntimeConfiguration();
  assertAuthRateLimitRuntimeConfiguration();
  await assertRuntimeDatabaseAuthority();
}

const port = Number(process.env['PORT'] ?? 3000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`EMOPET API running on http://localhost:${port}`);
});

export default app;
