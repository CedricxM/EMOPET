import { and, desc, eq, sql } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  CommentCreateSchema,
  CommunityRulesAcceptSchema,
  EventCreateSchema,
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
import {
  COMMUNITY_LOCATION_DISCLOSURE,
  CommunityPostCreateSchema,
  communityViewColumns,
  communityPostColumns,
  communityCommentColumns,
  communityEventColumns,
  communityRulesColumns,
  presentCommunityPost,
} from '../services/community-disclosure.js';
import {
  COMMUNITY_FEED_PAGE_SIZE,
  InvalidCommunityFeedCursor,
  decodeCommunityFeedCursor,
  encodeCommunityFeedCursor,
} from '../services/community-feed.js';

const community = new Hono<{ Variables: { userId: string } }>();

const COMMUNITY_PERSISTENCE_CODE = 'COMMUNITY_PERSISTENCE_NOT_READY' as const;
const COMMUNITY_DATABASE_UNAVAILABLE = 'COMMUNITY_DATABASE_UNAVAILABLE' as const;
const COMMUNITY_RULES_VERSION = 'community-rules-v1-candidate' as const;
type CommunityContext = Context<{ Variables: { userId: string } }>;
type CommunityTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

async function withCommunityTransaction(
  c: CommunityContext,
  operation: string,
  work: (tx: CommunityTransaction) => Promise<Response>,
): Promise<Response> {
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
      await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);
      return work(tx);
    }, { isolationLevel: 'read committed' });
  } catch {
    return databaseUnavailable(c, operation);
  }
}

async function requireCommunityMembership(
  tx: CommunityTransaction,
  c: CommunityContext,
  userId: string,
  communityId: string,
): Promise<true | Response> {
  // Keep the authority row(s) until the dependent read/write commits. SHARE
  // also blocks non-key updates; KEY SHARE would allow membership reassignment.
  const [membership] = await tx
    .select({ id: communityMembers.id })
    .from(communityMembers)
    .where(and(
      eq(communityMembers.communityId, communityId),
      eq(communityMembers.userId, userId),
    ))
    .orderBy(communityMembers.id)
    .for('share');

  if (!membership) {
    markPrivate(c);
    return c.json({ error: 'Community not found' }, 404);
  }
  return true;
}

async function requireCurrentRulesAcceptance(
  tx: CommunityTransaction,
  c: CommunityContext,
  userId: string,
): Promise<true | Response> {
  // Always lock membership before rules; recheck the version after any wait.
  const [acceptance] = await tx
    .select({ rulesVersion: communityRulesAcceptances.rulesVersion })
    .from(communityRulesAcceptances)
    .where(eq(communityRulesAcceptances.userId, userId))
    .limit(1)
    .for('share');

  if (!acceptance || acceptance.rulesVersion !== COMMUNITY_RULES_VERSION) {
    markPrivate(c);
    return c.json({
      error: 'Community rules acceptance required.',
      code: 'COMMUNITY_RULES_REQUIRED',
      rulesVersion: COMMUNITY_RULES_VERSION,
    }, 403);
  }
  return true;
}

// Router-level fail-closed identity boundary. This intentionally runs before
// per-route validators so direct or mis-mounted use cannot create a shared
// synthetic principal or treat validation as authentication.
community.use('*', async (c, next) => {
  markPrivate(c);
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
  return withCommunityTransaction(c, 'list_communities', async (tx) => {
    const rows = await tx
      .select({
        ...communityViewColumns,
        membershipRole: communityMembers.role,
        joinedAt: communityMembers.joinedAt,
      })
      .from(communityMembers)
      .innerJoin(communities, eq(communityMembers.communityId, communities.id))
      .where(eq(communityMembers.userId, userId))
      .orderBy(communities.name)
      .for('share', { of: communityMembers });

    markPrivate(c);
    return c.json({ communities: rows.map((row) => ({ ...row, locationDisclosure: COMMUNITY_LOCATION_DISCLOSURE })) });
  });
});

community.get('/:id', async (c) => {
  const userId = c.get('userId');
  const communityId = c.req.param('id');
  return withCommunityTransaction(c, 'get_community', async (tx) => {
    const membership = await requireCommunityMembership(tx, c, userId, communityId);
    if (membership !== true) return membership;

    const [row] = await tx
      .select(communityViewColumns)
      .from(communities)
      .where(eq(communities.id, communityId))
      .limit(1);

    if (!row) {
      markPrivate(c);
      return c.json({ error: 'Community not found' }, 404);
    }

    markPrivate(c);
    return c.json({ community: { ...row, locationDisclosure: COMMUNITY_LOCATION_DISCLOSURE } });
  });
});

