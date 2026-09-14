import { PostCreateSchema } from '@emopet/shared';
import { comments, communities, communityEvents, communityRulesAcceptances, posts } from '../../db/schema/index.js';

// Membership is not authority for Care/ELI or precise location. These explicit
// SQL projections prevent legacy/private columns from entering route responses.
// Location permission/RSVP stages remain unimplemented under #55/#56.
export const COMMUNITY_LOCATION_DISCLOSURE = 'WITHHELD_PENDING_LOCATION_AUTHORITY' as const;

export const communityViewColumns = {
  id: communities.id,
  name: communities.name,
  description: communities.description,
  type: communities.type,
  createdBy: communities.createdBy,
  createdAt: communities.createdAt,
};

export const communityPostColumns = {
  id: posts.id,
  communityId: posts.communityId,
  authorId: posts.authorId,
  type: posts.type,
  content: posts.content,
  mediaUrls: posts.mediaUrls,
  createdAt: posts.createdAt,
};

export const communityCommentColumns = {
  id: comments.id,
  postId: comments.postId,
  authorId: comments.authorId,
  content: comments.content,
  createdAt: comments.createdAt,
};

export const communityEventColumns = {
  id: communityEvents.id,
  communityId: communityEvents.communityId,
  createdBy: communityEvents.createdBy,
  title: communityEvents.title,
  description: communityEvents.description,
  startsAt: communityEvents.startsAt,
  createdAt: communityEvents.createdAt,
};

export const communityRulesColumns = {
  userId: communityRulesAcceptances.userId,
  rulesVersion: communityRulesAcceptances.rulesVersion,
  acceptedAt: communityRulesAcceptances.acceptedAt,
};

const mediaUrlsSchema = PostCreateSchema.shape.mediaUrls.removeDefault().refine((values) => values.every((value) => {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password;
  } catch {
    return false;
  }
}), 'Media references must be HTTP(S) URLs without embedded credentials.');

// Keep the legacy shared prototype contract separate from this Hono boundary.
export const CommunityPostCreateSchema = PostCreateSchema.extend({
  mediaUrls: mediaUrlsSchema.default([]),
});

type SelectedPost = Pick<typeof posts.$inferSelect, keyof typeof communityPostColumns>;

export function presentCommunityPost(row: SelectedPost) {
  // JSONB is not a publication contract. Historical media values can contain
  // arbitrary objects, so do not pass them through merely because this field
  // is selected. Invalid metadata is explicitly withheld, never silently fixed
  // in storage or treated as proof that the post has no attachments.
  const media = mediaUrlsSchema.safeParse(row.mediaUrls);
  return {
    id: row.id,
    communityId: row.communityId,
    authorId: row.authorId,
    type: row.type,
    content: row.content,
    mediaUrls: media.success ? media.data : [],
    mediaStatus: media.success ? 'URL_REFERENCES_ONLY' as const : 'WITHHELD_INVALID_METADATA' as const,
    createdAt: row.createdAt,
  };
}
