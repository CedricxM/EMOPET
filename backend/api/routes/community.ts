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

import { requireDogOwnership } from '../middleware/authorization.js';

const community = new Hono();

const COMMUNITY_PERSISTENCE_CODE = 'COMMUNITY_PERSISTENCE_NOT_READY';

function getAuthenticatedUserId(c: unknown): string | null {
  const value = (c as { get: (key: string) => unknown }).get('userId');
  if (typeof value !== 'string') return null;
  const userId = value.trim();
  return userId.length > 0 ? userId : null;
}

function requireAuthenticatedUser(c: unknown): string | Response {
  const userId = getAuthenticatedUserId(c);
  if (userId) return userId;

  return (c as { json: (value: unknown, status?: number) => Response }).json(
    {
      error: 'Authentication required.',
      code: 'AUTHENTICATION_REQUIRED',
    },
    401,
  );
}

function persistenceUnavailable(
  c: unknown,
  operation: string,
): Response {
  return (c as { json: (value: unknown, status?: number) => Response }).json(
    {
      error: 'Community durable persistence is not available on the Product V1 backend authority.',
      code: COMMUNITY_PERSISTENCE_CODE,
      operation,
      retryable: false,
    },
    503,
  );
}

function requireIdentityOrResponse(c: unknown): { userId: string } | { response: Response } {
  const result = requireAuthenticatedUser(c);
  return typeof result === 'string' ? { userId: result } : { response: result };
}

// Community release authority is Hono + durable Product V1 persistence.
// Until that persistence exists, this router fails closed instead of returning
// placeholder empties, synthetic identities or success responses for data that
// cannot be read back durably.

// ── Communities ─────────────────────────────────────────────────

community.get('/', async (c) => {
  const identity = requireIdentityOrResponse(c);
  if ('response' in identity) return identity.response;
  return persistenceUnavailable(c, 'list_communities');
});

community.get('/:id', async (c) => {
  const identity = requireIdentityOrResponse(c);
  if ('response' in identity) return identity.response;
  return persistenceUnavailable(c, 'get_community');
});

community.get('/:id/feed', async (c) => {
  const identity = requireIdentityOrResponse(c);
  if ('response' in identity) return identity.response;
  return persistenceUnavailable(c, 'read_feed');
});

community.post('/rules/accept', zValidator('json', CommunityRulesAcceptSchema), async (c) => {
  const identity = requireIdentityOrResponse(c);
  if ('response' in identity) return identity.response;
  return persistenceUnavailable(c, 'accept_rules');
});

community.post('/reports', zValidator('json', UgcReportCreateSchema), async (c) => {
  const identity = requireIdentityOrResponse(c);
  if ('response' in identity) return identity.response;
  return persistenceUnavailable(c, 'create_report');
});

community.post('/blocks', zValidator('json', UserBlockCreateSchema), async (c) => {
  const identity = requireIdentityOrResponse(c);
  if ('response' in identity) return identity.response;
  return persistenceUnavailable(c, 'create_block');
});

// ── Posts ────────────────────────────────────────────────────────

community.post('/posts', zValidator('json', PostCreateSchema), async (c) => {
  const identity = requireIdentityOrResponse(c);
  if ('response' in identity) return identity.response;
  return persistenceUnavailable(c, 'create_post');
});

community.post('/comments', zValidator('json', CommentCreateSchema), async (c) => {
  const identity = requireIdentityOrResponse(c);
  if ('response' in identity) return identity.response;
  return persistenceUnavailable(c, 'create_comment');
});

// ── Events ──────────────────────────────────────────────────────

community.get('/:id/events', async (c) => {
  const identity = requireIdentityOrResponse(c);
  if ('response' in identity) return identity.response;
  return persistenceUnavailable(c, 'list_events');
});

community.post('/events', zValidator('json', EventCreateSchema), async (c) => {
  const identity = requireIdentityOrResponse(c);
  if ('response' in identity) return identity.response;
  return persistenceUnavailable(c, 'create_event');
});

// ── Copresence ──────────────────────────────────────────────────

community.get('/copresence/:dogId', async (c) => {
  const identity = requireIdentityOrResponse(c);
  if ('response' in identity) return identity.response;

  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  return persistenceUnavailable(c, 'read_copresence');
});

export { community, COMMUNITY_PERSISTENCE_CODE };
