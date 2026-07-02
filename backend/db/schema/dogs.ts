import { pgTable, uuid, varchar, timestamp, real, date, integer, jsonb, text } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { breedCanonical } from './datasets.js';

export const dogs = pgTable('dogs', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  name: varchar('name', { length: 50 }).notNull(),
  breed: varchar('breed', { length: 100 }).notNull(),
  breedFciNumber: integer('breed_fci_number'),
  birthDate: date('birth_date').notNull(),
  sex: varchar('sex', { length: 10 }).notNull(), // male, female
  weight: real('weight').notNull(),
  furClass: varchar('fur_class', { length: 5 }).notNull(), // FC1-FC4
  photoUrl: varchar('photo_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  dogId: uuid('dog_id').notNull().references(() => dogs.id),
  type: varchar('type', { length: 5 }).notNull(), // MAT, TAG
  macAddress: varchar('mac_address', { length: 17 }).notNull().unique(),
  firmwareVersion: varchar('firmware_version', { length: 20 }),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const healthEntries = pgTable('health_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  dogId: uuid('dog_id').notNull().references(() => dogs.id),
  type: varchar('type', { length: 20 }).notNull(),
  date: date('date').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  details: varchar('details', { length: 2000 }),
  value: real('value'),
  nextDueDate: date('next_due_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const breedSensorProfiles = pgTable('breed_sensor_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  fciNumber: integer('fci_number').unique(),
  breedName: varchar('breed_name', { length: 100 }).notNull(),
  furClass: varchar('fur_class', { length: 5 }),
  sizeClass: varchar('size_class', { length: 10 }),
  isBrachycephalic: integer('is_brachycephalic').default(0),
  modPvdf: real('mod_pvdf'),
  modLoadCell: real('mod_load_cell'),
  modImu: real('mod_imu'),
  modMic: real('mod_mic'),
  modPiezo: real('mod_piezo'),
  modGps: real('mod_gps'),
  rhoA: real('rho_a'),
  deltaL: real('delta_l'),
  rrRestMin: real('rr_rest_min'),
  rrRestMax: real('rr_rest_max'),
  warmupDays: integer('warmup_days'),
  vboId: text('vbo_id').references(() => breedCanonical.vboId),
  profileJson: jsonb('profile_json'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
