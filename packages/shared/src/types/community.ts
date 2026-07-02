/** Official AI tone profile identifiers. V1 keeps only Breiz-derived names. */
export const AI_TONE_PROFILES = [
  'BREIZ',
  'BREIZIG',
  'BREIZENN',
  'BREIZOU',
  'BREIZAT',
] as const;

export type AIToneProfile = (typeof AI_TONE_PROFILES)[number];
export type LegacyToneProfile = 'breton' | 'parisien' | 'marseillais' | 'default';
export type ToneProfile = AIToneProfile;

export interface Community {
  id: string;
  name: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  memberCount: number;
  referentUserId?: string;
  /** Explicit community default. Never inferred automatically from GPS. */
  aiToneProfileDefault?: AIToneProfile;
  /** Legacy alias kept for compatibility with older call sites. */
  aiToneProfile: AIToneProfile;
  createdAt: Date;
}

export type PostType = 'moment' | 'insight' | 'challenge' | 'event' | 'help_request';
export type AuthorType = 'user' | 'ai' | 'referent';

export interface SensorOverlay {
  activityKm?: number;
  eliStatus?: string;
  matMinutes?: number;
}

export interface Post {
  id: string;
  communityId: string;
  authorId: string;
  authorType: AuthorType;
  type: PostType;
  content: string;
  mediaUrls: string[];
  sensorOverlay?: SensorOverlay;
  likesCount: number;
  commentsCount: number;
  isPinned: boolean;
  createdAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: Date;
}

export interface CommunityEvent {
  id: string;
  communityId: string;
  organizerId: string;
  title: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  startsAt: Date;
  participantCount: number;
  createdAt: Date;
}

export type EventParticipation = 'going' | 'maybe' | 'not_going';
