import { Hono } from 'hono';

import {
  readWorldGamificationSnapshot,
  type WorldGamificationPublicSnapshot,
} from '../services/world-gamification-read.js';

export type WorldGamificationReadMode =
  | 'DISABLED'
  | 'CONTROLLED_NON_PRODUCTION'
  | 'HOLD';

export type WorldGamificationReader = (input: {
  ownerId: string;
  regionCode?: string | null;
}) => Promise<WorldGamificationPublicSnapshot>;

export function worldGamificationReadMode(
  env: NodeJS.ProcessEnv = process.env,
): WorldGamificationReadMode {
  if (env['WORLD_GAMIFICATION_READ_ENABLED'] !== 'true') return 'DISABLED';
  if (env['NODE_ENV'] === 'production') return 'HOLD';
  if (env['NODE_ENV'] === 'development' || env['NODE_ENV'] === 'test') {
    return 'CONTROLLED_NON_PRODUCTION';
  }
  return 'HOLD';
}

export function createWorldGamificationReadRoutes(
  reader: WorldGamificationReader = readWorldGamificationSnapshot,
) {
  const app = new Hono<{ Variables: { userId: string } }>();

  app.use('*', async (c, next) => {
    c.header('Cache-Control', 'private, no-store');
    await next();
  });

  app.get('/', async (c) => {
    const ownerId = c.get('userId');
    const regionCode = c.req.query('region') ?? null;

    try {
      return c.json(await reader({ ownerId, regionCode }));
    } catch {
      return c.json({
        error: 'World gamification read is temporarily unavailable.',
        code: 'WORLD_GAMIFICATION_READ_UNAVAILABLE',
      }, 503);
    }
  });

  return app;
}

export function configuredWorldGamificationRead(
  env: NodeJS.ProcessEnv = process.env,
  reader: WorldGamificationReader = readWorldGamificationSnapshot,
) {
  const mode = worldGamificationReadMode(env);
  if (mode === 'DISABLED') return null;
  if (mode === 'HOLD') {
    throw new Error(
      'World gamification read remains CONTROLLED_DRAFT and is not production-authorized.',
    );
  }
  return createWorldGamificationReadRoutes(reader);
}
