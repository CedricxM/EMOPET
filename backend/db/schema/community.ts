import { pgTable, uuid, varchar, timestamp, real, integer, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const communities = pgTable('communities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 1000 }),
  type: varchar('type', { length: 20 }).notNull(), // neighborhood, breed, activity
  latitude: real('latitude'),
  longitude: real('longitude'),
  radiusM: integer('radius_m'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const communityMembers = pgTable('community_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  communityId: uuid('community_id').notNull().references(() => communities.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: varchar('role', { length: 20 }).notNull().default('member'), // member, moderator, referent
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
});

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  communityId: uuid('community_id').notNull().references(() => communities.id),
  authorId: uuid('author_id').notNull().references(() => users.id),
  type: varchar('type', { length: 20 }).notNull(),
  content: varchar('content', { length: 2000 }).notNull(),
  mediaUrls: jsonb('media_urls').default([]),
  sensorOverlay: jsonb('sensor_overlay'), // optional ELI context
  likeCount: integer('like_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => posts.id),
  authorId: uuid('author_id').notNull().references(() => users.id),
  content: varchar('content', { length: 1000 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const communityEvents = pgTable('community_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  communityId: uuid('community_id').notNull().references(() => communities.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  title: varchar('title', { length: 200 }).notNull(),
  description: varchar('description', { length: 2000 }),
  location: varchar('location', { length: 200 }).notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const copresenceEvents = pgTable('copresence_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  dogAId: uuid('dog_a_id').notNull(),
  dogBId: uuid('dog_b_id').notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  recurring: integer('recurring').default(1),
});
