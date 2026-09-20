import { isCanonicalUserId } from './auth-security.js';

// Candidate batch size from #54; not a validated UX optimum or recommender.
export const COMMUNITY_FEED_PAGE_SIZE = 6;

export interface CommunityFeedScope {
  userId: string;
  communityId: string;
}

export interface CommunityFeedPosition {
  createdAt: string;
  id: string;
}

export class InvalidCommunityFeedCursor extends Error {
  constructor() {
    super('Invalid Community feed cursor');
  }
}

function isResourceId(value: unknown): value is string {
  // Resource UUIDs follow PostgreSQL storage, not the narrower access-JWT
  // subject version policy. Do not strand historical/non-v4 resource rows.
  return typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
}

function validCursorTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(value)) return false;
  const date = new Date(value);
  // Validate the calendar without rounding/truncating the cursor's microseconds.
  return Number.isFinite(date.getTime()) && date.toISOString() === `${value.slice(0, 23)}Z`;
}

export function decodeCommunityFeedCursor(
  values: string[] | undefined,
  scope: CommunityFeedScope,
): CommunityFeedPosition | null {
  if (values === undefined) return null;
  const raw = values[0];
  if (values.length !== 1 || !raw || raw.length > 768 || !/^[A-Za-z0-9_-]+$/.test(raw)) {
    throw new InvalidCommunityFeedCursor();
  }
  try {
    const bytes = Buffer.from(raw, 'base64url');
    if (bytes.toString('base64url') !== raw) throw new InvalidCommunityFeedCursor();
    const value: unknown = JSON.parse(bytes.toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InvalidCommunityFeedCursor();
    const data = value as Record<string, unknown>;
    if (Object.keys(data).sort().join(',') !== 'communityId,createdAt,id,userId,v'
      || data['v'] !== 1
      || !isCanonicalUserId(data['userId']) || data['userId'].toLowerCase() !== scope.userId.toLowerCase()
      || !isResourceId(data['communityId']) || data['communityId'].toLowerCase() !== scope.communityId.toLowerCase()
      || !isResourceId(data['id']) || !validCursorTimestamp(data['createdAt'])) {
      throw new InvalidCommunityFeedCursor();
    }
    return { createdAt: data['createdAt'], id: data['id'].toLowerCase() };
  } catch {
    throw new InvalidCommunityFeedCursor();
  }
}

export function encodeCommunityFeedCursor(position: CommunityFeedPosition, scope: CommunityFeedScope): string {
  // Navigation state, not a signed permission/capability. Every continuation
  // must independently acquire current membership and rules authority.
  return Buffer.from(JSON.stringify({
    v: 1,
    userId: scope.userId.toLowerCase(),
    communityId: scope.communityId.toLowerCase(),
    createdAt: position.createdAt,
    id: position.id,
  })).toString('base64url');
}
