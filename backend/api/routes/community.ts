import { and, desc, eq } from 'drizzle-orm';
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

import { db } from '../../db/index.js';
import {
  comments,
  communities,
  communityEvents,
  communityMembers,
  communityRulesAcceptances,
  posts,
} from '../../db/schema/index.js';
import { requireDogOwnership } from '../middleware/authorization.js';

const community = new Hono<{ Variables: { userId: string } }>();

const COMMUNITY_PERSISTENCE_CODE = 'COMMUNITY_PERSISTENCE_NOT_READY' as const;
const COMMUNITY_DATABASE_UNAVAILABLE = 'COMMUNITY_DATABASE_UNAVAILABLE' as const;
const COMMUNITY_RULES_VERSION = 'community-rules-v1-candidate' as const;

function markPrivate(c: { header: (name: string, value: string) => void }): void {
  c.header('Cache-Control', 'private, no-store');
}

function persistenceUnavailable(
  c: {
    header: (name: string, value: string) => void;
    json: (value: unknown, status?: number) => Response;
  },
  operation: string,
): Response {
  markPrivate(c);
  return c.json({
    error: 'Community durable persistence is not available for this Product V1 operation.',
    code: COMMUNITY_PERSISTENCE_CODE,
    operation,
    retryable: false,
  }, 503);
}

function databaseUnavailable(
  c: {
    header: (name: string, value: string) => void;
    json: (value: unknown, status?: number) => Response;
  },
  operation: string,
): Response {
  markPrivate(c);
  return c.json({
    error: 'Community authoritative database operation unavailable.',
    code: COMMUNITY_DATABASE_UNAVAILABLE,
    operation,
    retryable: true,
  }, 503);
}

async function requireCommunityMembership(
  c: {
    header: (name: string, value: string) => void;
    json: (value: unknown, status?: number) => Response;
  },
  userId: string,
  communityId: string,
): Promise<true | Response> {
  try {
    const [membership] = await db
      .select({ id: communityMembers.id })
      .from(communityMembers)
      .where(and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.userId, userId),
      ))
      .limit(1);

    if (!membership) {
      markPrivate(c);
      return c.json({ error: 'Community not found' }, 404);
    }
    return true;
  } catch {
    return databaseUnavailable(c, 'check_membership');
  }
}

async function requireCurrentRulesAcceptance(
  c: {
    header: (name: string, value: string) => void;
    json: (value: unknown, status?: number) => Response;
  },
  userId: string,
): Promise<true | Response> {
  try {
    const [acceptance] = await db
      .select({ rulesVersion: communityRulesAcceptances.rulesVersion })
      .from(communityRulesAcceptances)
      .where(eq(communityRulesAcceptances.userId, userId))
      .limit(1);

    if (!acceptance || acceptance.rulesVersion !== COMMUNITY_RULES_VERSION) {
      markPrivate(c);
      return c.json({
        error: 'Community rules acceptance required.',
        code: 'COMMUNITY_RULES_REQUIRED',
        rulesVersion: COMMUNITY_RULES_VERSION,
      }, 403);
    }
    return true;
  } catch {
    return databaseUnavailable(c, 'check_rules_acceptance');
  }
}

// Router-level fail-closed identity boundary. This intentionally runs before
// per-route validators so direct or mis-mounted use cannot create a shared
// synthetic principal or treat validation as authentication.
community.use('*', async (c, next) => {
  const value = c.get('userId');
  if (typeof value !== 'string' || value.trim().length === 0) {
    markPrivate(c);
    return c.json({
      error: 'Authentication required.',
      code: 'AUTHENTICATION_REQUIRED',
    }, 401);
  }

  await next();
});

// Community release authority is Hono + PostgreSQL. This slice deliberately
// exposes only membership-scoped communities, versioned rules acceptance and
// durable posts/comments/events. Moderation reports, blocks and copresence
// remain fail-closed until their own lifecycle/authority is implemented.

// ── Communities ─────────────────────────────────────────────────

community.get('/', async (c) => {
  const userId = c.get('userId');
  try {
    const rows = await db
      .select({
        id: communities.id,
        name: communities.name,
        description: communities.description,
        type: communities.type,
        latitude: communities.latitude,
        longitude: communities.longitude,
        radiusM: communities.radiusM,
        createdBy: communities.createdBy,
        createdAt: communities.createdAt,
        membershipRole: communityMembers.role,
        joinedAt: communityMembers.joinedAt,
      })
      .from(communityMembers)
      .innerJoin(communities, eq(communityMembers.communityId, communities.id))
      .where(eq(communityMembers.userId, userId))
      .orderBy(communities.name);

    markPrivate(c);
    return c.json({ communities: rows });
  } catch {
    return databaseUnavailable(c, 'list_communities');
  }
});

community.get('/:id', async (c) => {
  const userId = c.get('userId');
  const communityId = c.req.param('id');
  const membership = await requireCommunityMembership(c, userId, communityId);
  if (membership !== true) return membership;

  try {
    const [row] = await db
      .select()
      .from(communities)
      .where(eq(communities.id, communityId))
      .limit(1);

    if (!row) {
      markPrivate(c);
      return c.json({ error: 'Community not found' }, 404);
    }

    markPrivate(c);
    return c.json({ community: row });
  } catch {
    return databaseUnavailable(c, 'get_community');
  }
});