community.get('/:id/feed', async (c) => {
  const userId = c.get('userId');
  const communityId = c.req.param('id');
  return withCommunityTransaction(c, 'read_feed', async (tx) => {
    const membership = await requireCommunityMembership(tx, c, userId, communityId);
    if (membership !== true) return membership;
    const rules = await requireCurrentRulesAcceptance(tx, c, userId);
    if (rules !== true) return rules;

    const scope = { userId, communityId };
    let before;
    try {
      before = decodeCommunityFeedCursor(c.req.queries('cursor'), scope);
    } catch (error) {
      if (!(error instanceof InvalidCommunityFeedCursor)) throw error;
      return c.json({ error: 'Invalid feed cursor.', code: 'INVALID_FEED_CURSOR' }, 400);
    }
    const conditions = [eq(posts.communityId, communityId)];
    if (before) {
      conditions.push(sql`(${posts.createdAt}, ${posts.id}) < (${before.createdAt}::timestamptz, ${before.id}::uuid)`);
    }
    const rows = await tx
      .select({
        ...communityPostColumns,
        // JS Date truncates PostgreSQL microseconds. Keep full precision for
        // the seek boundary, without exposing this internal field in posts.
        cursorCreatedAt: sql<string>`to_char(${posts.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
      })
      .from(posts)
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(COMMUNITY_FEED_PAGE_SIZE + 1);

    const hasMore = rows.length > COMMUNITY_FEED_PAGE_SIZE;
    const page = rows.slice(0, COMMUNITY_FEED_PAGE_SIZE);
    const last = page.at(-1);
    markPrivate(c);
    return c.json({
      communityId,
      posts: page.map(presentCommunityPost),
      pagination: {
        pageSize: COMMUNITY_FEED_PAGE_SIZE,
        hasMore,
        nextCursor: hasMore && last
          ? encodeCommunityFeedCursor({ createdAt: last.cursorCreatedAt, id: last.id }, scope)
          : null,
      },
    });
  });
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
  return withCommunityTransaction(c, 'accept_rules', async (tx) => {
    const [record] = await tx
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
      .returning(communityRulesColumns);

    markPrivate(c);
    return c.json({ acceptance: record }, 201);
  });
});

community.post('/reports', zValidator('json', UgcReportCreateSchema), async (c) => {
  return persistenceUnavailable(c, 'create_report');
});

community.post('/blocks', zValidator('json', UserBlockCreateSchema), async (c) => {
  return persistenceUnavailable(c, 'create_block');
});

// ── Posts ────────────────────────────────────────────────────────

community.post('/posts', zValidator('json', CommunityPostCreateSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');
  return withCommunityTransaction(c, 'create_post', async (tx) => {
    const membership = await requireCommunityMembership(tx, c, userId, body.communityId);
    if (membership !== true) return membership;
    const rules = await requireCurrentRulesAcceptance(tx, c, userId);
    if (rules !== true) return rules;

    const [created] = await tx
      .insert(posts)
      .values({
        communityId: body.communityId,
        authorId: userId,
        type: body.type,
        content: body.content,
        mediaUrls: body.mediaUrls,
      })
      .returning(communityPostColumns);

    if (!created) return databaseUnavailable(c, 'create_post');
    markPrivate(c);
    return c.json({ post: presentCommunityPost(created) }, 201);
  });
});

community.post('/comments', zValidator('json', CommentCreateSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  return withCommunityTransaction(c, 'create_comment', async (tx) => {
    const [parentPost] = await tx
      .select({ id: posts.id, communityId: posts.communityId })
      .from(posts)
      .where(eq(posts.id, body.postId))
      .limit(1);

    if (!parentPost) {
      markPrivate(c);
      return c.json({ error: 'Post not found' }, 404);
    }

    const membership = await requireCommunityMembership(tx, c, userId, parentPost.communityId);
    if (membership !== true) return membership;
    const rules = await requireCurrentRulesAcceptance(tx, c, userId);
    if (rules !== true) return rules;

    // The first lookup only discovers the authority scope. After membership
    // and rules are locked, recheck and retain the parent-to-community binding.
    // A move/deletion that wins this lock must not authorize a stale comment.
    const [lockedParent] = await tx
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.id, parentPost.id), eq(posts.communityId, parentPost.communityId)))
      .limit(1)
      .for('share');
    if (!lockedParent) return c.json({ error: 'Post not found' }, 404);

    const [created] = await tx
      .insert(comments)
      .values({
        postId: parentPost.id,
        authorId: userId,
        content: body.content,
      })
      .returning(communityCommentColumns);

    if (!created) return databaseUnavailable(c, 'create_comment');
    markPrivate(c);
    return c.json({ comment: created }, 201);
  });
});

// ── Events ──────────────────────────────────────────────────────

community.get('/:id/events', async (c) => {
  const userId = c.get('userId');
  const communityId = c.req.param('id');
  return withCommunityTransaction(c, 'list_events', async (tx) => {
    const membership = await requireCommunityMembership(tx, c, userId, communityId);
    if (membership !== true) return membership;
    const rules = await requireCurrentRulesAcceptance(tx, c, userId);
    if (rules !== true) return rules;

    const rows = await tx
      .select(communityEventColumns)
      .from(communityEvents)
      .where(eq(communityEvents.communityId, communityId))
      .orderBy(desc(communityEvents.startsAt));

    markPrivate(c);
    return c.json({ communityId, events: rows.map((row) => ({ ...row, locationDisclosure: COMMUNITY_LOCATION_DISCLOSURE })) });
  });
});

community.post('/events', zValidator('json', EventCreateSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');
  return withCommunityTransaction(c, 'create_event', async (tx) => {
    const membership = await requireCommunityMembership(tx, c, userId, body.communityId);
    if (membership !== true) return membership;
    const rules = await requireCurrentRulesAcceptance(tx, c, userId);
    if (rules !== true) return rules;

    const [created] = await tx
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
      .returning(communityEventColumns);

    if (!created) return databaseUnavailable(c, 'create_event');
    markPrivate(c);
    return c.json({ event: { ...created, locationDisclosure: COMMUNITY_LOCATION_DISCLOSURE } }, 201);
  });
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
