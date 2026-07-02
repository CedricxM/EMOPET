import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  CommentCreateSchema,
  CommunityRulesAcceptSchema,
  EventCreateSchema,
  PostCreateSchema,
  UgcReportCreateSchema,
  UserBlockCreateSchema,
} from '@emopet/shared';

import {
  acceptCommunityRules,
  canCreateCommunityContent,
  containsObjectionableContent,
  createUgcReport,
  createUserBlock,
} from '../services/feature-progress.js';
import { requireDogOwnership } from '../middleware/authorization.js';

const community = new Hono();

function getUserId(c: unknown): string {
  return String((c as { get: (key: string) => unknown }).get('userId') ?? 'demo-user');
}

function requireCommunityRules(c: { json: (value: unknown, status?: number) => Response }): Response | null {
  const userId = getUserId(c);
  if (canCreateCommunityContent(userId)) {
    return null;
  }

  return c.json(
    {
      error: 'Accept community rules before creating public community content.',
      cta: {
        type: 'accept_rules',
        label: 'Accepter les regles',
      },
    },
    403,
  );
}

// ── Communities ─────────────────────────────────────────────────

community.get('/', async (c) => {
  // TODO: list communities user belongs to
  return c.json({ communities: [] });
});

community.get('/:id', async (c) => {
  const id = c.req.param('id');
  return c.json({ id });
});

community.get('/:id/feed', async (c) => {
  const id = c.req.param('id');
  // TODO: paginated feed
  return c.json({ communityId: id, posts: [] });
});

community.post('/rules/accept', zValidator('json', CommunityRulesAcceptSchema), async (c) => {
  const body = c.req.valid('json');
  return c.json(acceptCommunityRules(getUserId(c), body), 201);
});

community.post('/reports', zValidator('json', UgcReportCreateSchema), async (c) => {
  const body = c.req.valid('json');
  return c.json(createUgcReport(getUserId(c), body), 201);
});

community.post('/blocks', zValidator('json', UserBlockCreateSchema), async (c) => {
  const body = c.req.valid('json');
  return c.json(createUserBlock(getUserId(c), body), 201);
});

// ── Posts ────────────────────────────────────────────────────────

community.post('/posts', zValidator('json', PostCreateSchema), async (c) => {
  const guard = requireCommunityRules(c);
  if (guard) {
    return guard;
  }
  const body = c.req.valid('json');
  if (containsObjectionableContent(body.content)) {
    return c.json({ error: 'Content rejected by community safety filter.' }, 422);
  }
  return c.json({ message: 'posted', communityId: body.communityId }, 201);
});

community.post('/comments', zValidator('json', CommentCreateSchema), async (c) => {
  const guard = requireCommunityRules(c);
  if (guard) {
    return guard;
  }
  const body = c.req.valid('json');
  if (containsObjectionableContent(body.content)) {
    return c.json({ error: 'Content rejected by community safety filter.' }, 422);
  }
  return c.json({ message: 'commented', postId: body.postId }, 201);
});

// ── Events ──────────────────────────────────────────────────────

community.get('/:id/events', async (c) => {
  const id = c.req.param('id');
  return c.json({ communityId: id, events: [] });
});

community.post('/events', zValidator('json', EventCreateSchema), async (c) => {
  const guard = requireCommunityRules(c);
  if (guard) {
    return guard;
  }
  const body = c.req.valid('json');
  if (containsObjectionableContent(`${body.title} ${body.description}`)) {
    return c.json({ error: 'Content rejected by community safety filter.' }, 422);
  }
  return c.json({ message: 'event_created', communityId: body.communityId }, 201);
});

// ── Copresence ──────────────────────────────────────────────────

community.get('/copresence/:dogId', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  // TODO: return copresence matches
  return c.json({ dogId, matches: [] });
});

export { community };