community.get('/:id/feed', async (c) => {
  const userId = c.get('userId');
  const communityId = c.req.param('id');
  const membership = await requireCommunityMembership(c, userId, communityId);
  if (membership !== true) return membership;
  const rules = await requireCurrentRulesAcceptance(c, userId);
  if (rules !== true) return rules;

  try {
    const rows = await db
      .select()
      .from(posts)
      .where(eq(posts.communityId, communityId))
      .orderBy(desc(posts.createdAt));

    markPrivate(c);
    return c.json({ communityId, posts: rows });
  } catch {
    return databaseUnavailable(c, 'read_feed');
  }
});

community.post('/rules/accept', zValidator('json', CommunityRulesAcceptSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');
  if (!body.accepted) {
    markPrivate(c);
    return c.json({
      error: 'Community rules must be accepted explicitly.',
      code: 'COMMUNITY_RULES_ACCEPTANCE_REQUIRED',
    }, 400);
  }

  const acceptedAt = new Date();
  try {
    const [record] = await db
      .insert(communityRulesAcceptances)
      .values({
        userId,
        rulesVersion: COMMUNITY_RULES_VERSION,
        acceptedAt,
      })
      .onConflictDoUpdate({
        target: communityRulesAcceptances.userId,
        set: {
          rulesVersion: COMMUNITY_RULES_VERSION,
          acceptedAt,
        },
      })
      .returning();

    markPrivate(c);
    return c.json({ acceptance: record }, 201);
  } catch {
    return databaseUnavailable(c, 'accept_rules');
  }
});

community.post('/reports', zValidator('json', UgcReportCreateSchema), async (c) => {
  return persistenceUnavailable(c, 'create_report');
});

community.post('/blocks', zValidator('json', UserBlockCreateSchema), async (c) => {
  return persistenceUnavailable(c, 'create_block');
});

// ── Posts ────────────────────────────────────────────────────────

community.post('/posts', zValidator('json', PostCreateSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');
  const membership = await requireCommunityMembership(c, userId, body.communityId);
  if (membership !== true) return membership;
  const rules = await requireCurrentRulesAcceptance(c, userId);
  if (rules !== true) return rules;

  try {
    const [created] = await db
      .insert(posts)
      .values({
        communityId: body.communityId,
        authorId: userId,
        type: body.type,
        content: body.content,
        mediaUrls: body.mediaUrls,
      })
      .returning();

    if (!created) return databaseUnavailable(c, 'create_post');
    markPrivate(c);
    return c.json({ post: created }, 201);
  } catch {
    return databaseUnavailable(c, 'create_post');
  }
});

community.post('/comments', zValidator('json', CommentCreateSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  try {
    const [parentPost] = await db
      .select({ id: posts.id, communityId: posts.communityId })
      .from(posts)
      .where(eq(posts.id, body.postId))
      .limit(1);

    if (!parentPost) {
      markPrivate(c);
      return c.json({ error: 'Post not found' }, 404);
    }

    const membership = await requireCommunityMembership(c, userId, parentPost.communityId);
    if (membership !== true) return membership;
    const rules = await requireCurrentRulesAcceptance(c, userId);
    if (rules !== true) return rules;

    const [created] = await db
      .insert(comments)
      .values({
        postId: parentPost.id,
        authorId: userId,
        content: body.content,
      })
      .returning();

    if (!created) return databaseUnavailable(c, 'create_comment');
    markPrivate(c);
    return c.json({ comment: created }, 201);
  } catch {
    return databaseUnavailable(c, 'create_comment');
  }
});

// ── Events ──────────────────────────────────────────────────────

community.get('/:id/events', async (c) => {
  const userId = c.get('userId');
  const communityId = c.req.param('id');
  const membership = await requireCommunityMembership(c, userId, communityId);
  if (membership !== true) return membership;
  const rules = await requireCurrentRulesAcceptance(c, userId);
  if (rules !== true) return rules;

  try {
    const rows = await db
      .select()
      .from(communityEvents)
      .where(eq(communityEvents.communityId, communityId))
      .orderBy(desc(communityEvents.startsAt));

    markPrivate(c);
    return c.json({ communityId, events: rows });
  } catch {
    return databaseUnavailable(c, 'list_events');
  }
});

community.post('/events', zValidator('json', EventCreateSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');
  const membership = await requireCommunityMembership(c, userId, body.communityId);
  if (membership !== true) return membership;
  const rules = await requireCurrentRulesAcceptance(c, userId);
  if (rules !== true) return rules;

  try {
    const [created] = await db
      .insert(communityEvents)
      .values({
        communityId: body.communityId,
        createdBy: userId,
        title: body.title,
        description: body.description,
        location: body.location,
        latitude: body.latitude,
        longitude: body.longitude,
        startsAt: body.startsAt,
      })
      .returning();

    if (!created) return databaseUnavailable(c, 'create_event');
    markPrivate(c);
    return c.json({ event: created }, 201);
  } catch {
    return databaseUnavailable(c, 'create_event');
  }
});

// ── Copresence ──────────────────────────────────────────────────

community.get('/copresence/:dogId', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  return persistenceUnavailable(c, 'read_copresence');
});

export {
  community,
  COMMUNITY_PERSISTENCE_CODE,
  COMMUNITY_DATABASE_UNAVAILABLE,
  COMMUNITY_RULES_VERSION,
};
